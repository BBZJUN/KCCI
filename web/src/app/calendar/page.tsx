"use client";

import Link from "next/link";
import MonthCalendar from "@/components/MonthCalendar";
import { clearAll, resetDemo, updateItem, useCalendar } from "@/lib/store";

export default function CalendarPage() {
  const { items, today } = useCalendar();
  // 프리렌더 시점(빈 상태)에는 날짜를 만들지 않는다 — Next 16은 프리렌더 중 new Date()를 오류로 본다
  const base = today ?? (items.length > 0 ? new Date().toISOString().slice(0, 10) : "");

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">잡도리</p>
          <h1 className="text-3xl font-bold">내 취준 캘린더</h1>
        </div>
        <nav className="ml-auto flex gap-2 text-sm">
          <Link href="/" className="rounded-lg bg-navy px-3 py-2 font-semibold text-white">+ 공고 담기</Link>
          <button onClick={resetDemo} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold">시연 데이터 불러오기</button>
          {items.length > 0 && <button onClick={clearAll} className="rounded-lg px-3 py-2 text-muted">비우기</button>}
        </nav>
      </div>
      {today && (
        <p className="mt-2 text-xs text-muted">
          시연 기준일 {today} · 기업명은 예시이며 공고·일정은 모두 가상입니다.
        </p>
      )}

      <div className="mt-5">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <p className="font-semibold">아직 담은 공고가 없어요.</p>
            <p className="mt-1 text-sm text-muted">공고를 담거나 시연 데이터를 불러와 보세요.</p>
          </div>
        ) : (
          <MonthCalendar
            key={base}
            items={items}
            today={base}
            onConfirm={(id) => updateItem(id, { confidence: "high", status: "confirmed" })}
            onCancel={(id) => updateItem(id, { status: "cancelled" })}
          />
        )}
      </div>
    </main>
  );
}
