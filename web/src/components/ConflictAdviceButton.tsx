"use client";

import { useState } from "react";
import type { Conflict } from "@/lib/agent/detectConflict";

type Advice = { target_id: string; reason: string; message: string; source: "ai" | "template" };

/** 충돌 1건 → 조정 문구 제안. 문구만 보여주고, 실제 발송·일정 변경은 사용자가 직접 한다. */
export default function ConflictAdviceButton({ conflict }: { conflict: Conflict }) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const target = advice ? (advice.target_id === conflict.a.id ? conflict.a : conflict.b) : null;

  async function ask() {
    setLoading(true);
    try {
      const res = await fetch("/api/conflicts/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: conflict.a, b: conflict.b, overlapStart: conflict.overlapStart }),
      });
      if (res.ok) setAdvice((await res.json()) as Advice);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!advice) return;
    try {
      await navigator.clipboard.writeText(advice.message);
      setCopied(true);
    } catch {
      /* 클립보드 권한이 없으면 직접 선택해서 복사 */
    }
  }

  if (!advice)
    return (
      <button onClick={ask} disabled={loading} className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-head disabled:opacity-50">
        {loading ? "문구 만드는 중…" : "조정 문구 제안"}
      </button>
    );

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-white p-2 text-xs">
      <p>
        <b>조정 대상: {target?.title}</b> <span className="text-muted">· {advice.reason}</span>
      </p>
      <textarea readOnly value={advice.message} rows={5} className="mt-1.5 w-full resize-none rounded border border-slate-200 p-1.5 leading-5" />
      <div className="mt-1 flex items-center gap-2">
        <button onClick={copy} className="rounded-md bg-navy px-2 py-1 font-semibold text-white">{copied ? "복사됨" : "문구 복사"}</button>
        <span className="text-muted">{advice.source === "ai" ? "AI 제안 문구" : "기본 문구"} · 보내기와 일정 변경은 직접 해주세요</span>
      </div>
    </div>
  );
}
