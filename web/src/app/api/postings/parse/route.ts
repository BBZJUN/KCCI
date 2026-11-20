import { z } from "zod";
import { parsePosting } from "@/lib/agent/parsePosting";

const Body = z.object({
  text: z.string().min(20, "공고 원문이 너무 짧습니다"),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sourceUrl: z.string().url().optional(),
});

// TODO(P0): posting_cache(원문 해시) 조회 → 있으면 재사용, 없으면 분석 후 저장 (docs/agent-spec.md '공유 캐시')
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청" }, { status: 400 });
  const { text, today = new Date().toISOString().slice(0, 10) } = parsed.data;
  try {
    return Response.json(await parsePosting(text, today));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
