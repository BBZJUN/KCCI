import type { CalendarItem } from "./calendar";
import { shortName } from "./calendar";
import type { NoticeReading } from "./schemas";

/** 안내 판독 결과를 캘린더에 반영할 '제안' (사용자가 승인해야 적용) */
export type NoticeChange =
  | { type: "confirm"; itemId: string; before: CalendarItem; after: CalendarItem }
  | { type: "add"; after: CalendarItem }
  | { type: "cancel"; itemId: string; before: CalendarItem };

export type NoticePlan = { groupId: string | null; company: string; changes: NoticeChange[]; note: string };

const norm = (s: string) => s.replace(/\s|전형|·/g, "").toLowerCase();

function sameCompany(a: string | null, b: string): boolean {
  if (!a) return false;
  const x = norm(a), y = norm(b);
  return x.includes(y) || y.includes(x) || norm(shortName(a)) === norm(shortName(b));
}

/** 단계 이름 비교: '1차 면접' ↔ '토스 1차면접' */
function stageScore(item: CalendarItem, stageName: string): number {
  const label = norm(item.label.replace(shortName(item.company ?? ""), ""));
  const s = norm(stageName);
  if (label === s) return 3;
  if (label.includes(s) || s.includes(label)) return 2;
  const keys = ["면접", "코딩", "역검", "gsat", "skct", "필기", "발표"];
  return keys.some((k) => label.includes(k) && s.includes(k)) && (label.match(/\d차/)?.[0] ?? "") === (s.match(/\d차/)?.[0] ?? "") ? 1 : 0;
}

export function planNoticeChanges(items: CalendarItem[], reading: NoticeReading, today: string, evidence: string): NoticePlan {
  const mine = items.filter((it) => it.category === "application" && it.status !== "cancelled" && sameCompany(it.company, reading.company));
  const groupId = mine[0]?.groupId ?? null;
  const company = mine[0]?.company ?? reading.company;

  if (reading.result === "fail") {
    const changes: NoticeChange[] = mine
      .filter((it) => it.status !== "done" && it.end >= today)
      .map((it) => ({ type: "cancel" as const, itemId: it.id, before: it }));
    return { groupId, company, changes, note: changes.length ? "불합격 안내예요. 이후 일정을 정리할까요?" : "정리할 이후 일정이 없어요." };
  }

  const next = reading.next_stage;
  if (!next || !next.date) {
    return { groupId, company, changes: [], note: next ? "다음 전형 날짜가 안내에 없어 예상 일정을 유지해요." : "반영할 일정 변경이 없어요." };
  }

  const candidates = mine
    .filter((it) => it.status !== "done")
    .map((it) => ({ it, score: stageScore(it, next.stage_name) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || (a.it.confidence === "high" ? 1 : 0) - (b.it.confidence === "high" ? 1 : 0));
  const target = candidates[0]?.it;
  const after: CalendarItem = {
    id: target?.id ?? `${groupId ?? "notice"}:${next.stage_type}:${next.date}`,
    groupId: groupId ?? `notice-${norm(reading.company)}`,
    label: `${shortName(company)} ${next.stage_name.replace(/\s/g, "")}`,
    company,
    color: target?.color ?? mine[0]?.color ?? "#3D5A80",
    category: "application",
    start: next.date,
    end: next.date,
    time: next.time,
    confidence: "high",
    evidence,
    status: "confirmed",
  };
  if (target) return { groupId, company, changes: [{ type: "confirm", itemId: target.id, before: target, after }], note: "예상 일정을 확정 일정으로 바꿀까요?" };
  return { groupId, company, changes: [{ type: "add", after }], note: "캘린더에 없던 전형이에요. 새 일정으로 추가할까요?" };
}

/** 변경 제안을 일정 목록에 적용한 결과 (저장은 하지 않음 — 승인 전 미리보기·충돌 확인용) */
export function applyChangesTo(items: CalendarItem[], changes: NoticeChange[]): CalendarItem[] {
  let out = items;
  for (const c of changes) {
    if (c.type === "confirm") out = out.map((i) => (i.id === c.itemId ? c.after : i));
    else if (c.type === "add") out = [...out.filter((i) => i.id !== c.after.id), c.after];
    else out = out.map((i) => (i.id === c.itemId ? { ...i, status: "cancelled" as const } : i));
  }
  return out;
}
