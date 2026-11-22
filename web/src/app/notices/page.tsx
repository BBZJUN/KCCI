"use client";

import { useState } from "react";
import Link from "next/link";
import type { NoticeReading } from "@/lib/schemas";
import { CONFIDENCE_LABEL, type CalendarItem } from "@/lib/calendar";
import { planNoticeChanges, type NoticePlan } from "@/lib/notice";
import { SAMPLE_NOTICES } from "@/lib/demo";
import { applyNoticeChanges, useCalendar } from "@/lib/store";
import { maskPII } from "@/lib/agent/pii";

const RESULT_LABEL: Record<NoticeReading["result"], [string, string]> = {
  pass: ["합격", "bg-teal-600"],
  fail: ["불합격", "bg-slate-500"],
  schedule_only: ["일정 안내", "bg-head"],
  unknown: ["판단 불가", "bg-amber-500"],
};

function Chip({ it }: { it: CalendarItem }) {
  const solid = it.confidence === "high";
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold"
      style={{
        background: solid ? it.color : "#fff",
        color: solid ? "#fff" : it.color,
        border: `1.5px ${it.confidence === "low" ? "dotted" : solid ? "solid" : "dashed"} ${it.color}`,
      }}
    >
      {!solid && `${CONFIDENCE_LABEL[it.confidence]} `}
      {it.label} {Number(it.start.slice(5, 7))}/{Number(it.start.slice(8))}
      {it.end !== it.start && `~${Number(it.end.slice(8))}`}
      {it.time && ` ${it.time}`}
    </span>
  );
}

export default function NoticesPage() {
  const { items, today } = useCalendar();
  const [text, setText] = useState("");
  const [reading, setReading] = useState<NoticeReading | null>(null);
  const [evidenceMissing, setEvidenceMissing] = useState(false);
  const [plan, setPlan] = useState<NoticePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  function show(r: NoticeReading, missing: boolean) {
    setReading(r);
    setEvidenceMissing(missing);
    setApplied(false);
    setPlan(planNoticeChanges(items, r, today ?? new Date().toISOString().slice(0, 10), r.evidence));
  }

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notices/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, today: today ?? undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      show(data.reading, data.evidence_missing);
      setMode(data.mode ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function loadSample(i: number) {
    const s = SAMPLE_NOTICES[i];
    setText(s.text);
    setError(null);
    show(s.reading, false);
    setMode(null);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">잡도리</p>
          <h1 className="text-3xl font-bold">안내 메일 반영</h1>
          <p className="mt-1 text-muted">결과·일정 안내를 붙여 넣으면 다음 전형을 찾아 캘린더 변경을 제안해요. 반영은 직접 승인할 때만 돼요.</p>
        </div>
        <Link href="/calendar" className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">내 캘린더 →</Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-dashed border-slate-300 p-4">
          <h2 className="font-semibold">메일·문자 원문</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="text-muted">예시:</span>
            {SAMPLE_NOTICES.map((s, i) => (
              <button key={s.label} onClick={() => loadSample(i)} className="rounded-full bg-panel px-2.5 py-1 font-semibold text-head">{s.label}</button>
            ))}
          </div>
          <textarea className="mt-3 h-56 w-full rounded-lg border border-slate-200 p-3 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="받은 안내 메일이나 문자를 붙여 넣으세요" />
          <p className="mt-1 text-xs text-muted">원문은 저장하지 않아요. AI에는 이름·연락처를 가린 내용만 보내요.</p>
          {text && <p className="mt-1 truncate text-xs text-muted">전송 미리보기: {maskPII(text).slice(0, 80)}…</p>}
          <button onClick={run} disabled={loading || text.trim().length < 10} className="mt-3 w-full rounded-lg bg-navy py-2.5 font-semibold text-white disabled:opacity-60">
            {loading ? "판독 중…" : "AI로 판독하기"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error} · 위의 예시 버튼으로 흐름을 확인할 수 있어요.</p>}
        </section>

        <section className="rounded-xl border border-dashed border-slate-300 p-4">
          <h2 className="font-semibold">AI 판독 결과</h2>
          {mode === "rule" && <p className="mt-1 text-xs font-semibold text-accent">AI 연결이 안 돼 규칙 기반 예비 판독이에요. 날짜와 근거를 꼭 확인해 주세요.</p>}
          {!reading && <p className="mt-3 text-sm text-muted">왼쪽에서 안내를 판독하면 여기에 제안이 나타나요.</p>}
          {reading && plan && (
            <div className="mt-3 space-y-4">
              <div className="flex items-center gap-2">
                <b className="text-lg">{reading.company}</b>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${RESULT_LABEL[reading.result][1]}`}>{RESULT_LABEL[reading.result][0]}</span>
                <span className="text-sm text-muted">{reading.about_stage}</span>
              </div>
              {reading.next_stage && (
                <p className="text-sm">
                  다음 전형: <b>{reading.next_stage.stage_name}</b> {reading.next_stage.date ?? "날짜 미정"} {reading.next_stage.time ?? ""} {reading.next_stage.mode ? `· ${reading.next_stage.mode}` : ""}
                </p>
              )}
              <p className="rounded-md bg-panel p-2 text-xs italic text-muted">
                근거 “{reading.evidence}”{evidenceMissing && <span className="ml-1 not-italic font-semibold text-red-600">· 근거 확인 필요</span>}
              </p>

              <div>
                <p className="text-sm font-semibold text-accent">{plan.note}</p>
                <ul className="mt-2 space-y-2">
                  {plan.changes.map((c, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      {c.type === "confirm" && (<><Chip it={c.before} /><span className="font-bold text-accent">→</span><Chip it={c.after} /></>)}
                      {c.type === "add" && (<><span className="text-xs font-semibold text-muted">새 일정</span><Chip it={c.after} /></>)}
                      {c.type === "cancel" && (<><span className="line-through opacity-60"><Chip it={c.before} /></span><span className="text-xs text-muted">정리</span></>)}
                    </li>
                  ))}
                </ul>
                {items.length === 0 && <p className="mt-2 text-xs text-muted">캘린더가 비어 있어요. 캘린더에서 &lsquo;시연 처음 상태로&rsquo;를 누르면 비교가 보여요.</p>}
              </div>

              {plan.changes.length > 0 && !applied && (
                <div className="flex gap-2">
                  <button onClick={() => { applyNoticeChanges(plan.changes); setApplied(true); }} className="flex-1 rounded-lg bg-accent py-2.5 font-semibold text-white">
                    {reading.result === "fail" ? "이후 일정 정리하기" : "확정 일정으로 반영"}
                  </button>
                  <button onClick={() => { setReading(null); setPlan(null); }} className="rounded-lg border border-slate-300 px-4 font-semibold">무시</button>
                </div>
              )}
              {applied && (
                <p className="rounded-lg bg-teal-50 p-3 text-sm font-semibold text-teal-700">
                  반영했어요. <Link href="/calendar" className="underline">캘린더에서 확인 →</Link>
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
