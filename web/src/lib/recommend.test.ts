import { describe, expect, it } from "vitest";
import { rankJobs, DEFAULT_PROFILE } from "./recommend";
import { POSTINGS } from "./postings";
import { DEMO_ITEMS, DEMO_TODAY } from "./demo";

describe("rankJobs", () => {
  const ranked = rankJobs(POSTINGS, DEFAULT_PROFILE, DEMO_ITEMS, DEMO_TODAY);
  it("마감 지난 공고와 '관심 없음' 공고는 제외", () => {
    expect(rankJobs(POSTINGS, DEFAULT_PROFILE, [], "2026-12-15").some((r) => r.posting.deadline < "2026-12-15")).toBe(false);
    expect(rankJobs(POSTINGS, DEFAULT_PROFILE, [], DEMO_TODAY, ["google-swe"]).some((r) => r.posting.id === "google-swe")).toBe(false);
  });
  it("관심 직무가 다른 공고(차량 SW)는 직무 일치 공고보다 아래", () => {
    const idx = (id: string) => ranked.findIndex((r) => r.posting.id === id);
    expect(idx("hyundai-sw")).toBeGreaterThan(idx("google-swe"));
  });
  it("보유 자격(SQLD) 우대 공고에는 그 이유가 붙는다", () => {
    expect(ranked.find((r) => r.posting.id === "shinhan-ict")!.reasons.some((x) => x.text.includes("SQLD"))).toBe(true);
  });
  it("수락 시 기존 일정과 겹치면 경고 이유가 붙는다 (신한 ICT 1차 면접 범위 ↔ 12/21 SK하이닉스·12/24 가족 모임)", () => {
    const r = ranked.find((x) => x.posting.id === "shinhan-ict")!;
    expect(r.conflicts.length).toBeGreaterThan(0);
    expect(r.reasons.some((x) => !x.ok && x.text.includes("겹칠"))).toBe(true);
  });
  it("진행 중인 기업 표시", () => {
    expect(ranked.find((r) => r.posting.id === "toss-server")!.inProgress).toBe(true);
    expect(ranked.find((r) => r.posting.id === "google-swe")!.inProgress).toBe(false);
  });
});
