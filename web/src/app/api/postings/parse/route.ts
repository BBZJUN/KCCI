import { z } from "zod";
import { parsePosting } from "@/lib/agent/parsePosting";

const Body = z.object({
  text: z.string().min(20, "공고 원문이 너무 짧습니다"),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sourceUrl: z.string().url().optional(),
});

// posting_cache(원문 해시)에 있으면 LLM 호출 없이 재사용 (src/lib/agent/cache.ts)
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청" }, { status: 400 });
  const { text, sourceUrl, today = new Date().toISOString().slice(0, 10) } = parsed.data;
  try {
    return Response.json(await parsePosting(text, today, sourceUrl));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
