import { PERSONAL_COLORS, type CalendarItem } from "./calendar";
import type { NoticeReading, PostingExtraction } from "./schemas";

/** API 키 없이 화면 ③을 볼 때 쓰는 예시 안내 (가상) */
export const SAMPLE_NOTICES: { label: string; text: string; reading: NoticeReading }[] = [
  {
    label: "토스뱅크 서류 합격",
    text: `[토스뱅크] 서류전형 합격 안내 (시연용 가상 메일)

안녕하세요, 홍길동님.
토스뱅크 2026 하반기 신입 채용에 지원해 주셔서 감사합니다.
서류전형에 합격하셨습니다. 1차 면접은 12월 18일(금) 오후 6시, 화상으로 진행됩니다.
문의: recruit@example.com`,
    reading: {
      company: "토스뱅크",
      result: "pass",
      about_stage: "서류전형",
      next_stage: { stage_name: "1차 면접", stage_type: "interview_1", date: "2026-12-18", time: "18:00", mode: "화상" },
      evidence: "서류전형에 합격하셨습니다. 1차 면접은 12월 18일(금) 오후 6시, 화상으로 진행됩니다.",
    },
  },
  {
    label: "SK하이닉스 면접 일정",
    text: `[SK하이닉스] 면접 일정 안내 (시연용 가상 문자)
[이름]님, SKCT 합격을 축하드립니다. 면접은 12월 22일(화) 오전 10시 이천캠퍼스에서 진행됩니다.`,
    reading: {
      company: "SK하이닉스",
      result: "pass",
      about_stage: "SKCT",
      next_stage: { stage_name: "면접", stage_type: "interview_1", date: "2026-12-22", time: "10:00", mode: "이천캠퍼스" },
      evidence: "면접은 12월 22일(화) 오전 10시 이천캠퍼스에서 진행됩니다.",
    },
  },
  {
    label: "신한은행 서류 불합격",
    text: `[신한은행] 서류전형 결과 안내 (시연용 가상 메일)
아쉽게도 이번 서류전형에서는 귀하를 모시지 못하게 되었습니다. 지원해 주셔서 감사합니다.`,
    reading: {
      company: "신한은행",
      result: "fail",
      about_stage: "서류전형",
      next_stage: null,
      evidence: "아쉽게도 이번 서류전형에서는 귀하를 모시지 못하게 되었습니다.",
    },
  },
];

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
/** 시연 인물 (가상): 백엔드·서버 직무, 서울 희망, SQLD 보유. 12월에 4곳 전형 진행 중 + 알바·스터디·가족·친구 약속 */
export const DEMO_USER = "홍길동";

const C = { shinhan: "#2A9D8F", toss: "#7B61FF", hyundai: "#E09F3E", samsung: "#1E63B5", hynix: "#D6457A", lg: "#A50034", cert: PERSONAL_COLORS.certificate, personal: PERSONAL_COLORS.personal };

type Seed = [id: string, group: string, label: string, company: string | null, color: string, cat: CalendarItem["category"], start: string, end: string, conf: CalendarItem["confidence"], evidence: string, status?: CalendarItem["status"], time?: string];

