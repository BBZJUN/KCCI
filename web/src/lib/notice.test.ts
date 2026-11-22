import { describe, expect, it } from "vitest";
import { planNoticeChanges } from "./notice";
import { DEMO_ITEMS as SEED_ITEMS, DEMO_SHINHAN_ITEMS, DEMO_TODAY, SAMPLE_NOTICES } from "./demo";
import { findConflicts } from "./calendar";

// 첫 화면에서 신한 공고를 담은 뒤의 캘린더
const DEMO_ITEMS = [...SEED_ITEMS, ...DEMO_SHINHAN_ITEMS];

const [toss, hynix, shinhanFail] = SAMPLE_NOTICES;

describe("planNoticeChanges", () => {
  it("토스뱅크 합격 → 예상 1차면접(범위)을 12/18 14:00 확정으로 바꾸자고 제안", () => {
    const plan = planNoticeChanges(DEMO_ITEMS, toss.reading, DEMO_TODAY, toss.reading.evidence);
    expect(plan.changes).toHaveLength(1);
    const c = plan.changes[0];
    expect(c.type).toBe("confirm");
    if (c.type !== "confirm") return;
    expect(c.itemId).toBe("t3");
    expect(c.before.confidence).toBe("mid");
    expect(c.after).toMatchObject({ start: "2026-12-18", time: "14:00", confidence: "high", status: "confirmed" });
  });
  it("SK하이닉스 면접 안내 → 추정 면접(12/21)을 12/22로 확정", () => {
    const c = planNoticeChanges(DEMO_ITEMS, hynix.reading, DEMO_TODAY, hynix.reading.evidence).changes[0];
    expect(c.type === "confirm" && c.itemId === "k2" && c.after.start === "2026-12-22").toBe(true);
  });
  it("신한은행 불합격 → 기준일 이후 남은 일정만 정리 제안 (지난 서류 마감은 유지)", () => {
    const plan = planNoticeChanges(DEMO_ITEMS, shinhanFail.reading, DEMO_TODAY, shinhanFail.reading.evidence);
    const ids = plan.changes.map((c) => c.type === "cancel" && c.itemId);
    expect(ids).toEqual(expect.arrayContaining(["s2", "s3", "s4", "s5"]));
    expect(ids).not.toContain("s1");
    expect(plan.changes.every((c) => c.type === "cancel")).toBe(true);
  });
  it("불합격 반영 후 12/17 충돌이 사라진다 (정리 결과가 충돌 감지에 반영)", () => {
    const plan = planNoticeChanges(DEMO_ITEMS, shinhanFail.reading, DEMO_TODAY, "");
    const cancelled = new Set(plan.changes.map((c) => (c.type === "cancel" ? c.itemId : "")));
    const after = DEMO_ITEMS.map((i) => (cancelled.has(i.id) ? { ...i, status: "cancelled" as const } : i));
    expect(findConflicts(after).some((c) => c.overlapStart === "2026-12-17")).toBe(false);
  });
  it("캘린더에 없는 회사·단계면 새 일정 추가를 제안", () => {
    const plan = planNoticeChanges([], toss.reading, DEMO_TODAY, "");
    expect(plan.changes[0].type).toBe("add");
  });
});
