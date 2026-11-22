"use client";

import { useState } from "react";
import Link from "next/link";
import type { NoticeReading } from "@/lib/schemas";
import { CONFIDENCE_LABEL, type CalendarItem } from "@/lib/calendar";
import type { NoticePlan } from "@/lib/notice";
import type { AgentResult, Step } from "@/lib/agent/noticeAgent";
import { SAMPLE_NOTICES } from "@/lib/demo";
import { applyNoticeChanges, useCalendar } from "@/lib/store";
import { maskPII } from "@/lib/agent/pii";

const RESULT_LABEL: Record<NoticeReading["result"], [string, string]> = {
  pass: ["합격", "bg-teal-600"],
  fail: ["불합격", "bg-slate-500"],
  schedule_only: ["일정 안내", "bg-head"],
  unknown: ["판단 불가", "bg-amber-500"],
};

const PLANNED: Pick<Step, "tool" | "label">[] = [
  { tool: "read_notice", label: "안내 판독" },
  { tool: "plan_changes", label: "캘린더 변경안" },
  { tool: "detect_conflict", label: "반영 후 충돌 확인" },
  { tool: "suggest_adjustment", label: "조정 문구 작성" },
  { tool: "await_approval", label: "사용자 승인" },
];

const SAMPLE_CAPTURE = { label: "캡처: SK하이닉스 면접 문자", src: "/samples/notice-sms.png" };

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
      {it.time ? ` ${it.time}` : !solid ? " · 시간 미정" : ""}
    </span>
  );
}

