import type { PostingExtraction } from "./schemas";

/**
 * 추천 후보 공고 (시연용 가상 공고).
 * 실제 서비스: 공공기관은 잡알리오 API, 민간은 사용자가 크롬 확장으로 담은 공고.
 * extraction은 공유 캐시(posting_cache)에 이미 분석돼 있다고 가정한 결과 — 같은 공고는 1회만 분석.
 */
export type Posting = {
  id: string;
  company: string;
  title: string;
  initial: string;
  color: string;
  jobTags: string[];
  region: string;
  preferredCerts: string[];
  deadline: string; // YYYY-MM-DD
  source: "잡알리오 공공데이터" | "사용자 수집";
  text: string;
  extraction: PostingExtraction;
};

const S = (stage_name: string, stage_type: PostingExtraction["stages"][number]["stage_type"], kind: "fixed" | "range" | "tbd", start: string | null, end: string | null, evidence: string, time: string | null = null) =>
  ({ stage_name, stage_type, kind, start, end, time, evidence });

export const POSTINGS: Posting[] = [
  {
    id: "google-swe",
    company: "구글",
    title: "Software Engineer, New Grad (서울)",
    initial: "G",
    color: "#16A34A",
    jobTags: ["백엔드", "서버", "알고리즘"],
    region: "서울",
    preferredCerts: [],
    deadline: "2026-12-14",
    source: "사용자 수집",
    text: `[구글] Software Engineer, New Grad (서울) — 시연용 가상 공고
지원 마감: 12월 14일(월) 23:59
온라인 코딩 인터뷰: 12월 19일(토)
기술 면접: 1월 초 예정
최종 결과: 추후 안내`,
    extraction: {
      company: "구글",
      title: "Software Engineer, New Grad (서울) · 시연용 가상 공고",
      stages: [
        S("서류 마감", "document_deadline", "fixed", "2026-12-14", "2026-12-14", "지원 마감: 12월 14일(월) 23:59", "23:59"),
        S("코딩 인터뷰", "coding_test", "fixed", "2026-12-19", "2026-12-19", "온라인 코딩 인터뷰: 12월 19일(토)"),
        S("기술 면접", "interview_1", "range", "2027-01-01", "2027-01-10", "기술 면접: 1월 초 예정"),
        S("최종 결과", "final_result", "tbd", null, null, "최종 결과: 추후 안내"),
      ],
    },
  },
  {
    id: "shinhan-ict",
    company: "신한은행",
    title: "ICT 수시채용 · 백엔드 개발",
    initial: "신",
    color: "#2A9D8F",
    jobTags: ["백엔드", "서버", "금융IT"],
    region: "서울",
    preferredCerts: ["SQLD", "정보처리기사"],
    deadline: "2026-12-15",
    source: "사용자 수집",
    text: `[신한은행] ICT 수시채용 (백엔드 개발) — 시연용 가상 공고
접수기간: 12.8(화)~12.15(화) 17:00
코딩테스트: 12.20(일) 온라인
1차 면접: 12월 넷째 주 예정
우대사항: SQLD, 정보처리기사`,
    extraction: {
      company: "신한은행",
      title: "ICT 수시채용 (백엔드 개발) · 시연용 가상 공고",
      stages: [
        S("서류 마감", "document_deadline", "fixed", "2026-12-15", "2026-12-15", "접수기간: 12.8(화)~12.15(화) 17:00", "17:00"),
        S("코딩테스트", "coding_test", "fixed", "2026-12-20", "2026-12-20", "코딩테스트: 12.20(일) 온라인"),
        S("1차 면접", "interview_1", "range", "2026-12-21", "2026-12-27", "1차 면접: 12월 넷째 주 예정"),
      ],
    },
  },
  {
    id: "toss-server",
    company: "토스뱅크",
    title: "Server Developer (신입)",
    initial: "토",
    color: "#7B61FF",
    jobTags: ["백엔드", "서버", "핀테크"],
    region: "서울",
    preferredCerts: [],
    deadline: "2026-12-18",
    source: "사용자 수집",
    text: `[토스뱅크] Server Developer (신입) — 시연용 가상 공고
서류 접수: ~12/18(금)
과제 전형: 서류 합격자에게 개별 안내
직무 인터뷰: 추후 안내`,
    extraction: {
      company: "토스뱅크",
      title: "Server Developer (신입) · 시연용 가상 공고",
      stages: [
        S("서류 마감", "document_deadline", "fixed", "2026-12-18", "2026-12-18", "서류 접수: ~12/18(금)"),
        S("과제 전형", "coding_test", "tbd", null, null, "과제 전형: 서류 합격자에게 개별 안내"),
        S("직무 인터뷰", "interview_1", "tbd", null, null, "직무 인터뷰: 추후 안내"),
      ],
    },
  },
  {
    id: "hrdk-it",
    company: "한국산업인력공단",
    title: "2026 하반기 신입 전산직 (공공기관)",
    initial: "공",
    color: "#0EA5E9",
    jobTags: ["전산", "백엔드", "공공"],
    region: "울산",
    preferredCerts: ["정보처리기사"],
    deadline: "2026-12-11",
    source: "잡알리오 공공데이터",
    text: `[한국산업인력공단] 2026 하반기 신입 전산직 채용 — 시연용 가상 공고
원서접수: 12.4(금)~12.11(금) 18:00
필기시험: 12.19(토)
면접시험: 추후 안내
가점: 정보처리기사`,
    extraction: {
      company: "한국산업인력공단",
      title: "2026 하반기 신입 전산직 · 시연용 가상 공고",
      stages: [
        S("서류 마감", "document_deadline", "fixed", "2026-12-11", "2026-12-11", "원서접수: 12.4(금)~12.11(금) 18:00", "18:00"),
        S("필기시험", "written_test", "fixed", "2026-12-19", "2026-12-19", "필기시험: 12.19(토)"),
        S("면접시험", "interview_1", "tbd", null, null, "면접시험: 추후 안내"),
      ],
    },
  },
  {
    id: "hyundai-sw",
    company: "현대자동차",
    title: "SW 개발 신입 (차량 SW 플랫폼)",
    initial: "H",
    color: "#E09F3E",
    jobTags: ["임베디드", "SW", "차량"],
    region: "경기",
    preferredCerts: [],
    deadline: "2026-12-16",
    source: "사용자 수집",
    text: `[현대자동차] SW 개발 신입 (차량 SW 플랫폼) — 시연용 가상 공고
서류 마감: 12월 16일(수)
HMAT: 12월 중순 예정
면접: 추후 안내`,
    extraction: {
      company: "현대자동차",
      title: "SW 개발 신입 (차량 SW 플랫폼) · 시연용 가상 공고",
      stages: [
        S("서류 마감", "document_deadline", "fixed", "2026-12-16", "2026-12-16", "서류 마감: 12월 16일(수)"),
        S("HMAT", "written_test", "range", "2026-12-11", "2026-12-20", "HMAT: 12월 중순 예정"),
        S("면접", "interview_1", "tbd", null, null, "면접: 추후 안내"),
      ],
    },
  },
];
