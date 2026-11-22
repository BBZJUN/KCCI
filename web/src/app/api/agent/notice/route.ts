import { z } from "zod";
import { runNoticeAgent } from "@/lib/agent/noticeAgent";
import { llmConfigured } from "@/lib/agent/llm";
import { allowLLM } from "@/lib/rateLimit";
import type { CalendarItem } from "@/lib/calendar";

const Item = z.object({
  id: z.string(),
  groupId: z.string(),
  label: z.string(),
  company: z.string().nullable(),
  color: z.string(),
  category: z.enum(["application", "personal", "certificate"]),
  start: z.string(),
  end: z.string(),
  time: z.string().nullable().optional(),
  confidence: z.enum(["high", "mid", "low"]),
  evidence: z.string(),
  status: z.enum(["planned", "confirmed", "done", "cancelled"]),
});
const Body = z
  .object({
    text: z.string().max(20000).optional(),
    image: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, "PNG·JPG·WEBP 이미지만 올릴 수 있어요").max(4_000_000, "이미지가 너무 커요").optional(),
    items: z.array(Item).max(500),
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((b) => (b.text?.trim().length ?? 0) >= 10 || !!b.image, "안내 글(10자 이상)이나 캡처 이미지를 넣어 주세요");

/** 안내 반영 에이전트. 원문·이미지는 저장하지 않고, 결과(변경안·충돌·문구)와 실행 기록만 돌려준다. 반영은 클라이언트가 승인 후. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청" }, { status: 400 });
  const { text, image, items, today = new Date().toISOString().slice(0, 10) } = parsed.data;
  try {
    const result = await runNoticeAgent({ text, image, items: items as CalendarItem[], today, useAI: llmConfigured() && allowLLM(request) });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message, trace: (e as { trace?: unknown }).trace ?? [] }, { status: 422 });
  }
}