/** 큰 사진은 브라우저에서 줄여서 보낸다 (긴 변 1600px, JPEG). 작은 이미지는 그대로. */
async function toDataUrl(file: Blob): Promise<string> {
  const raw = await new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(r.error);
    r.readAsDataURL(file);
  });
  if (file.size < 1_000_000) return raw;
  const img = await new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = raw;
  });
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function StepRow({ s, pending }: { s: Pick<Step, "tool" | "label"> & Partial<Step>; pending?: boolean }) {
  const icon = pending ? "…" : s.status === "done" ? "✓" : s.status === "waiting" ? "⏸" : s.status === "skipped" ? "–" : "!";
  const tone = pending
    ? "bg-slate-200 text-slate-500 animate-pulse"
    : s.status === "done"
      ? "bg-teal-600 text-white"
      : s.status === "waiting"
        ? "bg-accent text-white"
        : s.status === "failed"
          ? "bg-red-500 text-white"
          : "bg-slate-300 text-white";
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tone}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <b>{s.label}</b> <code className="ml-1 text-[11px] text-muted">{s.tool}()</code>
          {s.by && <span className={`ml-2 rounded px-1.5 py-px text-[10px] font-bold ${s.by === "AI" ? "bg-accent/15 text-accent" : s.by === "예비" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{s.by}</span>}
          {!!s.ms && <span className="ml-1 text-[11px] text-muted">{s.ms < 100 ? "즉시" : `${(s.ms / 1000).toFixed(1)}초`}</span>}
        </p>
        {s.summary && <p className="truncate text-xs text-muted">{s.summary}</p>}
      </div>
    </li>
  );
}

export default function NoticesPage() {
  const { items, today } = useCalendar();
  const [tab, setTab] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [failedTrace, setFailedTrace] = useState<Step[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  function reset() {
    setResult(null);
    setFailedTrace(null);
    setError(null);
    setApplied(false);
    setCopied(null);
  }

  async function run() {
    setLoading(true);
    reset();
    try {
      const res = await fetch("/api/agent/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tab === "text" ? text : undefined, image: tab === "image" ? image : undefined, items, today: today ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFailedTrace(data.trace?.length ? data.trace : null);
        throw new Error(data.error);
      }
      setResult(data as AgentResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCapture(blob: Blob) {
    reset();
    setTab("image");
    try {
      setImage(await toDataUrl(blob));
    } catch {
      setError("이미지를 열지 못했어요");
    }
  }

  const plan: NoticePlan | null = result?.plan ?? null;
  const reading = result?.reading ?? null;
  const ready = tab === "text" ? text.trim().length >= 10 : !!image;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">잡도리 · 안내 반영 에이전트</p>
          <h1 className="text-3xl font-bold">안내 메일·문자 반영</h1>
          <p className="mt-1 text-muted">안내 글이나 캡처를 넘기면 에이전트가 판독 → 캘린더 변경안 → 충돌 확인 → 조정 문구까지 준비해요. 반영은 승인할 때만 돼요.</p>
        </div>
        <Link href="/calendar" className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">내 캘린더 →</Link>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-dashed border-slate-300 p-4">
          <div className="flex gap-1 rounded-lg bg-panel p-1 text-sm font-semibold">
            {(["text", "image"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); reset(); }} className={`flex-1 rounded-md py-1.5 ${tab === t ? "bg-white shadow-sm" : "text-muted"}`}>
                {t === "text" ? "글 붙여넣기" : "캡처 올리기"}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="text-muted">예시:</span>
            {SAMPLE_NOTICES.map((s) => (
              <button key={s.label} onClick={() => { setTab("text"); setText(s.text); reset(); }} className="rounded-full bg-panel px-2.5 py-1 font-semibold text-head">{s.label}</button>
            ))}
            <button onClick={async () => loadCapture(await (await fetch(SAMPLE_CAPTURE.src)).blob())} className="rounded-full bg-accent/10 px-2.5 py-1 font-semibold text-accent">{SAMPLE_CAPTURE.label}</button>
          </div>

          {tab === "text" ? (
            <>
              <textarea className="mt-3 h-56 w-full rounded-lg border border-slate-200 p-3 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="받은 안내 메일이나 문자를 붙여 넣으세요" />
              <p className="mt-1 text-xs text-muted">원문은 저장하지 않아요. AI에는 이름·연락처를 가린 내용만 보내요.</p>
              {text && <p className="mt-1 truncate text-xs text-muted">전송 미리보기: {maskPII(text).slice(0, 80)}…</p>}
            </>
          ) : (
            <>
              <label
                className="mt-3 flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-muted"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadCapture(f); }}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="올린 캡처" className="max-h-64 rounded-md shadow-sm" />
                ) : (
                  <>
                    <span className="text-2xl">📷</span>
                    <span>문자·메일 캡처를 끌어다 놓거나 눌러서 고르세요</span>
                  </>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadCapture(f); }} />
              </label>
              <p className="mt-1 text-xs text-muted">이미지는 저장하지 않아요. AI가 글자를 옮길 때 이름·연락처는 가려 적어요. 가능하면 개인정보는 가리고 올려 주세요.</p>
            </>
          )}

          <button onClick={run} disabled={loading || !ready} className="mt-3 w-full rounded-lg bg-navy py-2.5 font-semibold text-white disabled:opacity-60">
            {loading ? "에이전트가 처리하는 중…" : "에이전트에게 맡기기"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-dashed border-slate-300 p-4">
            <h2 className="font-semibold">에이전트 실행 기록</h2>
            {!loading && !result && !failedTrace && <p className="mt-2 text-sm text-muted">왼쪽에서 안내를 넘기면 도구 호출 과정이 여기에 남아요.</p>}
            <ul className="mt-3 space-y-2.5">
              {loading && (tab === "image" ? [{ tool: "transcribe_capture", label: "캡처 글자 읽기" }, ...PLANNED] : PLANNED).map((s) => <StepRow key={s.tool} s={s} pending />)}
              {(result?.trace ?? failedTrace ?? []).map((s) => <StepRow key={s.tool} s={s} />)}
            </ul>
          </div>

          {result && reading && plan && (
            <div className="space-y-4 rounded-xl border border-dashed border-slate-300 p-4">
              {result.transcript && (
                <details className="rounded-md bg-panel p-2 text-xs">
                  <summary className="cursor-pointer font-semibold">캡처에서 읽은 글 (이름·연락처 가림)</summary>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-muted">{result.transcript}</pre>
                </details>
              )}
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
                근거 “{reading.evidence}”{result.evidence_missing && <span className="ml-1 font-semibold not-italic text-red-600">· 근거 확인 필요</span>}
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
              </div>

              {result.conflicts.map(({ conflict, advice }, i) => {
                const target = advice.target_id === conflict.a.id ? conflict.a : conflict.b;
                return (
                  <div key={i} className={`rounded-lg border p-3 text-sm ${conflict.severity === "hard" ? "border-red-400 bg-red-50" : "border-amber-400 bg-amber-50"}`}>
                    <p>
                      <b className={conflict.severity === "hard" ? "text-red-600" : "text-amber-700"}>반영하면 겹쳐요</b> {Number(conflict.overlapStart.slice(5, 7))}/{Number(conflict.overlapStart.slice(8))} {conflict.a.title} ↔ {conflict.b.title}
                    </p>
                    <p className="mt-1 text-xs"><b>조정 대상: {target.title}</b> <span className="text-muted">· {advice.reason}</span></p>
                    <textarea readOnly value={advice.message} rows={4} className="mt-1.5 w-full resize-none rounded border border-slate-200 bg-white p-1.5 text-xs leading-5" />
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <button onClick={async () => { try { await navigator.clipboard.writeText(advice.message); setCopied(i); } catch { /* 직접 선택해 복사 */ } }} className="rounded-md bg-navy px-2 py-1 font-semibold text-white">
                        {copied === i ? "복사됨" : "문구 복사"}
                      </button>
                      <span className="text-muted">{advice.source === "ai" ? "AI 제안 문구" : "기본 문구"} · 보내기는 직접 해주세요</span>
                    </div>
                  </div>
                );
              })}

              {plan.changes.length > 0 && !applied && (
                <div className="flex gap-2">
                  <button onClick={() => { applyNoticeChanges(plan.changes); setApplied(true); }} className="flex-1 rounded-lg bg-accent py-2.5 font-semibold text-white">
                    {reading.result === "fail" ? "승인하고 이후 일정 정리" : "승인하고 캘린더에 반영"}
                  </button>
                  <button onClick={reset} className="rounded-lg border border-slate-300 px-4 font-semibold">무시</button>
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