// 신한은행은 첫 화면(공고 담기)에서 직접 담는 시연용이라 처음 캘린더에는 넣지 않는다.
// 담으면 12/17 현대차 1차면접(확정)과 신한 1차면접(추정)이 겹쳐 충돌 경고가 뜬다.
// 확정(실선)은 시각까지, 범위·추정(점선·점점선)은 시각 미정으로 둔다.
const D = undefined; // status 기본값
const seeds: Seed[] = [
  // 토스뱅크: 코딩테스트 확정, 1차 면접은 '셋째 주' 범위 → 합격 메일이 오면 확정
  ["t1", "toss", "토스 서류마감", "토스뱅크", C.toss, "application", "2026-12-01", "2026-12-01", "high", "서류 접수: ~12/1(화) 23:59", "done", "23:59"],
  ["t2", "toss", "토스 코딩테스트", "토스뱅크", C.toss, "application", "2026-12-11", "2026-12-11", "high", "코딩테스트: 12월 11일(금) 오후 2시 온라인", D, "14:00"],
  ["t3", "toss", "토스 1차면접", "토스뱅크", C.toss, "application", "2026-12-18", "2026-12-18", "mid", "1차 면접: 12월 셋째 주 예정"],
  ["t4", "toss", "토스 2차면접", "토스뱅크", C.toss, "application", "2026-12-28", "2026-12-31", "low", "2차 면접: 1차 합격자 대상 추후 안내 (기본 간격 추정)"],
  ["t5", "toss", "토스 최종발표", "토스뱅크", C.toss, "application", "2027-01-11", "2027-01-15", "low", "최종 결과: 추후 안내 (기본 간격 추정)"],
  // 현대자동차: 1차 면접 확정, 결과는 '넷째 주' 범위, 2차는 추정
  ["h0", "hyundai", "현대차 서류마감", "현대자동차", C.hyundai, "application", "2026-11-27", "2026-11-27", "high", "서류 접수: ~11/27(금) 17:00", "done", "17:00"],
  ["h1", "hyundai", "현대차 1차면접", "현대자동차", C.hyundai, "application", "2026-12-17", "2026-12-17", "high", "1차 면접: 12월 17일(목) 10:00, 양재 본사", D, "10:00"],
  ["h3", "hyundai", "현대차 1차 발표", "현대자동차", C.hyundai, "application", "2026-12-21", "2026-12-24", "mid", "1차 면접 결과: 12월 넷째 주 발표 예정"],
  ["h2", "hyundai", "현대차 2차면접", "현대자동차", C.hyundai, "application", "2027-01-05", "2027-01-08", "low", "2차 면접: 추후 안내 (기본 간격 추정)"],
  // 삼성전자: GSAT 확정, 결과는 '하순' 범위
  ["m1", "samsung", "삼성 서류마감", "삼성전자", C.samsung, "application", "2026-12-03", "2026-12-03", "high", "지원서 접수: ~12/3(목) 17:00", "done", "17:00"],
  ["m2", "samsung", "삼성 GSAT", "삼성전자", C.samsung, "application", "2026-12-13", "2026-12-13", "high", "GSAT: 12월 13일(일) 오전 9시 온라인", D, "09:00"],
  ["m4", "samsung", "삼성 GSAT 결과", "삼성전자", C.samsung, "application", "2026-12-21", "2026-12-31", "mid", "GSAT 결과: 12월 하순 발표"],
  ["m3", "samsung", "삼성 면접", "삼성전자", C.samsung, "application", "2027-01-04", "2027-01-08", "mid", "면접전형: 1월 초순"],
  // SK하이닉스: SKCT 확정, 면접은 추정 → 면접 문자 캡처가 오면 확정
  ["k1", "hynix", "SK하이닉스 SKCT", "SK하이닉스", C.hynix, "application", "2026-12-12", "2026-12-12", "high", "SKCT: 12월 12일(토) 오전 10시", D, "10:00"],
  ["k2", "hynix", "SK하이닉스 면접", "SK하이닉스", C.hynix, "application", "2026-12-21", "2026-12-21", "low", "면접 일정 추후 안내 (기본 간격 추정)"],
  ["k3", "hynix", "SK하이닉스 최종발표", "SK하이닉스", C.hynix, "application", "2027-01-11", "2027-01-15", "low", "최종 발표: 추후 안내 (기본 간격 추정)"],
  // LG CNS: 서류 결과 대기 중, 이후 전형은 모두 추정
  ["l1", "lg", "LG CNS 서류마감", "LG CNS", C.lg, "application", "2026-12-04", "2026-12-04", "high", "서류 접수: ~12/4(금) 17:00", "done", "17:00"],
  ["l2", "lg", "LG CNS 서류발표", "LG CNS", C.lg, "application", "2026-12-14", "2026-12-18", "mid", "서류전형 발표: 12월 셋째 주 예정"],
  ["l3", "lg", "LG CNS 인적성", "LG CNS", C.lg, "application", "2026-12-27", "2026-12-27", "low", "인적성검사: 서류 합격자 대상 추후 안내 (기본 간격 추정)"],
  ["l4", "lg", "LG CNS 1차면접", "LG CNS", C.lg, "application", "2027-01-11", "2027-01-15", "low", "1차 면접: 추후 안내 (기본 간격 추정)"],
  // 자격증
  ["c1", "c1", "정보처리기사 실기", null, C.cert, "certificate", "2026-12-05", "2026-12-05", "high", "Q-net 시험 일정 (직접 입력)", D, "09:00"],
  ["c2", "c2", "ADsP 시험", null, C.cert, "certificate", "2027-01-09", "2027-01-09", "high", "데이터자격검정 일정 (직접 입력)", D, "10:00"],
  // 개인 일정
  ["p4", "p4", "알고리즘 스터디", null, C.personal, "personal", "2026-12-09", "2026-12-09", "high", "직접 입력", D, "19:00"],
  ["p1", "p1", "카페 아르바이트", null, C.personal, "personal", "2026-12-10", "2026-12-10", "high", "직접 입력", D, "13:00"],
  ["p5", "p5", "고등학교 친구들 술약속", null, C.personal, "personal", "2026-12-18", "2026-12-18", "high", "직접 입력", D, "19:00"],
  ["p2", "p2", "가족 모임 (크리스마스 이브)", null, C.personal, "personal", "2026-12-24", "2026-12-24", "high", "직접 입력", D, "18:00"],
  ["p3", "p3", "카페 아르바이트", null, C.personal, "personal", "2026-12-26", "2026-12-26", "high", "직접 입력", D, "13:00"],
  ["p6", "p6", "동아리 송년회", null, C.personal, "personal", "2026-12-30", "2026-12-30", "high", "직접 입력", D, "19:00"],
];

