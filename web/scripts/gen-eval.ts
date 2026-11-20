/**
 * 평가셋 생성기: 가상 공고 p02~p30, 안내 메일 n01~n20 의 원문과 정답을 같은 스펙에서 만든다.
 * (원문과 정답이 어긋나지 않게 하려는 것. p01은 손으로 쓴 원본을 유지한다.)
 *   npx tsx scripts/gen-eval.ts
 * 모든 기관·공고·인물은 가상이다. 실제 기업명은 '시연용 가상 공고' 표시를 붙인다.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "eval");
const WD = ["일", "월", "화", "수", "목", "금", "토"];

type T =
  | "document_deadline" | "ai_assessment" | "coding_test" | "written_test" | "document_result" | "test_result"
  | "interview_1" | "interview_1_result" | "interview_2" | "final_result" | "other";
type Expr =
  | { k: "dl"; from: string; d: string; t?: string } // 접수기간 → 마감일 하루 (fixed)
  | { k: "day"; d: string; t?: string } // 하루 (fixed)
  | { k: "span"; d1: string; d2: string } // 며칠 (fixed)
  | { k: "part"; m: string; p: "초순" | "중순" | "하순" | "중" } // 범위 (range)
  | { k: "tbd"; s: string }; // 미정
type Stage = [T, string, Expr];
type Posting = { id: string; today: string; head: string; extra: string[]; stages: Stage[] };

const lastDay = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
const wd = (iso: string) => WD[new Date(iso + "T00:00:00Z").getUTCDay()];
const M = (iso: string) => Number(iso.slice(5, 7));
const D = (iso: string) => Number(iso.slice(8, 10));

/** 날짜 표기를 공고마다 바꾼다: 12.2(수) / 2026년 12월 2일(수) / 12/2(수) / 12월 2일 */
function fmt(iso: string, style: number): string {
  switch (style % 4) {
    case 0: return `${M(iso)}.${D(iso)}(${wd(iso)})`;
    case 1: return `${iso.slice(0, 4)}년 ${M(iso)}월 ${D(iso)}일(${wd(iso)})`;
    case 2: return `${M(iso)}/${D(iso)}(${wd(iso)})`;
    default: return `${M(iso)}월 ${D(iso)}일`;
  }
}

function render(e: Expr, style: number): string {
  switch (e.k) {
    case "dl": return `${fmt(e.from, style)} ~ ${fmt(e.d, style)}${e.t ? ` ${e.t}까지` : ""}`;
    case "day": return `${fmt(e.d, style)}${e.t ? ` ${e.t}` : ""}`;
    case "span": return `${fmt(e.d1, style)} ~ ${fmt(e.d2, style)}`;
    case "part": {
      const y = e.m.slice(0, 4), m = Number(e.m.slice(5, 7));
      const yearPrefix = style % 2 === 1 ? `${y}년 ` : "";
      return `${yearPrefix}${m}월 ${e.p}${style % 3 === 0 ? " 예정" : ""}`;
    }
    case "tbd": return e.s;
  }
}

function answer(e: Expr): { kind: string; start: string | null; end: string | null } {
  switch (e.k) {
    case "dl": return { kind: "fixed", start: e.d, end: e.d };
    case "day": return { kind: "fixed", start: e.d, end: e.d };
    case "span": return { kind: "fixed", start: e.d1, end: e.d2 };
    case "part": {
      const [a, b] = e.p === "초순" ? [1, 10] : e.p === "중순" ? [11, 20] : e.p === "하순" ? [21, lastDay(e.m)] : [1, lastDay(e.m)];
      return { kind: "range", start: `${e.m}-${String(a).padStart(2, "0")}`, end: `${e.m}-${String(b).padStart(2, "0")}` };
    }
    case "tbd": return { kind: "tbd", start: null, end: null };
  }
}

const dl = (from: string, d: string, t?: string): Expr => ({ k: "dl", from, d, t });
const day = (d: string, t?: string): Expr => ({ k: "day", d, t });
const span = (d1: string, d2: string): Expr => ({ k: "span", d1, d2 });
const part = (m: string, p: "초순" | "중순" | "하순" | "중"): Expr => ({ k: "part", m, p });
const tbd = (s = "추후 개별 안내"): Expr => ({ k: "tbd", s });
const V = "시연용 가상 공고";

