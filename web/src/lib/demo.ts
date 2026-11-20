import type { CalendarItem } from "./calendar";
import type { PostingExtraction } from "./schemas";

/** API 키 없이 화면 흐름을 볼 때 쓰는 예시 추출 결과 (eval/postings/p01.txt 정답과 동일) */
export const SAMPLE_EXTRACTION: PostingExtraction = {
  company: "신한은행",
  title: "2026 하반기 신입행원 (디지털/ICT) · 시연용 가상 공고",
  stages: [
    { stage_name: "서류 마감", stage_type: "document_deadline", kind: "fixed", start: "2026-12-02", end: "2026-12-02", time: "17:00", evidence: "접수기간: 11.20(금)~12.2(수) 17:00" },
    { stage_name: "AI역검", stage_type: "ai_assessment", kind: "fixed", start: "2026-12-07", end: "2026-12-08", time: null, evidence: "AI역량검사: 12.7~12.8 (온라인)" },
    { stage_name: "서류발표", stage_type: "document_result", kind: "range", start: "2026-12-11", end: "2026-12-20", time: null, evidence: "서류전형 발표: 12월 중순 예정" },
    { stage_name: "1차면접", stage_type: "interview_1", kind: "tbd", start: null, end: null, time: null, evidence: "면접 일정은 추후 개별 안내" },
  ],
};

/**
 * 시연용 가상 데이터 (소개서 05 캘린더와 동일).
 * 기업명은 이해를 돕기 위한 예시이며 공고·일정은 모두 가상이다.
 */
export const DEMO_TODAY = "2026-12-07";

const C = { shinhan: "#2A9D8F", toss: "#7B61FF", hyundai: "#E09F3E", samsung: "#1E63B5", hynix: "#D6457A", cert: "#0EA5E9", personal: "#8A94A6" };

type Seed = [id: string, group: string, label: string, company: string | null, color: string, cat: CalendarItem["category"], start: string, end: string, conf: CalendarItem["confidence"], evidence: string, status?: CalendarItem["status"]];

const seeds: Seed[] = [
  ["s1", "shinhan", "신한 서류마감", "신한은행", C.shinhan, "application", "2026-12-02", "2026-12-02", "high", "접수기간: 11.20(금)~12.2(수) 17:00", "done"],
  ["s2", "shinhan", "신한 AI역검", "신한은행", C.shinhan, "application", "2026-12-07", "2026-12-08", "high", "AI역량검사: 12.7~12.8 (온라인)"],
  ["s3", "shinhan", "신한 서류발표", "신한은행", C.shinhan, "application", "2026-12-14", "2026-12-14", "mid", "서류전형 발표: 12월 중순 예정"],
  ["s4", "shinhan", "신한 1차면접", "신한은행", C.shinhan, "application", "2026-12-17", "2026-12-17", "low", "면접 일정은 추후 개별 안내"],
  ["s5", "shinhan", "신한 최종발표", "신한은행", C.shinhan, "application", "2026-12-28", "2026-12-28", "low", "최종 합격자 발표: 추후 안내"],
  ["t1", "toss", "토스 서류마감", "토스뱅크", C.toss, "application", "2026-12-01", "2026-12-01", "high", "서류 접수: ~12/1(화) 23:59", "done"],
  ["t2", "toss", "토스 코딩테스트", "토스뱅크", C.toss, "application", "2026-12-11", "2026-12-11", "high", "코딩테스트: 12월 11일(금) 온라인"],
  ["t3", "toss", "토스 1차면접", "토스뱅크", C.toss, "application", "2026-12-18", "2026-12-18", "mid", "1차 면접: 12월 셋째 주 예정"],
  ["h1", "hyundai", "현대차 1차면접", "현대자동차", C.hyundai, "application", "2026-12-17", "2026-12-17", "high", "1차 면접: 12월 17일(목) 10:00"],
  ["m1", "samsung", "삼성 서류마감", "삼성전자", C.samsung, "application", "2026-12-03", "2026-12-03", "high", "지원서 접수: ~12/3(목) 17:00", "done"],
  ["m2", "samsung", "삼성 GSAT", "삼성전자", C.samsung, "application", "2026-12-13", "2026-12-13", "high", "GSAT: 12월 13일(일)"],
  ["k1", "hynix", "SK하이닉스 SKCT", "SK하이닉스", C.hynix, "application", "2026-12-12", "2026-12-12", "high", "SKCT: 12월 12일(토)"],
  ["k2", "hynix", "SK하이닉스 면접", "SK하이닉스", C.hynix, "application", "2026-12-21", "2026-12-21", "low", "면접 일정 추후 안내"],
  ["c1", "c1", "자격증 시험", null, C.cert, "certificate", "2026-12-05", "2026-12-05", "high", "직접 입력"],
  ["p1", "p1", "아르바이트", null, C.personal, "personal", "2026-12-10", "2026-12-10", "high", "직접 입력"],
  ["p2", "p2", "가족 모임", null, C.personal, "personal", "2026-12-24", "2026-12-24", "high", "직접 입력"],
];

export const DEMO_ITEMS: CalendarItem[] = seeds.map(([id, groupId, label, company, color, category, start, end, confidence, evidence, status]) => ({
  id, groupId, label, company, color, category, start, end, confidence, evidence,
  status: status ?? (confidence === "high" ? "confirmed" : "planned"),
}));
