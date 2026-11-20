import { z } from "zod";
import { detectConflicts } from "@/lib/agent/detectConflict";

const Event = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["application", "certificate", "personal"]),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: z.enum(["high", "mid", "low"]),
});
const Body = z.object({ events: z.array(Event) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  return Response.json({ conflicts: detectConflicts(parsed.data.events) });
}
