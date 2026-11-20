import { z } from "zod";
import { bearer, itemsToStageRows, rest, supabaseConfig, type StageRow } from "@/lib/remote";

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
const Body = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  color: z.string(),
  contentHash: z.string().nullable().optional(),
  items: z.array(Item).min(1),
});

/** 수락한 공고 1건을 applications + stages로 저장 (사용자가 '캘린더에 추가'를 누른 뒤에만 호출) */
export async function POST(request: Request) {
  if (!supabaseConfig()) return Response.json({ error: "Supabase가 설정되지 않았습니다. 지금은 브라우저 저장소를 사용합니다." }, { status: 501 });
  const auth = bearer(request);
  if (!auth) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청" }, { status: 400 });
  const { company, title, color, contentHash, items } = parsed.data;
  try {
    const [app] = await rest<{ id: string }[]>("applications", auth.token, {
      method: "POST",
      body: JSON.stringify({ user_id: auth.userId, company, title, color, content_hash: contentHash ?? null }),
    });
    const rows: StageRow[] = itemsToStageRows(items).map((r) => ({ ...r, application_id: app.id }));
    const stages = await rest<StageRow[]>("stages", auth.token, { method: "POST", body: JSON.stringify(rows) });
    return Response.json({ id: app.id, stages: stages.length }, { status: 201 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
