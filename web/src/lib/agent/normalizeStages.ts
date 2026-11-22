import type { ExtractedStage } from "../schemas";

/**
 * LLM 추출 결과를 서비스 규칙에 맞게 정리 (코드 규칙, docs/agent-spec.md '신뢰도 → UI'):
 * 1) 서류 접수 기간 → 캘린더에는 마감일 하루(fixed)만 올린다.
 * 2) 'N월 중'(초·중·하순이 아님) → 그 달 전체 범위. 모델이 '중순'으로 읽는 경우를 바로잡는다.
 * 3) 날짜가 둘 다 적힌 기간('12.7~12.8')은 범위 추정이 아니라 확정(fixed)이다.
 */
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const MONTH_ONLY = /(\d{1,2})\s*월\s*중(?!\s*순)/;
const PART = /(초순|중순|하순|초|말|중)/;
const TWO_DATES = /\d{1,2}\s*[./월]\s*\d{1,2}\s*일?[^~∼\-–]*[~∼\-–]\s*(\d{4}\s*년\s*)?\d{1,2}\s*[./월]\s*\d{1,2}/;

export function normalizeStages(stages: ExtractedStage[]): ExtractedStage[] {
  return stages.map((s) => {
    const out = { ...s };
    if (out.stage_type === "document_deadline" && out.kind !== "tbd") {
      const day = out.end ?? out.start;
      return { ...out, kind: "fixed", start: day, end: day };
    }
    const m = out.evidence.match(MONTH_ONLY);
    if (out.kind === "range" && m && out.start) {
      const y = Number(out.start.slice(0, 4)), mm = Number(m[1]);
      if (Number(out.start.slice(5, 7)) === mm) {
        const ym = `${y}-${String(mm).padStart(2, "0")}`;
        return { ...out, start: `${ym}-01`, end: `${ym}-${String(lastDay(y, mm)).padStart(2, "0")}` };
      }
    }
    if (out.kind === "range" && out.start && out.end && TWO_DATES.test(out.evidence) && !PART.test(out.evidence.replace(/\d+\s*월\s*\d+\s*일/g, ""))) {
      return { ...out, kind: "fixed" };
    }
    return out;
  });
}
