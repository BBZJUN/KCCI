"use client";

import { useSyncExternalStore } from "react";
import type { CalendarItem } from "./calendar";
import type { NoticeChange } from "./notice";
import type { PostingExtraction } from "./schemas";
import { DEFAULT_PROFILE, type Profile } from "./recommend";
import { DEMO_ITEMS, DEMO_TODAY } from "./demo";

/**
 * 임시 저장소 (브라우저 localStorage).
 * TODO(P0): Supabase 키가 준비되면 applications/stages/personal_events 테이블로 교체.
 * 인터페이스(useCalendar, addItems, updateItem, resetDemo)는 그대로 두고 구현만 바꾼다.
 */
/** draft: 추천에서 수락했거나 확장에서 가져온 공고 → 화면 ②에서 확인 후 캘린더에 추가 */
export type Draft = { postingId: string; text: string; extraction: PostingExtraction; color: string; source?: "recommend" | "extension"; sourceUrl?: string };
type State = { items: CalendarItem[]; today: string | null; profile: Profile; dismissed: string[]; draft: Draft | null };

const KEY = "jobdori:calendar:v2";
const EMPTY: State = { items: [], today: null, profile: DEFAULT_PROFILE, dismissed: [], draft: null };
/** 처음 방문하면 시연 인물(홍길동)의 12월 일정이 들어 있는 상태로 시작한다. '비우기' 하면 빈 캘린더. */
const SEED: State = { ...EMPTY, items: DEMO_ITEMS, today: DEMO_TODAY };
const listeners = new Set<() => void>();
// raw: undefined = 아직 안 읽음 (null = 저장된 값 없음 → SEED)
let cache: { raw: string | null | undefined; state: State } = { raw: undefined, state: EMPTY };

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cache.state;
  }
  if (raw === cache.raw) return cache.state;
  let state: State = EMPTY;
  try {
    state = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<State>) } : SEED;
  } catch {
    state = EMPTY;
  }
  cache = { raw, state };
  return state;
}

function write(next: State) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 저장 실패 시에도 화면은 유지 */
  }
  cache = { raw: JSON.stringify(next), state: next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCalendar(): State {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addItems(items: CalendarItem[]) {
  const cur = read();
  const ids = new Set(items.map((i) => i.id));
  write({ ...cur, items: [...cur.items.filter((i) => !ids.has(i.id)), ...items] });
}

export function updateItem(id: string, patch: Partial<CalendarItem>) {
  const cur = read();
  write({ ...cur, items: cur.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
}

/** 같은 공고를 다시 담으면 이전 일정을 새 결과로 바꾼다 (중복 방지) */
export function replaceGroup(groupId: string, items: CalendarItem[]) {
  const cur = read();
  write({ ...cur, items: [...cur.items.filter((i) => i.groupId !== groupId), ...items] });
}

export function removeItem(id: string) {
  const cur = read();
  write({ ...cur, items: cur.items.filter((i) => i.id !== id) });
}

/** 사용자가 승인한 안내 반영 제안을 한 번에 적용 */
export function applyNoticeChanges(changes: NoticeChange[]) {
  const cur = read();
  let items = cur.items;
  for (const c of changes) {
    if (c.type === "confirm") items = items.map((i) => (i.id === c.itemId ? c.after : i));
    else if (c.type === "add") items = [...items.filter((i) => i.id !== c.after.id), c.after];
    else items = items.map((i) => (i.id === c.itemId ? { ...i, status: "cancelled" } : i));
  }
  write({ ...cur, items });
}

export function resetDemo() {
  const cur = read();
  write({ ...EMPTY, profile: cur.profile, items: DEMO_ITEMS, today: DEMO_TODAY });
}

export function setProfile(profile: Profile) {
  write({ ...read(), profile });
}

export function dismissPosting(id: string) {
  const cur = read();
  write({ ...cur, dismissed: [...cur.dismissed, id] });
}

export function setDraft(draft: Draft | null) {
  write({ ...read(), draft });
}

export function clearAll() {
  write({ ...EMPTY, profile: read().profile });
}

/** 오늘 날짜 (클라이언트에서만). 서버 렌더·하이드레이션 중에는 "" → 하이드레이션 불일치와 Next 16 프리렌더 오류를 피한다 */
const noop = () => () => {};
export function useClientToday(): string {
  return useSyncExternalStore(noop, () => new Date().toISOString().slice(0, 10), () => "");
}
