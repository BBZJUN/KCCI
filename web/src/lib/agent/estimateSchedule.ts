import type { ExtractedStage, PlannedStage, StageType } from "../schemas";
import { evidenceInSource } from "./evidence";

/**
 * 날짜가 없는 단계(tbd)를 앞 단계 기준 기본 간격으로 추정한다.
 * 간격 [최소일, 최대일] — 공고 표본을 모으면 docs/agent-spec.md 기준으로 조정한다.
 * TODO(P1): 같은 기업의 지난 공고 이력이 있으면 그 간격을 우선 사용.
 */
export const DEFAULT_GAP: Record<StageType, [number, number]> = {
  document_deadline: [0, 0],
  ai_assessment: [3, 7],
  coding_test: [3, 10],
  written_test: [7, 14],
  document_result: [7, 14],
  test_result: [5, 10],
  interview_1: [5, 10],
  interview_1_result: [3, 7],
  interview_2: [5, 14],
  final_result: [5, 14],
  other: [3, 10],
};

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function estimateSchedule(stages: ExtractedStage[], source: string): PlannedStage[] {
  const out: PlannedStage[] = [];
  let anchor: string | null = null; // 직전 단계의 (추정) 종료일

  for (const st of stages) {
    const evidence_missing = st.evidence.trim() === "" || !evidenceInSource(st.evidence, source);

    if (st.kind === "fixed" && st.start) {
      const end = st.end ?? st.start;
      out.push({ ...st, end, confidence: evidence_missing ? "mid" : "high", basis: "posting", evidence_missing });
      anchor = end;
      continue;
    }
    if (st.kind === "range" && st.start && st.end) {
      out.push({ ...st, confidence: "mid", basis: "posting", evidence_missing });
      anchor = st.end;
      continue;
    }
    // tbd (또는 날짜가 비어 온 fixed/range) → 규칙 추정
    if (anchor) {
      const [lo, hi] = DEFAULT_GAP[st.stage_type];
      const start = addDays(anchor, lo);
      const end = addDays(anchor, hi);
      out.push({ ...st, kind: "tbd", start, end, confidence: "low", basis: "rule", evidence_missing });
      anchor = end;
    } else {
      // 기준점이 없으면 추정하지 않고 날짜 없이 둔다 (UI: '날짜 미정' 목록)
      out.push({ ...st, kind: "tbd", start: null, end: null, confidence: "low", basis: "rule", evidence_missing });
    }
  }
  return out;
}

/** 확정 정보가 들어오면 해당 단계를 고정하고 뒤 단계 추정을 다시 계산 */
export function confirmStage(plan: PlannedStage[], index: number, date: string, time: string | null, evidence: string): PlannedStage[] {
  const base: ExtractedStage[] = plan.map((p, i) =>
    i === index
      ? { ...p, kind: "fixed", start: date, end: date, time, evidence }
      : i > index && p.basis === "rule"
        ? { ...p, kind: "tbd", start: null, end: null }
        : p,
  );
  const sourceForCheck = plan.map((p) => p.evidence).join("\n") + "\n" + evidence;
  return estimateSchedule(base, sourceForCheck).map((p, i) => (i < index ? plan[i] : p));
}
