import { z } from "zod";

/** 전형 단계 유형 */
export const StageType = z.enum([
  "document_deadline", // 서류 마감
  "ai_assessment", // AI역량검사
  "coding_test", // 코딩테스트
  "written_test", // 필기·인적성 (GSAT, SKCT 등)
  "document_result", // 서류 발표
  "test_result", // 필기·역검 발표
  "interview_1", // 1차 면접
  "interview_1_result", // 1차 면접 발표
  "interview_2", // 2차(최종) 면접
  "final_result", // 최종 발표
  "other",
]);
export type StageType = z.infer<typeof StageType>;

/**
 * 날짜 유형 → 캘린더 선 스타일
 * fixed: 공고에 날짜 명시 (실선)
 * range: '12월 중순'처럼 범위만 있음 (점선)
 * tbd:   '추후 안내' 등 날짜 없음 → 규칙으로 추정 (점점선)
 */
export const DateKind = z.enum(["fixed", "range", "tbd"]);
export type DateKind = z.infer<typeof DateKind>;

export const Confidence = z.enum(["high", "mid", "low"]);
export type Confidence = z.infer<typeof Confidence>;

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const HhMm = z.string().regex(/^\d{2}:\d{2}$/, "HH:MM");

/** LLM이 공고 원문에서 뽑는 단계 1개 (Structured Outputs: optional 금지, nullable 사용) */
export const ExtractedStage = z.object({
  stage_name: z.string().describe("공고에 쓰인 단계 이름. 예: '서류 마감', '1차 면접'"),
  stage_type: StageType,
  kind: DateKind,
  start: IsoDate.nullable().describe("fixed/range의 시작일. tbd면 null"),
  end: IsoDate.nullable().describe("range의 종료일 또는 기간형 일정의 마지막 날. 하루짜리면 start와 같게"),
  time: HhMm.nullable().describe("시각이 명시된 경우만. 예: '17:00'"),
  evidence: z.string().describe("근거가 된 공고 원문 문장을 그대로 복사. 근거가 없으면 빈 문자열"),
});
export type ExtractedStage = z.infer<typeof ExtractedStage>;

export const PostingExtraction = z.object({
  company: z.string(),
  title: z.string().describe("공고 제목 또는 모집 부문"),
  stages: z.array(ExtractedStage),
});
export type PostingExtraction = z.infer<typeof PostingExtraction>;

/** 결과·일정 안내 메일/문자 판독 결과 */
export const NoticeReading = z.object({
  company: z.string(),
  result: z.enum(["pass", "fail", "schedule_only", "unknown"]),
  about_stage: z.string().describe("이 안내가 결과를 알리는 단계. 예: '서류전형'"),
  next_stage: z
    .object({
      stage_name: z.string(),
      stage_type: StageType,
      date: IsoDate.nullable(),
      time: HhMm.nullable(),
      mode: z.string().nullable().describe("대면/화상/장소 등"),
    })
    .nullable(),
  evidence: z.string().describe("판단 근거가 된 원문 문장을 그대로 복사"),
});
export type NoticeReading = z.infer<typeof NoticeReading>;

/** 캘린더에 올라가는 단계 (추정까지 반영된 최종 형태) */
export type PlannedStage = ExtractedStage & {
  confidence: Confidence;
  basis: "posting" | "rule";
  /** 원문 근거가 실제 원문에 없으면 true → UI에서 '근거 확인 필요' 표시 */
  evidence_missing: boolean;
};

/** 충돌 감지 입력 이벤트 */
export type CalendarEvent = {
  id: string;
  title: string;
  category: "application" | "certificate" | "personal";
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (inclusive)
  confidence: Confidence; // personal/certificate는 high
};

/** 충돌 조정 제안 (LLM은 문구만 쓴다. 충돌 여부·대상 후보는 코드가 정한다) */
export const ConflictAdvice = z.object({
  target_id: z.string().describe("옮기거나 문의할 일정의 id (입력으로 준 두 id 중 하나)"),
  reason: z.string().describe("그 일정을 고른 이유 한 문장"),
  message: z.string().describe("기업 채용담당자에게 보낼 일정 조정 문의 문구, 또는 개인 일정 이동 메모. 4~6문장, 정중한 존댓말"),
});
export type ConflictAdvice = z.infer<typeof ConflictAdvice>;
