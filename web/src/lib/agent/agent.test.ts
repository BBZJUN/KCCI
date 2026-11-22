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

import { memoryCache, normalizePosting, postingHash } from "./cache";

describe("posting_cache 해시", () => {
  it("공백·줄바꿈·전각 공백 차이는 같은 공고로 본다", () => {
    const a = "  접수기간: 11.20~12.2\r\n\r\n면접　추후 안내 ";
    const b = "접수기간: 11.20~12.2\n면접 추후 안내";
    expect(normalizePosting(a)).toBe(normalizePosting(b));
    expect(postingHash(a)).toBe(postingHash(b));
  });
  it("글자가 다르면 다른 공고로 본다", () => {
    expect(postingHash("접수기간: 11.20~12.2")).not.toBe(postingHash("접수기간: 11.20~12.3"));
  });
  it("메모리 캐시는 저장한 결과를 그대로 돌려준다", async () => {
    const c = memoryCache();
    const h = postingHash(SRC);
    expect(await c.get(h)).toBeNull();
    await c.set(h, { extraction: { company: "가상", title: "t", stages }, model: "m", createdAt: "2026-11-20" });
    expect((await c.get(h))?.extraction.stages).toHaveLength(4);
  });
});

import { pickTarget, templateAdvice } from "./conflictAdvice";

describe("충돌 조정 대상 (코드 규칙)", () => {
  const ev = (id: string, category: CalendarEvent["category"], confidence: CalendarEvent["confidence"], start = "2026-12-17"): CalendarEvent => ({ id, title: `${id} 1차 면접`, category, start, end: start, confidence });
  it("추정 일정 쪽을 조정 대상으로 고른다", () => {
    expect(pickTarget({ a: ev("현대", "application", "high"), b: ev("신한", "application", "low") }).target.id).toBe("신한");
  });
  it("신뢰도가 같으면 개인 일정을 옮긴다", () => {
    expect(pickTarget({ a: ev("알바", "personal", "high"), b: ev("토스", "application", "high") }).target.id).toBe("알바");
  });
  it("템플릿 문구는 다른 기업명을 드러내지 않는다", () => {
    const adv = templateAdvice({ a: ev("현대차", "application", "high"), b: ev("신한", "application", "low"), overlapStart: "2026-12-17" });
    expect(adv.target_id).toBe("신한");
    expect(adv.message).not.toContain("현대차");
    expect(adv.message).toContain("12월 17일");
  });
});

import { normalizeStages } from "./normalizeStages";

describe("추출 결과 정리 규칙", () => {
  const st = (p: Partial<ExtractedStage>): ExtractedStage => ({ stage_name: "s", stage_type: "other", kind: "range", start: null, end: null, time: null, evidence: "", ...p });
  it("서류 접수 기간은 마감일 하루(확정)로 올린다", () => {
    const [s] = normalizeStages([st({ stage_type: "document_deadline", start: "2026-11-20", end: "2026-12-02", evidence: "접수기간: 11.20(금)~12.2(수) 17:00" })]);
    expect([s.kind, s.start, s.end]).toEqual(["fixed", "2026-12-02", "2026-12-02"]);
  });
  it("'1월 중'은 그 달 전체, '1월 중순'은 그대로", () => {
    expect(normalizeStages([st({ start: "2027-01-11", end: "2027-01-20", evidence: "최종 합격자 발표: 1월 중" })])[0]).toMatchObject({ start: "2027-01-01", end: "2027-01-31" });
    expect(normalizeStages([st({ start: "2027-01-11", end: "2027-01-20", evidence: "최종 발표: 1월 중순 예정" })])[0]).toMatchObject({ start: "2027-01-11", end: "2027-01-20" });
  });
  it("날짜가 둘 다 적힌 기간은 확정, '12월 중순'은 범위 유지", () => {
    expect(normalizeStages([st({ start: "2026-12-07", end: "2026-12-08", evidence: "AI역량검사: 12.7(월) ~ 12.8(화)" })])[0].kind).toBe("fixed");
    expect(normalizeStages([st({ start: "2026-12-22", end: "2026-12-23", evidence: "1차 면접: 12월 22일 ~ 12월 23일" })])[0].kind).toBe("fixed");
    expect(normalizeStages([st({ start: "2026-12-11", end: "2026-12-20", evidence: "서류전형 발표: 12월 중순 예정" })])[0].kind).toBe("range");
  });
});

