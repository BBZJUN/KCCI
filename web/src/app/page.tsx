"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PlannedStage, PostingExtraction } from "@/lib/schemas";
import { estimateSchedule } from "@/lib/agent/estimateSchedule";
import { applicationToItems, COMPANY_COLORS } from "@/lib/calendar";
import { SAMPLE_EXTRACTION } from "@/lib/demo";
import { addItems, setDraft, useCalendar } from "@/lib/store";

const SAMPLE = `[신한은행] 2026 하반기 신입행원 채용 (디지털/ICT) — 시연용 가상 공고
접수기간: 11.20(금)~12.2(수) 17:00
AI역량검사: 12.7~12.8 (온라인)
서류전형 발표: 12월 중순 예정
1차 면접: 면접 일정은 추후 개별 안내
최종 합격자 발표: 1월 중`;

const LINE: Record<PlannedStage["confidence"], string> = {
  high: "border-solid",
  mid: "border-dashed",
  low: "border-dotted",
};
const LABEL: Record<PlannedStage["confidence"], string> = { high: "확정", mid: "범위", low: "추정" };

export default function Home() {
  const router = useRouter();
  const { items, draft } = useCalendar();
  const [textInput, setText] = useState<string | null>(null);
  const text = textInput ?? draft?.text ?? SAMPLE;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultState, setResult] = useState<{ extraction: PostingExtraction; plan: PlannedStage[] } | null>(null);
  // 추천에서 수락한 공고는 공유 캐시(posting_cache)에 이미 분석된 결과를 바로 보여준다
  const draftResult = useMemo(
    () => (draft ? { extraction: draft.extraction, plan: estimateSchedule(draft.extraction.stages, draft.text) } : null),
    [draft],
  );
  const result = resultState ?? draftResult;
  const fromCache = !resultState && !!draftResult;

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/postings/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function preview() {
    setError(null);
    setResult({ extraction: SAMPLE_EXTRACTION, plan: estimateSchedule(SAMPLE_EXTRACTION.stages, SAMPLE) });
  }

  function addToCalendar() {
    if (!result) return;
    const groups = new Set(items.map((i) => i.groupId));
    const app = {
      id: `app-${Date.now()}`,
      company: result.extraction.company,
      title: result.extraction.title,
      color: fromCache && draft ? draft.color : COMPANY_COLORS[groups.size % COMPANY_COLORS.length],
      stages: result.plan,
    };
    addItems(applicationToItems(app));
    setDraft(null);
    router.push("/calendar");
  }

  const datedCount = result?.plan.filter((s) => s.start).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-center">
        <p className="text-sm font-semibold text-accent">잡도리 · 프로토타입</p>
        <Link href="/recommend" className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">추천 공고</Link>
        <Link href="/calendar" className="ml-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">내 캘린더 →</Link>
      </div>
      <h1 className="mt-1 text-3xl font-bold">전형 일정 확인 · 원문 근거</h1>
      <p className="mt-2 text-muted">공고 원문을 붙여 넣으면 에이전트가 전형 단계를 추출하고, 미정 일정은 신뢰도별 선으로 추정합니다.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-dashed border-slate-300 p-4">
          <h2 className="font-semibold">공고 원문</h2>
          <textarea className="mt-3 h-64 w-full rounded-lg border border-slate-200 p-3 text-sm" value={text} onChange={(e) => setText(e.target.value)} />
          <button onClick={run} disabled={loading} className="mt-3 w-full rounded-lg bg-accent py-2.5 font-semibold text-white disabled:opacity-60">
            {loading ? "추출 중…" : "수락하고 전형 일정 만들기"}
          </button>
          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
              <button onClick={preview} className="ml-2 underline">예시 결과로 화면 보기</button>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-dashed border-slate-300 p-4">
          <h2 className="font-semibold">{result ? `${result.extraction.company} · ${result.extraction.title}` : "추출 결과"}</h2>
          {fromCache && (
            <p className="mt-1 text-xs font-semibold text-teal-700">
              {draft?.source === "extension" ? "확장에서 가져온 공고 · 확인 후 캘린더에 추가하세요" : "추천에서 수락한 공고 · 공유 캐시의 분석 결과를 불러왔어요 (AI 재호출 없음)"}
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {result?.plan.map((s, i) => (
              <li key={i} className={`border-l-4 border-teal-600 pl-3 ${LINE[s.confidence]}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{s.stage_name}</span>
                  <span className="rounded-full bg-panel px-2 py-0.5 text-xs font-semibold text-head">{LABEL[s.confidence]}</span>
                </div>
                <div className="text-sm">
                  {s.start ? (s.end && s.end !== s.start ? `${s.start} ~ ${s.end}` : s.start) : "날짜 미정"}
                  {s.time ? ` ${s.time}` : ""}
                  {s.basis === "rule" && " (기본 간격 추정)"}
                </div>
                <div className="text-xs italic text-muted">
                  근거 “{s.evidence || "없음"}”{s.evidence_missing && <span className="ml-1 not-italic font-semibold text-red-600">· 근거 확인 필요</span>}
                </div>
              </li>
            ))}
            {!result && <li className="text-sm text-muted">왼쪽에서 공고를 넣고 버튼을 누르세요.</li>}
          </ul>
          {result && (
            <div className="mt-4 flex gap-2">
              <button onClick={addToCalendar} disabled={datedCount === 0} className="flex-1 rounded-lg bg-accent py-2.5 font-semibold text-white disabled:opacity-60">
                {datedCount}개 일정 캘린더에 추가
              </button>
              <button onClick={() => { setResult(null); setDraft(null); setText(null); }} className="rounded-lg border border-slate-300 px-4 font-semibold">다시</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
