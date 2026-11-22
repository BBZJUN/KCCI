import type { ExtractedStage, NoticeReading, PostingExtraction, StageType } from "../schemas";
import { POSTINGS } from "../postings";
import { SAMPLE_EXTRACTION, SAMPLE_NOTICES, SAMPLE_POSTING_TEXT } from "../demo";
import { normalizePosting } from "./cache";
import { normalizeStages } from "./normalizeStages";

/**
 * LLM을 못 쓸 때(키 없음·무료 한도·공급자 혼잡)의 예비 경로. MVP 시연이 멈추지 않게 한다.
 * 1) 시연용 공고·안내 원문이면 미리 분석해 둔 결과 (공유 캐시에 이미 있다고 가정한 값)
 * 2) 아니면 줄 단위 규칙 추출 — 정확도는 LLM보다 낮으므로 화면에 '규칙 기반 예비 결과'로 표시
 */

// ── 날짜·시각 ──────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const DATE = /(?:(\d{4})\s*[년.\-/]\s*)?(\d{1,2})\s*(?:월\s*|[./]\s*)(\d{1,2})(?:\s*일|\.?)(?![\d:])/g;
const PART = /(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(초순|중순|하순|말|중)/;
const TIME = /(?:(\d{1,2}):(\d{2}))|(?:(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?)/;

function inferYear(m: number, d: number, today: string, y?: string): string {
  if (y) return `${y}-${pad(m)}-${pad(d)}`;
  let year = Number(today.slice(0, 4));
  const iso = `${year}-${pad(m)}-${pad(d)}`;
  // 오늘보다 두 달 넘게 이전이면 다음 해 (11월에 쓴 '1월 중' 같은 경우)
  if (Date.parse(iso) < Date.parse(today) - 60 * 864e5) year += 1;
  return `${year}-${pad(m)}-${pad(d)}`;
}

function datesIn(text: string, today: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(DATE)) {
    const mo = Number(m[2]), d = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) out.push(inferYear(mo, d, today, m[1]));
  }
  return out;
}

export function timeIn(text: string): string | null {
  const m = text.match(TIME);
  if (!m) return null;
  if (m[1]) return `${pad(Number(m[1]))}:${m[2]}`;
  let h = Number(m[4]);
  if (m[3] === "오후" && h < 12) h += 12;
  return `${pad(h)}:${pad(Number(m[5] ?? 0))}`;
}

// ── 전형 유형 ──────────────────────────────────────────────
const SKIP = /전형\s*절차|근무|채용\s*형태|채용\s*인원|모집|지원\s*자격|우대|Location|직군|근무형태|문의/;
function stageTypeOf(label: string): StageType | null {
  const l = label.replace(/\s+/g, "");
  const announce = /발표|결과/.test(l);
  if (/최종/.test(l)) return "final_result";
  if (announce && /서류/.test(l)) return "document_result";
  if (announce && /필기|코딩|SKCT|GSAT|인적성|NCS|테스트|과제|역량/.test(l)) return "test_result";
  if (announce && /면접|인터뷰/.test(l)) return /2차|임원/.test(l) ? "final_result" : "interview_1_result";
  if (/접수|지원|원서|마감|입사지원/.test(l)) return "document_deadline";
  if (/AI.?역량|역검/i.test(l)) return "ai_assessment";
  if (/코딩|과제|온라인평가|코딩평가/.test(l)) return "coding_test";
  if (/필기|NCS|인적성|GSAT|SKCT|직업기초/.test(l)) return "written_test";
  if (/2차|임원|컬처/.test(l)) return "interview_2";
  if (/면접|인터뷰/.test(l)) return "interview_1";
  return null;
}