import { knownPosting, ruleExtract, ruleNotice, timeIn } from "./fallback";
import { SAMPLE_POSTING_TEXT } from "../demo";
import { POSTINGS } from "../postings";

describe("AI 예비 경로 (키 없음·한도·혼잡)", () => {
  it("시연용 공고는 미리 분석한 결과를 쓴다", () => {
    expect(knownPosting(SAMPLE_POSTING_TEXT)?.company).toBe("신한은행");
    expect(knownPosting(POSTINGS[2].text + "\n\n")?.company).toBe(POSTINGS[2].extraction.company);
    expect(knownPosting("[가상] 다른 공고\n서류 접수: 12.1~12.5")).toBeNull();
  });
  it("규칙 추출: 접수 마감·확정·범위·미정을 구분한다", () => {
    const ex = ruleExtract("[가상은행] IT 신입\n■ 서류 접수: 11.20(금) ~ 12.2(수) 17:00까지\n■ AI역량검사: 12.7~12.8\n■ 1차 면접: 12월 중순\n■ 최종 발표: 추후 안내", "2026-11-20");
    expect(ex.company).toBe("가상은행");
    expect(ex.stages.map((s) => [s.stage_type, s.kind, s.start, s.end])).toEqual([
      ["document_deadline", "fixed", "2026-12-02", "2026-12-02"],
      ["ai_assessment", "fixed", "2026-12-07", "2026-12-08"],
      ["interview_1", "range", "2026-12-11", "2026-12-20"],
      ["final_result", "tbd", null, null],
    ]);
    expect(ex.stages[0].time).toBe("17:00");
  });
  it("규칙 추출: 해가 바뀌는 날짜는 다음 해로", () => {
    expect(ruleExtract("[가상] 공고\n면접: 1월 6일", "2026-11-20").stages[0].start).toBe("2027-01-06");
  });
  it("규칙 판독: 합격·불합격·다음 전형 날짜와 시각", () => {
    const pass = ruleNotice("[가상] 서류 합격 안내\n1차 면접은 12월 18일(금) 오후 2시, 화상으로 진행됩니다.", "2026-12-14");
    expect([pass.result, pass.next_stage?.stage_type, pass.next_stage?.date, pass.next_stage?.time, pass.next_stage?.mode]).toEqual(["pass", "interview_1", "2026-12-18", "14:00", "화상"]);
    expect(ruleNotice("[가상] 결과 안내\n아쉽게도 이번에는 함께하지 못하게 되었습니다.", "2026-12-14")).toMatchObject({ result: "fail", next_stage: null });
    expect(timeIn("오전 9시 30분")).toBe("09:30");
  });
});

import { readFileSync as readFileSync2 } from "node:fs";
import { join as join2 } from "node:path";
import { runNoticeAgent } from "./noticeAgent";
import { DEMO_ITEMS as SEEDED, SAMPLE_NOTICES as NOTICES } from "../demo";

describe("안내 반영 에이전트 (AI 없이 예비 경로)", () => {
  it("토스 합격 메일 → 12/18 면접 확정 → 친구 술약속과 새 충돌 → 약속 조정 문구", async () => {
    const r = await runNoticeAgent({ text: NOTICES[0].text, items: SEEDED, today: "2026-12-07", useAI: false });
    expect(r.trace.map((s) => s.tool)).toEqual(["read_notice", "plan_changes", "detect_conflict", "suggest_adjustment", "await_approval"]);
    expect(r.plan.changes[0]).toMatchObject({ type: "confirm", after: { start: "2026-12-18", time: "18:00", confidence: "high" } });
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].conflict.severity).toBe("hard");
    const target = r.conflicts[0].advice.target_id;
    expect(SEEDED.find((i) => i.id === target)?.label).toContain("술약속");
  });
  it("시연용 캡처는 AI 없이도 미리 옮긴 글로 판독한다", async () => {
    const png = readFileSync2(join2(__dirname, "../../../public/samples/notice-sms.png"));
    const r = await runNoticeAgent({ image: "data:image/png;base64," + png.toString("base64"), items: SEEDED, today: "2026-12-07", useAI: false });
    expect(r.trace[0]).toMatchObject({ tool: "transcribe_capture", by: "예비" });
    expect(r.transcript).not.toContain("홍길동");
    expect(r.reading.next_stage).toMatchObject({ date: "2026-12-22", time: "10:00" });
  });
});
