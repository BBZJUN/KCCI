import { z } from "zod";
import { readNotice } from "@/lib/agent/readNotice";

const Body = z.object({
  text: z.string().min(10, "안내 원문이 너무 짧습니다"),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// 원문은 저장하지 않는다. 판독 결과(일정·근거 문장)만 반환하고, 반영은 사용자 승인 후 클라이언트가 요청한다.
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청" }, { status: 400 });
  const { text, today = new Date().toISOString().slice(0, 10) } = parsed.data;
  try {
    return Response.json(await readNotice(text, today));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
