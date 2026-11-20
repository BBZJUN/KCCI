import type { CalendarEvent } from "../schemas";

export type Conflict = {
  a: CalendarEvent;
  b: CalendarEvent;
  /** hard: 둘 다 확정 일정 / soft: 하나 이상이 추정 일정 */
  severity: "hard" | "soft";
  overlapStart: string;
  overlapEnd: string;
};

const overlaps = (a: CalendarEvent, b: CalendarEvent) => a.start <= b.end && b.start <= a.end;

/**
 * 날짜 단위 겹침 감지 (코드로만 판단 — AI는 조정 문구 제안에만 사용).
 * 기간형 일정(예: AI역검 12/7~12/8, 서류 접수 기간)은 하루를 통째로 막지 않으므로
 * 면접·시험처럼 '하루를 점유하는 일정'끼리만 비교한다.
 */
export function detectConflicts(events: CalendarEvent[], occupying: (e: CalendarEvent) => boolean = defaultOccupying): Conflict[] {
  const list = events.filter(occupying).sort((x, y) => x.start.localeCompare(y.start));
  const out: Conflict[] = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (b.start > a.end) break;
      if (!overlaps(a, b)) continue;
      out.push({
        a, b,
        severity: a.confidence === "high" && b.confidence === "high" ? "hard" : "soft",
        overlapStart: a.start > b.start ? a.start : b.start,
        overlapEnd: a.end < b.end ? a.end : b.end,
      });
    }
  }
  return out;
}

const OCCUPYING = /면접|시험|GSAT|SKCT|코딩|필기|인적성|알바|아르바이트|모임|약속/;
export function defaultOccupying(e: CalendarEvent): boolean {
  if (e.category !== "application") return true;
  return OCCUPYING.test(e.title);
}
