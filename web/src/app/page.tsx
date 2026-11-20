"use client";

import { useState } from "react";
import type { PlannedStage, PostingExtraction } from "@/lib/schemas";

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
  const [text, setText] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ extraction: PostingExtraction; plan: PlannedStage[] } | null>(null);

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

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-sm font-semibold text-accent">잡도리 · 프로토타입</p>
      <h1 className="mt-1 text-3xl font-bold">전형 일정 확인 · 원문 근거</h1>
      <p className="mt-2 text-muted">공고 원문을 붙여 넣으면 에이전트가 전형 단계를 추출하고, 미정 일정은 신뢰도별 선으로 추정합니다.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-dashed border-slate-300 p-4">
          <h2 className="font-semibold">공고 원문</h2>
          <textarea className="mt-3 h-64 w-full rounded-lg border border-slate-200 p-3 text-sm" value={text} onChange={(e) => setText(e.target.value)} />
          <button onClick={run} disabled={loading} className="mt-3 w-full rounded-lg bg-accent py-2.5 font-semibold text-white disabled:opacity-60">
            {loading ? "추출 중…" : "수락하고 전형 일정 만들기"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>

        <section className="rounded-xl border border-dashed border-slate-300 p-4">
          <h2 className="font-semibold">{result ? `${result.extraction.company} · ${result.extraction.title}` : "추출 결과"}</h2>
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
        </section>
      </div>
    </main>
  );
}