/** 첫 화면에서 신한 공고를 담았을 때와 같은 일정 (테스트·시연 설명용) */
const shinhanSeeds: Seed[] = [
  ["s1", "shinhan", "신한 서류마감", "신한은행", C.shinhan, "application", "2026-12-02", "2026-12-02", "high", "접수기간: 11.20(금)~12.2(수) 17:00", "done"],
  ["s2", "shinhan", "신한 AI역검", "신한은행", C.shinhan, "application", "2026-12-07", "2026-12-08", "high", "AI역량검사: 12.7~12.8 (온라인)"],
  ["s3", "shinhan", "신한 서류발표", "신한은행", C.shinhan, "application", "2026-12-14", "2026-12-14", "mid", "서류전형 발표: 12월 중순 예정"],
  ["s4", "shinhan", "신한 1차면접", "신한은행", C.shinhan, "application", "2026-12-17", "2026-12-17", "low", "면접 일정은 추후 개별 안내"],
  ["s5", "shinhan", "신한 최종발표", "신한은행", C.shinhan, "application", "2026-12-28", "2026-12-28", "low", "최종 합격자 발표: 추후 안내"],
];
const toItem = ([id, groupId, label, company, color, category, start, end, confidence, evidence, status, time]: Seed): CalendarItem => ({
  id, groupId, label, company, color, category, start, end, confidence, evidence, time: time ?? null,
  status: status ?? (confidence === "high" ? "confirmed" : "planned"),
});
export const DEMO_SHINHAN_ITEMS: CalendarItem[] = shinhanSeeds.map(toItem);

export const DEMO_ITEMS: CalendarItem[] = seeds.map(toItem);

/** 화면 ② 기본 예시 공고 원문 (SAMPLE_EXTRACTION의 원문) */
export const SAMPLE_POSTING_TEXT = `[신한은행] 2026 하반기 신입행원 채용 (디지털/ICT) — 시연용 가상 공고
접수기간: 11.20(금)~12.2(수) 17:00
AI역량검사: 12.7~12.8 (온라인)
서류전형 발표: 12월 중순 예정
1차 면접: 면접 일정은 추후 개별 안내
최종 합격자 발표: 1월 중`;
