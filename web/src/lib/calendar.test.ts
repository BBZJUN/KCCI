import { describe, expect, it } from "vitest";
import { applicationToItems, conflictDates, currentStageIds, findConflicts, itemsOn, monthGrid } from "./calendar";
import type { CalendarItem } from "./calendar";
import { DEMO_ITEMS as SEED_ITEMS, DEMO_SHINHAN_ITEMS, DEMO_TODAY, SAMPLE_EXTRACTION } from "./demo";
import { estimateSchedule } from "./agent/estimateSchedule";

describe("monthGrid", () => {
  it("2026년 12월은 화요일 시작, 일요일부터 5주(35칸)", () => {
    const g = monthGrid(2026, 12);
    expect(g).toHaveLength(35);
    expect(g[0].date).toBe("2026-11-29");
    expect(g[2]).toEqual({ date: "2026-12-01", inMonth: true });
    expect(g[34].date).toBe("2027-01-02");
  });
});

describe("시연 데이터 (소개서 05와 일치)", () => {
  it("12/17 현대차 면접(확정) ↔ 신한 면접(추정) 충돌이 감지된다", () => {
    const c = findConflicts(DEMO_ITEMS);
    const dec17 = c.find((x) => x.overlapStart === "2026-12-17");
    expect(dec17?.severity).toBe("soft");
    expect(conflictDates(c).has("2026-12-17")).toBe(true);
  });
  it("기준일 12/7에는 신한 AI역검이 현재 전형", () => {
    expect(currentStageIds(DEMO_ITEMS, DEMO_TODAY).has("s2")).toBe(true);
  });
  it("기간 일정(AI역검 12/7~8)은 양일 모두 표시된다", () => {
    expect(itemsOn(DEMO_ITEMS, "2026-12-08").map((i) => i.id)).toContain("s2");
  });
  it("정리(cancelled)한 일정은 충돌과 표시에서 빠진다", () => {
    const items = DEMO_ITEMS.map((i) => (i.id === "s4" ? { ...i, status: "cancelled" as const } : i));
    expect(findConflicts(items).some((c) => c.overlapStart === "2026-12-17")).toBe(false);
    expect(itemsOn(items, "2026-12-17").map((i) => i.id)).not.toContain("s4");
  });
});

describe("applicationToItems", () => {
  it("추출 결과를 캘린더 아이템으로 바꾸고, 날짜 없는 단계는 제외", () => {
    const plan = estimateSchedule(SAMPLE_EXTRACTION.stages, SAMPLE_EXTRACTION.stages.map((s) => s.evidence).join("\n"));
    const items = applicationToItems({ id: "a1", company: "신한은행", title: "t", color: "#2A9D8F", stages: plan });
    expect(items).toHaveLength(4); // 1차면접은 규칙 추정으로 날짜가 생김
    expect(items[3].confidence).toBe("low");
    expect(items[0].label).toBe("신한 서류 마감");
  });
});

import { itemsToStageRows, rowsToItems } from "./remote";

describe("Supabase 행 변환", () => {
  it("CalendarItem → stages 행 → CalendarItem 왕복 시 날짜·신뢰도·근거가 유지된다", () => {
    const items: CalendarItem[] = [
      { id: "a", groupId: "g", label: "신한 AI역검", company: "신한은행", color: "#2A9D8F", category: "application", start: "2026-12-07", end: "2026-12-08", confidence: "high", evidence: "AI역량검사: 12.7~12.8", status: "planned" },
      { id: "b", groupId: "g", label: "신한 1차 면접", company: "신한은행", color: "#2A9D8F", category: "application", start: "2026-12-25", end: "2026-12-30", confidence: "low", evidence: "추후 안내", status: "planned" },
    ];
    const rows = itemsToStageRows(items).map((r, i) => ({ ...r, id: `s${i}` }));
    expect(rows.map((r) => [r.kind, r.basis])).toEqual([["fixed", "posting"], ["tbd", "rule"]]);
    const back = rowsToItems([{ id: "g", company: "신한은행", title: "t", color: "#2A9D8F", stages: rows }], [], () => "신한");
    expect(back.map((b) => [b.label, b.start, b.end, b.confidence, b.evidence])).toEqual(items.map((i) => [i.label, i.start, i.end, i.confidence, i.evidence]));
  });
});

import { decodeImport, encodeImport } from "./importPayload";

// 첫 화면에서 신한 공고를 담은 뒤의 캘린더
const DEMO_ITEMS = [...SEED_ITEMS, ...DEMO_SHINHAN_ITEMS];

describe("확장 → /import 페이로드", () => {
  it("한글 원문과 추출 결과가 왕복 후 그대로 남는다", () => {
    const p = { text: "신한은행 2026 하반기 신입 — 접수기간: 11.20~12.2", extraction: SAMPLE_EXTRACTION, sourceUrl: "https://example.com/p/1", hash: "abc" };
    expect(decodeImport("#" + encodeImport(p))).toEqual(p);
  });
  it("깨진 값은 null", () => {
    expect(decodeImport("#not-base64!!")).toBeNull();
    expect(decodeImport("#" + btoa("{}"))).toBeNull();
  });
});

import { chipsOn } from "./calendar";

describe("긴 추정 구간 칩", () => {
  it("사흘 넘는 범위는 시작일·일요일에만 그리고, 짧은 범위·확정은 매일 그린다", () => {
    const base = { groupId: "g", company: "가상", color: "#000", category: "application" as const, evidence: "", status: "planned" as const };
    const items: CalendarItem[] = [
      { ...base, id: "r", label: "서류발표", start: "2026-12-11", end: "2026-12-20", confidence: "mid" },
      { ...base, id: "f", label: "AI역검", start: "2026-12-07", end: "2026-12-08", confidence: "high" },
    ];
    const days = (id: string) => ["2026-12-07", "2026-12-08", "2026-12-11", "2026-12-12", "2026-12-13", "2026-12-14"].filter((d) => chipsOn(items, d, "2026-11-29").some((i) => i.id === id));
    expect(days("r")).toEqual(["2026-12-11", "2026-12-13"]);
    expect(days("f")).toEqual(["2026-12-07", "2026-12-08"]);
  });
});

import { toICS } from "./ics";

describe("캘린더 파일 내보내기", () => {
  it("종일·시각 일정, 추정 표시, 취소 제외", () => {
    const base = { groupId: "g", company: "가상", color: "#000", category: "application" as const, evidence: "면접: 12월 18일, 오후 2시", status: "confirmed" as const };
    const ics = toICS([
      { ...base, id: "a", label: "토스 1차면접", start: "2026-12-18", end: "2026-12-18", time: "14:00", confidence: "high" },
      { ...base, id: "b", label: "신한 서류발표", start: "2026-12-11", end: "2026-12-20", confidence: "mid", status: "planned" },
      { ...base, id: "c", label: "취소된 일정", start: "2026-12-01", end: "2026-12-01", confidence: "high", status: "cancelled" },
    ]);
    expect(ics).toContain("DTSTART;TZID=Asia/Seoul:20261218T140000");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261211\r\nDTEND;VALUE=DATE:20261221");
    expect(ics).toContain("SUMMARY:[범위] 신한 서류발표");
    expect(ics).toContain("근거: 면접: 12월 18일\\, 오후 2시");
    expect(ics).not.toContain("취소된 일정");
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