// ── 민간 15건 (p01은 수기 원본) ───────────────────────────────
const privatePostings: Posting[] = [
  { id: "p02", today: "2026-11-20", head: `[토스뱅크] Server Developer 신입 공개채용 — ${V}`, extra: ["■ 근무지: 서울 강남", "■ 지원자격: 졸업예정자 포함"], stages: [
    ["document_deadline", "서류 접수", dl("2026-11-20", "2026-12-04", "23:59")],
    ["coding_test", "코딩테스트", day("2026-12-12", "14:00")],
    ["interview_1", "1차 기술 면접", part("2026-12", "하순")],
    ["interview_2", "2차 컬처핏 면접", tbd("1차 합격자에 한해 별도 안내")],
    ["final_result", "최종 발표", part("2027-01", "중순")],
  ] },
  { id: "p03", today: "2026-11-20", head: `[SK하이닉스] 2026 하반기 신입 SW 직무 — ${V}`, extra: ["■ 모집부문: SW 개발, 데이터 엔지니어링"], stages: [
    ["document_deadline", "지원서 접수", dl("2026-11-23", "2026-12-01", "17:00")],
    ["written_test", "SKCT 인적성검사", day("2026-12-13")],
    ["test_result", "SKCT 합격자 발표", part("2026-12", "중순")],
    ["interview_1", "1차 면접", tbd("일정 추후 공지")],
    ["final_result", "최종 합격자 발표", part("2027-01", "중")],
  ] },
  { id: "p04", today: "2026-11-20", head: `[삼성전자] DX부문 SW개발 3급 신입 — ${V}`, extra: ["■ 전형: 서류 → GSAT → 면접 → 건강검진"], stages: [
    ["document_deadline", "지원서 작성", dl("2026-11-20", "2026-11-30", "17:00")],
    ["written_test", "GSAT", span("2026-12-12", "2026-12-13")],
    ["interview_1", "면접전형", part("2027-01", "초순")],
    ["final_result", "최종 합격 발표", tbd("면접 이후 개별 통보")],
  ] },
  { id: "p05", today: "2026-11-20", head: `[현대자동차] SW 신입 채용 (상시) — ${V}`, extra: ["■ 근무지: 경기 의왕"], stages: [
    ["document_deadline", "서류 접수", dl("2026-11-24", "2026-12-06", "23:59")],
    ["ai_assessment", "AI역량검사", span("2026-12-08", "2026-12-09")],
    ["document_result", "서류전형 합격자 발표", day("2026-12-11")],
    ["interview_1", "1차 면접", day("2026-12-17", "10:00")],
    ["interview_2", "2차 면접", tbd()],
  ] },
  { id: "p06", today: "2026-11-20", head: `[구글코리아] Software Engineer, New Grad — ${V}`, extra: ["■ Location: Seoul"], stages: [
    ["document_deadline", "지원 마감", dl("2026-11-20", "2026-12-10")],
    ["coding_test", "온라인 코딩 평가", tbd("서류 검토 후 개별 안내")],
    ["interview_1", "기술 면접", part("2027-01", "중")],
  ] },
  { id: "p07", today: "2026-11-20", head: `[카카오뱅크] 서버 개발 신입 — ${V}`, extra: ["■ 우대: 금융 도메인 프로젝트 경험"], stages: [
    ["document_deadline", "서류 접수", dl("2026-11-20", "2026-11-29", "18:00")],
    ["coding_test", "코딩테스트", day("2026-12-05", "13:00")],
    ["interview_1", "1차 인터뷰", part("2026-12", "중순")],
    ["interview_2", "2차 인터뷰", part("2026-12", "하순")],
    ["final_result", "최종 합격 발표", part("2027-01", "초순")],
  ] },
  { id: "p08", today: "2026-11-20", head: `[네이버] 2026 신입 개발자 공개채용 — ${V}`, extra: ["■ 직군: 백엔드, 프론트엔드, 데이터"], stages: [
    ["document_deadline", "지원서 접수", dl("2026-11-20", "2026-12-03", "11:00")],
    ["coding_test", "온라인 코딩테스트", day("2026-12-06", "10:00")],
    ["test_result", "코딩테스트 결과 발표", part("2026-12", "중순")],
    ["interview_1", "1차 면접", tbd("결과 발표 시 안내")],
  ] },
  { id: "p09", today: "2026-11-20", head: `[LG CNS] DX 신입사원 채용 — ${V}`, extra: [], stages: [
    ["document_deadline", "서류 접수", dl("2026-11-21", "2026-12-05", "17:00")],
    ["written_test", "인적성검사", day("2026-12-14")],
    ["interview_1", "1차 면접", span("2026-12-22", "2026-12-23")],
    ["interview_2", "2차 면접", part("2027-01", "초순")],
    ["final_result", "최종 발표", part("2027-01", "하순")],
  ] },
  { id: "p10", today: "2026-11-20", head: `[KB국민은행] 신입행원 IT 부문 — ${V}`, extra: ["■ 채용인원: 0명"], stages: [
    ["document_deadline", "원서 접수", dl("2026-11-25", "2026-12-07", "15:00")],
    ["ai_assessment", "AI 역량검사", span("2026-12-09", "2026-12-10")],
    ["written_test", "필기전형", day("2026-12-20")],
    ["interview_1", "1차 면접", tbd("필기 합격자에 한해 개별 안내")],
  ] },
  { id: "p11", today: "2026-12-01", head: `[하나은행] 디지털 신입 수시채용 — ${V}`, extra: [], stages: [
    ["document_deadline", "서류 접수", dl("2026-12-01", "2026-12-11", "17:00")],
    ["document_result", "서류 합격자 발표", part("2026-12", "하순")],
    ["interview_1", "실무진 면접", part("2027-01", "초순")],
    ["interview_2", "임원 면접", part("2027-01", "중순")],
    ["final_result", "최종 합격자 발표", part("2027-01", "하순")],
  ] },
  { id: "p12", today: "2026-12-01", head: `[가상핀테크] 백엔드 엔지니어 신입 — 가상 기업`, extra: ["■ 근무형태: 정규직"], stages: [
    ["document_deadline", "지원 마감", dl("2026-12-01", "2026-12-15")],
    ["coding_test", "과제 전형", span("2026-12-18", "2026-12-21")],
    ["interview_1", "기술 면접", tbd("과제 통과자 개별 연락")],
  ] },
  { id: "p13", today: "2026-12-01", head: `[쿠팡] Software Engineer 신입 — ${V}`, extra: [], stages: [
    ["document_deadline", "서류 접수", dl("2026-12-01", "2026-12-14", "23:59")],
    ["coding_test", "온라인 코딩테스트", day("2026-12-19", "09:00")],
    ["interview_1", "1차 면접", part("2027-01", "초순")],
    ["final_result", "최종 결과 안내", tbd("면접 후 2주 이내 개별 안내")],
  ] },
  { id: "p14", today: "2026-12-01", head: `[가상데이터랩] 데이터 엔지니어 신입 — 가상 기업`, extra: ["■ 근무지: 판교"], stages: [
    ["document_deadline", "서류 접수", dl("2026-12-02", "2026-12-09", "18:00")],
    ["document_result", "서류 결과 발표", day("2026-12-14")],
    ["interview_1", "1차 면접", span("2026-12-17", "2026-12-18")],
    ["interview_2", "2차 면접", day("2026-12-28", "15:00")],
    ["final_result", "최종 발표", part("2027-01", "초순")],
  ] },
  { id: "p15", today: "2026-12-01", head: `[우리FIS] IT 신입 공개채용 — ${V}`, extra: [], stages: [
    ["document_deadline", "입사지원", dl("2026-12-03", "2026-12-16", "17:00")],
    ["ai_assessment", "AI역량검사", span("2026-12-18", "2026-12-19")],
    ["written_test", "필기시험", day("2027-01-09")],
    ["interview_1", "면접", part("2027-01", "하순")],
  ] },
];

