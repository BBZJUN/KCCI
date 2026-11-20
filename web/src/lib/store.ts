"use client";

import { useSyncExternalStore } from "react";
import type { CalendarItem } from "./calendar";
import { DEMO_ITEMS, DEMO_TODAY } from "./demo";

/**
 * 임시 저장소 (브라우저 localStorage).
 * TODO(P0): Supabase 키가 준비되면 applications/stages/personal_events 테이블로 교체.
 * 인터페이스(useCalendar, addItems, updateItem, resetDemo)는 그대로 두고 구현만 바꾼다.
 */
type State = { items: CalendarItem[]; today: string | null };

const KEY = "jobdori:calendar:v1";
const EMPTY: State = { items: [], today: null };
const listeners = new Set<() => void>();
let cache: { raw: string | null; state: State } = { raw: null, state: EMPTY };

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
    state = raw ? (JSON.parse(raw) as State) : EMPTY;
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

export function resetDemo() {
  write({ items: DEMO_ITEMS, today: DEMO_TODAY });
}

export function clearAll() {
  write(EMPTY);
}
