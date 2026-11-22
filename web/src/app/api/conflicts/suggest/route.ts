import { z } from "zod";
import { ConflictAdvice } from "@/lib/schemas";
import { llmConfigured, structured, WEB_BUDGET } from "@/lib/agent/llm";
import { allowLLM } from "@/lib/rateLimit";
import { pickTarget, templateAdvice } from "@/lib/agent/conflictAdvice";

const Event = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["application", "certificate", "personal"]),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: z.enum(["high", "mid", "low"]),
});
const Body = z.object({ a: Event, b: Event, overlapStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

const SYSTEM = `너는 취업준비생의 일정 충돌 조정을 돕는 비서다. 충돌 여부와 조정 후보는 이미 코드가 판단했다.
규칙:
- target_id는 반드시 suggested_target과 같게 둔다 (바꾸지 않는다).
- message는 그 일정이 기업 전형이면 채용담당자에게 보낼 정중한 일정 조정 문의, 개인·자격증 일정이면 본인용 이동 메모로 쓴다.
- 다른 기업 이름은 밝히지 않는다 ('다른 기업의 확정된 전형'으로 표현). 지원자 이름·연락처를 지어내지 않는다.
- 날짜를 새로 만들어 약속하지 않는다.`;

/** 충돌 1건의 조정 문구 제안. AI는 문구만 쓰고, 반영은 사용자가 직접 한다. 키가 없으면 템플릿으로 응답. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  const c = parsed.data;
  const fallback = templateAdvice(c);
  const { target, keep } = pickTarget(c);
  const keepName = keep.title.split(" ")[0];
  // 개인·자격증 일정을 옮기는 경우는 정해진 안내 문구로 충분 → AI 호출 안 함
  if (target.category !== "application") return Response.json({ ...fallback, source: "template" });
  if (!llmConfigured() || !allowLLM(request)) return Response.json({ ...fallback, source: "template" });
  try {
    const ai = await structured({
      kind: "reason",
      system: SYSTEM,
      user: JSON.stringify({ overlap_date: c.overlapStart, events: [c.a, c.b], suggested_target: target.id }),
      schema: ConflictAdvice,
      name: "conflict_advice",
      budget: WEB_BUDGET,
    });
    // 다른 기업명이 새어 나가면 템플릿으로 대체 (가드)
    if (keep.category === "application" && keepName.length >= 2 && ai.message.includes(keepName)) return Response.json({ ...fallback, source: "template", note: "guard" });
    // 대상은 코드 판단을 따른다
    return Response.json({ ...ai, target_id: target.id, source: "ai" });
  } catch (e) {
    return Response.json({ ...fallback, source: "template", note: (e as Error).message });
  }
}
