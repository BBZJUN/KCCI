import { describe, expect, it } from "vitest";
import { applicationToItems, conflictDates, currentStageIds, findConflicts, itemsOn, monthGrid } from "./calendar";
import { DEMO_ITEMS, DEMO_TODAY, SAMPLE_EXTRACTION } from "./demo";
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
