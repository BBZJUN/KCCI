import { describe, expect, it } from "vitest";
import { estimateSchedule, addDays } from "./estimateSchedule";
import { detectConflicts } from "./detectConflict";
import { evidenceInSource } from "./evidence";
import { maskPII } from "./readNotice";
import type { ExtractedStage, CalendarEvent } from "../schemas";

const SRC = `접수기간: 11.20(금)~12.2(수) 17:00
AI역량검사: 12.7~12.8 (온라인)
서류전형 발표: 12월 중순 예정
면접 일정은 추후 개별 안내`;

const stages: ExtractedStage[] = [
  { stage_name: "서류 마감", stage_type: "document_deadline", kind: "fixed", start: "2026-12-02", end: null, time: "17:00", evidence: "접수기간: 11.20(금)~12.2(수) 17:00" },
  { stage_name: "AI역량검사", stage_type: "ai_assessment", kind: "fixed", start: "2026-12-07", end: "2026-12-08", time: null, evidence: "AI역량검사: 12.7~12.8 (온라인)" },
  { stage_name: "서류 발표", stage_type: "document_result", kind: "range", start: "2026-12-11", end: "2026-12-20", time: null, evidence: "서류전형 발표: 12월 중순 예정" },
  { stage_name: "1차 면접", stage_type: "interview_1", kind: "tbd", start: null, end: null, time: null, evidence: "면접 일정은 추후 개별 안내" },
];

describe("estimateSchedule", () => {
  const plan = estimateSchedule(stages, SRC);
  it("확정·범위·추정 신뢰도를 실선/점선/점점선 기준으로 매긴다", () => {
    expect(plan.map((p) => p.confidence)).toEqual(["high", "high", "mid", "low"]);
    expect(plan[3].basis).toBe("rule");
  });
  it("미정 단계는 앞 단계 종료일 + 기본 간격으로 추정한다", () => {
    expect(plan[3].start).toBe(addDays("2026-12-20", 5));
    expect(plan[3].end).toBe(addDays("2026-12-20", 10));
  });
  it("원문에 없는 근거는 evidence_missing으로 표시하고 신뢰도를 낮춘다", () => {
    const fake = [{ ...stages[0], evidence: "서류 마감은 12월 2일입니다" }];
    const p = estimateSchedule(fake, SRC)[0];
    expect(p.evidence_missing).toBe(true);
    expect(p.confidence).toBe("mid");
  });
});

describe("detectConflicts", () => {
  const ev = (id: string, title: string, d: string, confidence: CalendarEvent["confidence"], category: CalendarEvent["category"] = "application"): CalendarEvent =>
    ({ id, title, category, start: d, end: d, confidence });
  it("확정 면접과 추정 면접이 겹치면 soft 충돌", () => {
    const c = detectConflicts([ev("1", "현대자동차 1차 면접", "2026-12-17", "high"), ev("2", "신한은행 1차 면접", "2026-12-17", "low")]);
    expect(c).toHaveLength(1);
    expect(c[0].severity).toBe("soft");
  });
  it("확정 면접과 자격증 시험이 겹치면 hard 충돌", () => {
    const c = detectConflicts([ev("1", "토스뱅크 1차 면접", "2026-12-18", "high"), ev("2", "자격증 시험", "2026-12-18", "high", "certificate")]);
    expect(c[0].severity).toBe("hard");
  });
  it("서류 마감처럼 하루를 점유하지 않는 일정은 충돌로 보지 않는다", () => {
    expect(detectConflicts([ev("1", "삼성전자 서류 마감", "2026-12-03", "high"), ev("2", "가족 모임", "2026-12-03", "high", "personal")])).toHaveLength(0);
  });
});

describe("guards", () => {
  it("근거 확인은 공백·구두점 차이를 무시한다", () => {
    expect(evidenceInSource("AI역량검사 : 12.7 ~ 12.8 ( 온라인 )", SRC)).toBe(true);
  });
  it("LLM 전달 전 개인정보를 마스킹한다", () => {
    const m = maskPII("강재준님, 문의는 010-1234-5678 또는 hr@example.com");
    expect(m).not.toMatch(/010-1234-5678|hr@example\.com|강재준/);
  });
});
