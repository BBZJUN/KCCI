import type { CalendarEvent, Confidence, PlannedStage } from "./schemas";
import { detectConflicts, type Conflict } from "./agent/detectConflict";

/** 캘린더에 그리는 일정 1개 */
export type CalendarItem = {
  id: string;
  groupId: string; // 지원 건 id (개인 일정이면 자기 id)
  label: string; // 칩에 쓰는 짧은 이름. 예: "신한 AI역검"
  company: string | null;
  color: string; // #RRGGBB
  category: CalendarEvent["category"];
  start: string; // YYYY-MM-DD
  end: string;
  time?: string | null; // HH:MM (안내로 확정된 경우)
  confidence: Confidence;
  evidence: string;
  status: "planned" | "confirmed" | "done" | "cancelled";
};

export type Application = {
  id: string;
  company: string;
  title: string;
  color: string;
  stages: PlannedStage[];
};

export const COMPANY_COLORS = ["#2A9D8F", "#7B61FF", "#E09F3E", "#1E63B5", "#D6457A", "#16A34A", "#0EA5E9"];

/** 회사명 → 칩용 약칭 */
export function shortName(company: string): string {
  const map: Record<string, string> = { 신한은행: "신한", 토스뱅크: "토스", 현대자동차: "현대차", 삼성전자: "삼성", SK하이닉스: "SK하이닉스" };
  return map[company] ?? company.replace(/(주식회사|\(주\)|㈜)/g, "").trim().slice(0, 6);
}

/** 지원 건(추출·추정 결과) → 캘린더 아이템. 날짜 미정 단계는 캘린더에 올리지 않는다. */
export function applicationToItems(app: Application): CalendarItem[] {
  return app.stages
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.start)
    .map(({ s, i }) => ({
      id: `${app.id}:${i}`,
      groupId: app.id,
      label: `${shortName(app.company)} ${s.stage_name}`,
      company: app.company,
      color: app.color,
      category: "application" as const,
      start: s.start!,
      end: s.end ?? s.start!,
      time: s.time,
      confidence: s.confidence,
      evidence: s.evidence,
      status: s.confidence === "high" ? ("confirmed" as const) : ("planned" as const),
    }));
}

/** 월간 그리드: 일요일 시작, 5~6주 */
export function monthGrid(year: number, month1: number): { date: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month1 - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const daysInMonth = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const weeks = Math.ceil((first.getUTCDay() + daysInMonth) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month1 - 1 };
  });
}

export function itemsOn(items: CalendarItem[], date: string): CalendarItem[] {
  const order: Record<Confidence, number> = { high: 0, mid: 1, low: 2 };
  return items
    .filter((it) => it.status !== "cancelled" && it.start <= date && date <= it.end)
    .sort((a, b) => order[a.confidence] - order[b.confidence] || a.label.localeCompare(b.label));
}

/** 지원 건마다 '현재 전형' = 오늘 이후로 끝나지 않은 첫 단계 */
export function currentStageIds(items: CalendarItem[], today: string): Set<string> {
  const byGroup = new Map<string, CalendarItem[]>();
  for (const it of items) if (it.category === "application" && it.status !== "cancelled") byGroup.set(it.groupId, [...(byGroup.get(it.groupId) ?? []), it]);
  const ids = new Set<string>();
  for (const list of byGroup.values()) {
    const cur = list.sort((a, b) => a.start.localeCompare(b.start)).find((it) => it.end >= today);
    if (cur && cur.start <= today) ids.add(cur.id);
  }
  return ids;
}

export function findConflicts(items: CalendarItem[]): Conflict[] {
  return detectConflicts(
    items
      .filter((it) => it.status !== "cancelled")
      .map((it) => ({ id: it.id, title: it.label, category: it.category, start: it.start, end: it.end, confidence: it.confidence })),
  );
}

/** 충돌이 걸린 날짜 집합 (배지 표시용) */
export function conflictDates(conflicts: Conflict[]): Set<string> {
  const out = new Set<string>();
  for (const c of conflicts) {
    for (let d = c.overlapStart; d <= c.overlapEnd; ) {
      out.add(d);
      const n = new Date(d + "T00:00:00Z");
      n.setUTCDate(n.getUTCDate() + 1);
      d = n.toISOString().slice(0, 10);
    }
  }
  return out;
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = { high: "확정", mid: "범위", low: "추정" };