// ── 공공 15건 (잡알리오 형식을 흉내 낸 가상 기관) ─────────────
const publicNames = [
  "한국가상전력공사", "국립가상데이터진흥원", "가상도시철도공사", "한국가상수자원공사", "가상정보통신진흥원",
  "가상주택금융공사", "가상연금관리공단", "가상국토정보공사", "가상관광공사", "가상환경공단",
  "가상신용보증기금", "가상산업인력공단", "가상우정정보센터", "가상교통안전공단", "가상예금보험공사",
];
const publicPostings: Posting[] = publicNames.map((name, i) => {
  const id = `p${String(16 + i).padStart(2, "0")}`;
  const late = i >= 8; // 뒤쪽은 12월 공고
  const today = late ? "2026-12-01" : "2026-11-20";
  const open = late ? "2026-12-02" : "2026-11-23";
  const close = late ? `2026-12-${String(10 + (i % 4)).padStart(2, "0")}` : `2026-12-0${(i % 5) + 1}`;
  const exam = late ? `2026-12-${String(19 + (i % 3)).padStart(2, "0")}` : `2026-12-${String(12 + (i % 3)).padStart(2, "0")}`;
  const stages: Stage[] = [
    ["document_deadline", "원서접수", dl(open, close, i % 2 ? "18:00" : "15:00")],
    ["written_test", i % 3 === 0 ? "NCS 직업기초능력평가" : "필기시험", day(exam)],
  ];
  // 표현을 바꿔가며: 필기 발표 날짜 명시 / 범위 / 미정
  if (i % 3 === 0) stages.push(["test_result", "필기 합격자 발표", day(late ? "2026-12-28" : "2026-12-22")]);
  else if (i % 3 === 1) stages.push(["test_result", "필기 합격자 발표", part(late ? "2027-01" : "2026-12", late ? "초순" : "하순")]);
  else stages.push(["test_result", "필기 합격자 발표", tbd("홈페이지 공지 예정")]);
  stages.push(["interview_1", i % 2 ? "면접전형" : "직무면접", i % 4 === 3 ? tbd("필기 합격자 대상 별도 공지") : part("2027-01", late ? "중순" : "초순")]);
  stages.push(["final_result", "최종 합격자 발표", i % 5 === 4 ? part("2027-02", "중") : part("2027-01", late ? "하순" : "중")]);
  return {
    id, today,
    head: `[${name}] 2026년 하반기 신입사원(전산·IT) 채용 공고 — 가상 기관`,
    extra: ["■ 채용형태: 정규직(수습 3개월)", `■ 근무지: ${["서울", "대전", "세종", "부산", "광주"][i % 5]}`],
    stages,
  };
});

