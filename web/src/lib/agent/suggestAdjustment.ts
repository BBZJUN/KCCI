import { ConflictAdvice, type CalendarEvent } from "../schemas";
import { structured, WEB_BUDGET } from "./llm";
import { pickTarget, templateAdvice } from "./conflictAdvice";

const SYSTEM = `너는 취업준비생의 일정 충돌 조정을 돕는 비서다. 충돌 여부와 조정 후보는 이미 코드가 판단했다.
규칙:
- target_id는 반드시 suggested_target과 같게 둔다 (바꾸지 않는다).
- message는 그 일정이 기업 전형이면 채용담당자에게 보낼 정중한 일정 조정 문의로 쓴다.
- 다른 기업 이름은 밝히지 않는다 ('다른 기업의 확정된 전형'으로 표현). 지원자 이름·연락처를 지어내지 않는다.
- 날짜를 새로 만들어 약속하지 않는다.`;

export type Advice = ConflictAdvice & { source: "ai" | "template" };

/**
 * 충돌 1건의 조정 문구 (도구 suggest_adjustment). 조정 대상은 코드 규칙(pickTarget), AI는 문구만.
 * 개인·자격증 일정을 옮기는 경우와 AI를 못 쓰는 경우는 기본 문구.
 */
export async function suggestAdjustment(c: { a: CalendarEvent; b: CalendarEvent; overlapStart: string }, useAI: boolean): Promise<Advice> {
  const fallback: Advice = { ...templateAdvice(c), source: "template" };
  const { target, keep } = pickTarget(c);
  if (!useAI || target.category !== "application") return fallback;
  try {
    const ai = await structured({
      kind: "reason",
      system: SYSTEM,
      user: JSON.stringify({ overlap_date: c.overlapStart, events: [c.a, c.b], suggested_target: target.id }),
      schema: ConflictAdvice,
      name: "conflict_advice",
      budget: WEB_BUDGET,
    });
    const keepName = keep.title.split(" ")[0];
    // 다른 기업명이 새어 나가면 기본 문구로 대체 (가드)
    if (keep.category === "application" && keepName.length >= 2 && ai.message.includes(keepName)) return fallback;
    return { ...ai, target_id: target.id, source: "ai" };
  } catch (e) {
    console.error("[llm]", (e as Error).message);
    return fallback;
  }
}
