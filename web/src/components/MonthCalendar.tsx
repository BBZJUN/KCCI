"use client";

import { useMemo, useState } from "react";
import {
  CONFIDENCE_LABEL,
  type CalendarItem,
  conflictDates,
  currentStageIds,
  findConflicts,
  chipsOn,
  isLongRange,
  monthGrid,
} from "@/lib/calendar";
import ConflictAdviceButton from "./ConflictAdviceButton";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHIPS = 3;

function chipStyle(it: CalendarItem, current: boolean): React.CSSProperties {
  const solid = it.confidence === "high";
  return {
    background: solid ? it.color : "#fff",
    color: solid ? "#fff" : it.color,
    border: `1.5px ${it.confidence === "low" ? "dotted" : solid ? "solid" : "dashed"} ${it.color}`,
    boxShadow: current ? "0 0 0 2px #1F2A44" : undefined,
    opacity: it.status === "done" ? 0.55 : 1,
  };
}

type Props = {
  items: CalendarItem[];
  today: string;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onRemove?: (id: string) => void;
};

export default function MonthCalendar({ items, today, onConfirm, onCancel, onRemove }: Props) {
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState<string | null>(null);

  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const conflicts = useMemo(() => findConflicts(items), [items]);
  const badDates = useMemo(() => conflictDates(conflicts), [conflicts]);
  const current = useMemo(() => currentStageIds(items, today), [items, today]);
  const monthPrefix = `${ym.y}-${String(ym.m).padStart(2, "0")}`;
  const monthConflicts = conflicts.filter((c) => c.overlapStart.startsWith(monthPrefix));
  const sel = items.find((i) => i.id === selected) ?? null;
  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of items) seen.set(it.company ?? (it.category === "certificate" ? "자격증" : "개인"), it.color);
    return [...seen.entries()];
  }, [items]);

  const move = (d: number) => setYm(({ y, m }) => (m + d < 1 ? { y: y - 1, m: 12 } : m + d > 12 ? { y: y + 1, m: 1 } : { y, m: m + d }));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <section className="rounded-xl border border-dashed border-slate-300 p-4">
        <header className="flex flex-wrap items-center gap-3">
          <button aria-label="이전 달" onClick={() => move(-1)} className="rounded-md px-2 py-1 hover:bg-panel">‹</button>
          <h2 className="text-xl font-bold">{ym.y}년 {ym.m}월</h2>
          <button aria-label="다음 달" onClick={() => move(1)} className="rounded-md px-2 py-1 hover:bg-panel">›</button>
          <ul className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {legend.map(([name, color]) => (
              <li key={name} className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                {name}
              </li>
            ))}
          </ul>
        </header>

        <div className="mt-3 grid grid-cols-7 text-center text-xs font-semibold text-muted">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={i === 0 ? "text-red-500" : ""}>{w}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 border-l border-t border-slate-200">
          {grid.map(({ date, inMonth }) => {
            const list = chipsOn(items, date, grid[0].date);
            const isToday = date === today;
            const sunday = new Date(date + "T00:00:00Z").getUTCDay() === 0;
            return (
              <div key={date} className={`relative min-h-24 border-b border-r border-slate-200 p-1 ${inMonth ? "bg-white" : "bg-slate-50"}`}>
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      isToday ? "bg-navy font-bold text-white" : !inMonth ? "text-slate-300" : sunday ? "text-red-500" : "text-slate-600"
                    }`}
                  >
                    {Number(date.slice(8))}
                  </span>
                  {badDates.has(date) && (
                    <span title="일정 충돌" className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">!</span>
                  )}
                </div>
                <ul className="mt-1 space-y-0.5">
                  {list.slice(0, MAX_CHIPS).map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => setSelected(it.id)}
                        style={chipStyle(it, current.has(it.id))}
                        className="w-full truncate rounded px-1 py-px text-left text-[10.5px] font-semibold leading-4"
                        title={`${it.label} · ${CONFIDENCE_LABEL[it.confidence]}`}
                      >
                        {it.confidence !== "high" && <span className="mr-0.5 font-normal">{it.confidence === "mid" ? "범위" : "추정"}</span>}
                        {it.label}
                        {isLongRange(it) && <span className="font-normal"> ~{Number(it.end.slice(5, 7))}/{Number(it.end.slice(8))}</span>}
                        {current.has(it.id) && " · 현재"}
                      </button>
                    </li>
                  ))}
                  {list.length > MAX_CHIPS && <li className="text-[10px] text-muted">+{list.length - MAX_CHIPS}개</li>}
                </ul>
              </div>
            );
          })}
        </div>

        {monthConflicts.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {monthConflicts.map((c) => (
              <li
                key={c.a.id + c.b.id}
                className={`rounded-lg border px-3 py-2 text-sm ${c.severity === "hard" ? "border-red-400 bg-red-50" : "border-amber-400 bg-amber-50"}`}
              >
                <b className={c.severity === "hard" ? "text-red-600" : "text-amber-700"}>일정 충돌</b>{" "}
                {Number(c.overlapStart.slice(5, 7))}/{Number(c.overlapStart.slice(8))} {c.a.title}({CONFIDENCE_LABEL[c.a.confidence]}) ↔ {c.b.title}({CONFIDENCE_LABEL[c.b.confidence]})
                <span className="ml-1 text-muted">
                  {c.severity === "hard" ? "· 두 일정 모두 확정이라 한쪽 조정이 필요해요" : "· 추정 일정이 확정되면 바로 조정 문의를 준비하세요"}
                </span>
                <ConflictAdviceButton conflict={c} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">실선 = 확정 · 점선 = 범위 추정 · 점점선 = 규칙 추정 · 테두리 강조 = 현재 진행 중인 전형</p>
      </section>

      <aside className="rounded-xl border border-dashed border-slate-300 p-4">
        <h3 className="font-semibold">일정 상세</h3>
        {!sel && <p className="mt-2 text-sm text-muted">캘린더의 일정을 누르면 원문 근거와 신뢰도를 볼 수 있어요.</p>}
        {sel && (
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: sel.color }} />
              <b>{sel.label}</b>
              <span className="ml-auto rounded-full bg-panel px-2 py-0.5 text-xs font-semibold text-head">{CONFIDENCE_LABEL[sel.confidence]}</span>
            </div>
            <p>{sel.start === sel.end ? sel.start : `${sel.start} ~ ${sel.end}`}</p>
            <p className="rounded-md bg-panel p-2 text-xs italic text-muted">근거 “{sel.evidence || "없음"}”</p>
            {sel.confidence !== "high" && sel.status !== "cancelled" && onConfirm && (
              <button onClick={() => onConfirm(sel.id)} className="w-full rounded-lg bg-accent py-2 font-semibold text-white">
                이 날짜로 확정 (실선으로 변경)
              </button>
            )}
            {sel.category === "application" && sel.status !== "cancelled" && sel.status !== "done" && onCancel && (
              <button onClick={() => onCancel(sel.id)} className="w-full rounded-lg border border-slate-300 py-2 font-semibold">
                이 일정 정리하기
              </button>
            )}
            {sel.category !== "application" && onRemove && (
              <button onClick={() => { onRemove(sel.id); setSelected(null); }} className="w-full rounded-lg border border-slate-300 py-2 font-semibold">
                이 일정 삭제
              </button>
            )}
            <p className="text-xs text-muted">AI는 제안만 하고, 확정·정리는 직접 누를 때만 반영돼요.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
