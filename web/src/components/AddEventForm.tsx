"use client";

import { useState } from "react";
import { PERSONAL_COLORS, type CalendarItem } from "@/lib/calendar";

type Category = "personal" | "certificate";

/**
 * 개인·자격증 일정 직접 추가. 하루를 통째로 쓰는 일정으로 보고 충돌 감지 대상이 된다.
 * TODO: Q-net 시험일정 API(공공데이터포털 키 필요)로 자격증 일정 자동 채우기
 */
export default function AddEventForm({ defaultDate, onAdd }: { defaultDate: string; onAdd: (item: CalendarItem) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("personal");
  const [start, setStart] = useState(defaultDate);
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim();
    const last = end || start;
    if (!name) return setError("일정 이름을 입력해 주세요");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return setError("날짜를 골라 주세요");
    if (last < start) return setError("끝나는 날이 시작일보다 빨라요");
    const id = `u-${crypto.randomUUID()}`;
    onAdd({
      id,
      groupId: id,
      label: name,
      company: null,
      color: PERSONAL_COLORS[category],
      category,
      start,
      end: last,
      confidence: "high",
      evidence: "직접 입력",
      status: "confirmed",
    });
    setTitle("");
    setEnd("");
    setError(null);
    setOpen(false);
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">
        + 개인·자격증 일정
      </button>
    );

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-panel p-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">종류</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
          <option value="personal">개인 일정</option>
          <option value="certificate">자격증 시험</option>
        </select>
      </label>
      <label className="flex min-w-48 flex-1 flex-col gap-1">
        <span className="text-xs text-muted">이름</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={category === "certificate" ? "예: 정보처리기사 실기 시험" : "예: 아르바이트, 가족 모임"}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">시작일</span>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">종료일 (하루면 비워두기)</span>
        <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5" />
      </label>
      <button type="submit" className="rounded-lg bg-navy px-3 py-2 font-semibold text-white">추가</button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-muted">취소</button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