function writePostings() {
  const dir = join(root, "postings");
  mkdirSync(dir, { recursive: true });
  const prev = readFileSync(join(dir, "answers.jsonl"), "utf8").split("\n").find((l) => l.includes('"id":"p01"'));
  const lines = prev ? [prev] : [];
  [...privatePostings, ...publicPostings].forEach((p, idx) => {
    const style = idx; // 공고마다 날짜 표기 바꾸기
    const body = [
      p.head,
      ...p.extra,
      `■ 전형절차: ${p.stages.map((s) => s[1]).join(" → ")}`,
      ...p.stages.map(([, label, e]) => `■ ${label}: ${render(e, style)}`),
      "※ 일정은 기관 사정에 따라 변경될 수 있습니다.",
    ].join("\n");
    writeFileSync(join(dir, `${p.id}.txt`), body + "\n");
    lines.push(JSON.stringify({ id: p.id, today: p.today, stages: p.stages.map(([t, , e]) => ({ stage_type: t, ...answer(e) })) }));
  });
  writeFileSync(join(dir, "answers.jsonl"), lines.join("\n") + "\n");
  return lines.length;
}

// ── 안내 메일 20건 ───────────────────────────────────────────
type NoticeAns = { result: "pass" | "fail" | "schedule_only" | "unknown"; next: { stage_type: T; date: string | null; time: string | null } | null };
type Notice = { id: string; today: string; text: string; ans: NoticeAns };
const PERSON = "홍길동님"; // 가상 인물 (maskPII 확인용)
const sign = (c: string) => `\n\n${c} 채용담당자 드림\n문의: recruit@example.com / 010-0000-0000`;

