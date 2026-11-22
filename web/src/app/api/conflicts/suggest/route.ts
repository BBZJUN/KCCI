import { z } from "zod";
import { llmConfigured } from "@/lib/agent/llm";
import { allowLLM } from "@/lib/rateLimit";
import { suggestAdjustment } from "@/lib/agent/suggestAdjustment";

const Event = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["application", "certificate", "personal"]),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: z.enum(["high", "mid", "low"]),
});
const Body = z.object({ a: Event, b: Event, overlapStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** 충돌 1건의 조정 문구 제안. AI는 문구만 쓰고, 반영은 사용자가 직접 한다. 키가 없으면 템플릿으로 응답. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  const c = parsed.data;
  return Response.json(await suggestAdjustment(c, llmConfigured() && allowLLM(request)));
}