/** 줄 단위 규칙 추출: '라벨: 날짜 표현' 형태의 공고 줄만 읽는다 */
export function ruleExtract(text: string, today: string): PostingExtraction {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const head = lines[0] ?? "";
  const company = head.match(/\[([^\]]+)\]/)?.[1] ?? "회사명 확인 필요";
  const title = head.replace(/\[[^\]]+\]\s*/, "").replace(/\s*[—-]\s*(시연용 가상 공고|가상 기관|가상 기업).*$/, "").trim() || "공고";
  const stages: ExtractedStage[] = [];
  for (const line of lines.slice(1)) {
    const body = line.replace(/^[■▶•\-*·\s]+/, "");
    const idx = body.search(/[:：]/);
    if (idx < 0) continue;
    const label = body.slice(0, idx).trim(), value = body.slice(idx + 1).trim();
    if (SKIP.test(label)) continue;
    const stage_type = stageTypeOf(label);
    if (!stage_type) continue;
    const dates = datesIn(value, today);
    const part = value.match(PART);
    let stage: ExtractedStage;
    if (dates.length > 0) {
      stage = { stage_name: label, stage_type, kind: "fixed", start: dates[0], end: dates.at(-1)!, time: timeIn(value), evidence: line };
    } else if (part) {
      const mo = Number(part[2]);
      const y = Number(inferYear(mo, 1, today, part[1]).slice(0, 4));
      const [a, b] = part[3] === "초순" ? [1, 10] : part[3] === "중순" ? [11, 20] : part[3] === "하순" || part[3] === "말" ? [21, lastDay(y, mo)] : [1, lastDay(y, mo)];
      stage = { stage_name: label, stage_type, kind: "range", start: `${y}-${pad(mo)}-${pad(a)}`, end: `${y}-${pad(mo)}-${pad(b)}`, time: null, evidence: line };
    } else {
      stage = { stage_name: label, stage_type, kind: "tbd", start: null, end: null, time: null, evidence: line };
    }
    stages.push(stage);
  }
  return { company, title, stages: normalizeStages(stages) };
}

/** 시연용 공고면 미리 분석한 결과 */
export function knownPosting(text: string): PostingExtraction | null {
  const n = normalizePosting(text);
  if (n === normalizePosting(SAMPLE_POSTING_TEXT)) return SAMPLE_EXTRACTION;
  return POSTINGS.find((p) => normalizePosting(p.text) === n)?.extraction ?? null;
}

// ── 안내 메일 ──────────────────────────────────────────────
function nextStageType(text: string): StageType {
  if (/2차|임원|컬처/.test(text)) return "interview_2";
  if (/면접|인터뷰/.test(text)) return "interview_1";
  if (/AI\s*역량|역량검사/i.test(text)) return "ai_assessment";
  if (/코딩|과제/.test(text)) return "coding_test";
  if (/GSAT|필기|인적성|NCS|SKCT/.test(text)) return "written_test";
  return "other";
}

export function ruleNotice(text: string, today: string): NoticeReading {
  const known = SAMPLE_NOTICES.find((s) => normalizePosting(s.text) === normalizePosting(text));
  if (known) return known.reading;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const company = text.match(/\[([^\]]+)\]/)?.[1]?.replace(/\s*\(.*\)$/, "") ?? "회사명 확인 필요";
  const fail = /불합격|아쉽게도|함께하지 못|모시지 못|좋은 소식을 전해드리지/.test(text);
  const final = /최종\s*합격/.test(text) && !fail;
  const pass = !fail && /합격|통과|선정|축하/.test(text);
  const result: NoticeReading["result"] = fail ? "fail" : pass ? "pass" : /일정|변경|응시|장소|안내/.test(text) ? "schedule_only" : "unknown";
  // 날짜가 있는 첫 줄을 다음 전형 근거로 본다
  const dated = lines.find((l) => datesIn(l, today).length > 0 && !/문의/.test(l));
  const later = /추후|별도|개별|조율|예정입니다/.test(text);
  let next: NoticeReading["next_stage"] = null;
  if (!fail && !final && (dated || later)) {
    const basis = dated ?? lines.find((l) => /추후|별도|개별|조율/.test(l)) ?? "";
    next = {
      stage_name: basis.match(/(1차|2차)?\s*(기술\s*|컬처핏\s*|직무\s*|임원\s*)?(면접|인터뷰)|AI\s*역량검사|코딩테스트|GSAT|필기시험|인적성검사/)?.[0]?.trim() ?? "다음 전형",
      stage_type: nextStageType(basis) === "other" ? nextStageType(text) : nextStageType(basis),
      date: dated ? datesIn(dated, today)[0] : null,
      time: dated ? timeIn(dated) : null,
      mode: /화상|온라인/.test(basis) ? "화상" : /대면|본사|캠퍼스|오피스|회의실/.test(basis) ? "대면" : null,
    };
  }
  return {
    company,
    result,
    about_stage: text.match(/(서류|필기|코딩테스트|SKCT|GSAT|인적성|1차 면접|면접|과제)\s*(전형)?/)?.[0] ?? "",
    next_stage: next,
    evidence: dated ?? lines.find((l) => /합격|불합격|아쉽|변경/.test(l)) ?? lines[0] ?? "",
  };
}