const notices: Notice[] = [
  { id: "n01", today: "2026-12-14", text: `[토스뱅크] ${PERSON}, 서류전형 합격을 축하드립니다.\n1차 기술 면접은 12월 18일(금) 14:00, 화상으로 진행됩니다.${sign("토스뱅크")}`,
    ans: { result: "pass", next: { stage_type: "interview_1", date: "2026-12-18", time: "14:00" } } },
  { id: "n02", today: "2026-12-15", text: `안녕하세요 ${PERSON}. SK하이닉스입니다.\nSKCT 결과 합격하셨습니다. 1차 면접: 12/22(화) 10:00 / 이천캠퍼스 대면.${sign("SK하이닉스")}`,
    ans: { result: "pass", next: { stage_type: "interview_1", date: "2026-12-22", time: "10:00" } } },
  { id: "n03", today: "2026-12-16", text: `[신한은행] ${PERSON} 귀하\n아쉽게도 이번 서류전형에서 좋은 소식을 전해드리지 못하게 되었습니다. 지원해 주셔서 감사합니다.${sign("신한은행")}`,
    ans: { result: "fail", next: null } },
  { id: "n04", today: "2026-12-11", text: `[현대자동차] 서류전형 합격 안내\n${PERSON}, 서류전형에 합격하셨습니다.\n1차 면접 일시: 2026년 12월 17일 오전 10시 (양재 본사)${sign("현대자동차")}`,
    ans: { result: "pass", next: { stage_type: "interview_1", date: "2026-12-17", time: "10:00" } } },
  { id: "n05", today: "2026-12-08", text: `[네이버] 코딩테스트 결과 안내\n${PERSON}, 코딩테스트를 통과하셨습니다. 1차 면접 일정은 추후 별도로 안내드리겠습니다.${sign("네이버")}`,
    ans: { result: "pass", next: { stage_type: "interview_1", date: null, time: null } } },
  { id: "n06", today: "2026-12-09", text: `[카카오뱅크] 1차 인터뷰 일정 변경 안내\n${PERSON}, 내부 사정으로 1차 인터뷰가 12월 16일(수) 15:30으로 변경되었습니다. 양해 부탁드립니다.${sign("카카오뱅크")}`,
    ans: { result: "schedule_only", next: { stage_type: "interview_1", date: "2026-12-16", time: "15:30" } } },
  { id: "n07", today: "2026-12-20", text: `[LG CNS] 인적성검사 결과 안내\n안타깝게도 이번에는 함께하지 못하게 되었습니다. ${PERSON}의 앞날을 응원합니다.${sign("LG CNS")}`,
    ans: { result: "fail", next: null } },
  { id: "n08", today: "2026-12-04", text: `[삼성전자] GSAT 응시 안내\n${PERSON}, GSAT 온라인 응시가 12/12(토) 09:00에 시작됩니다. 예비소집은 12/11(금) 오후 2시입니다.${sign("삼성전자")}`,
    ans: { result: "schedule_only", next: { stage_type: "written_test", date: "2026-12-12", time: "09:00" } } },
  { id: "n09", today: "2026-12-23", text: `[한국가상전력공사] 필기시험 합격자 안내 (가상 기관)\n${PERSON}, 필기시험에 합격하셨습니다.\n직무면접: 2027. 1. 6.(수) 13:00, 본사 인재개발원${sign("한국가상전력공사")}`,
    ans: { result: "pass", next: { stage_type: "interview_1", date: "2027-01-06", time: "13:00" } } },
  { id: "n10", today: "2026-12-29", text: `[국립가상데이터진흥원] 필기전형 결과 (가상 기관)\n${PERSON}은 금번 필기전형에서 불합격하였음을 알려드립니다.${sign("국립가상데이터진흥원")}`,
    ans: { result: "fail", next: null } },
  { id: "n11", today: "2026-12-24", text: `[LG CNS] 1차 면접 결과 안내\n${PERSON}, 1차 면접에 합격하셨습니다! 2차 면접은 1월 5일(화) 오후 4시에 진행됩니다.${sign("LG CNS")}`,
    ans: { result: "pass", next: { stage_type: "interview_2", date: "2027-01-05", time: "16:00" } } },
  { id: "n12", today: "2027-01-22", text: `[하나은행] 최종 합격을 축하드립니다\n${PERSON}, 최종 합격하셨습니다. 입행 관련 서류는 별도 안내 예정입니다.${sign("하나은행")}`,
    ans: { result: "pass", next: null } },
  { id: "n13", today: "2026-12-10", text: `[KB국민은행] AI 역량검사 응시 안내\n응시 기간: 12.9(수) 10:00 ~ 12.10(목) 18:00. 기간 내 1회만 응시 가능합니다.${sign("KB국민은행")}`,
    ans: { result: "schedule_only", next: { stage_type: "ai_assessment", date: "2026-12-09", time: "10:00" } } },
  { id: "n14", today: "2026-12-15", text: `[가상데이터랩] 서류 결과 안내 (가상 기업)\n${PERSON}, 서류 검토 결과 1차 면접 대상자로 선정되셨습니다. 면접일: 12월 17일 11:00${sign("가상데이터랩")}`,
    ans: { result: "pass", next: { stage_type: "interview_1", date: "2026-12-17", time: "11:00" } } },
  { id: "n15", today: "2026-12-21", text: `[쿠팡] 코딩테스트 결과\n이번 전형에서는 아쉽게도 다음 단계로 모시지 못하게 되었습니다.${sign("쿠팡")}`,
    ans: { result: "fail", next: null } },
  { id: "n16", today: "2026-12-22", text: `[토스뱅크] 1차 면접 합격 안내\n${PERSON}, 1차 기술 면접 통과를 축하드립니다. 2차 컬처핏 면접은 12/30(수) 11:00 역삼 오피스에서 진행됩니다.${sign("토스뱅크")}`,
    ans: { result: "pass", next: { stage_type: "interview_2", date: "2026-12-30", time: "11:00" } } },
  { id: "n17", today: "2026-12-16", text: `[가상도시철도공사] 면접 장소 안내 (가상 기관)\n${PERSON}, 1월 7일(목) 오전 9시 30분 면접 장소가 본사 3층 대회의실로 확정되었습니다.${sign("가상도시철도공사")}`,
    ans: { result: "schedule_only", next: { stage_type: "interview_1", date: "2027-01-07", time: "09:30" } } },
  { id: "n18", today: "2026-12-26", text: `[가상핀테크] 과제 전형 결과 (가상 기업)\n과제 통과를 축하드립니다. 기술 면접은 담당자가 개별 연락드려 일정을 조율할 예정입니다.${sign("가상핀테크")}`,
    ans: { result: "pass", next: { stage_type: "interview_1", date: null, time: null } } },
  { id: "n19", today: "2027-01-12", text: `[삼성전자] 면접 결과 안내\n${PERSON}, 면접 전형 결과 불합격하셨습니다. 지원에 감사드립니다.${sign("삼성전자")}`,
    ans: { result: "fail", next: null } },
  { id: "n20", today: "2026-12-14", text: `[우리FIS] 서류전형 결과 안내\n${PERSON}, 서류전형에 합격하셨습니다. AI역량검사는 12.18(금) 09:00 ~ 12.19(토) 23:59 사이에 응시해 주세요.${sign("우리FIS")}`,
    ans: { result: "pass", next: { stage_type: "ai_assessment", date: "2026-12-18", time: "09:00" } } },
];

function writeNotices() {
  const dir = join(root, "notices");
  mkdirSync(dir, { recursive: true });
  for (const n of notices) writeFileSync(join(dir, `${n.id}.txt`), n.text + "\n");
  writeFileSync(join(dir, "answers.jsonl"), notices.map((n) => JSON.stringify({ id: n.id, today: n.today, ...n.ans })).join("\n") + "\n");
  return notices.length;
}

console.log(`postings ${writePostings()} · notices ${writeNotices()}`);
