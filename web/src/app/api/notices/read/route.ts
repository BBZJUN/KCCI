import { z } from "zod";
import { readNotice, maskPII } from "@/lib/agent/readNotice";
import { ruleNotice } from "@/lib/agent/fallback";
import { evidenceInSource } from "@/lib/agent/evidence";
import { llmConfigured } from "@/lib/agent/llm";
import { allowLLM } from "@/lib/rateLimit";

const Body = z.object({
  text: z.string().min(10, "안내 원문이 너무 짧습니다").max(20000, "안내 원문이 너무 깁니다"),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// 원문은 저장하지 않는다. 판독 결과(일정·근거 문장)만 반환하고, 반영은 사용자 승인 후 클라이언트가 요청한다.
// AI를 못 쓰면 시연용 안내는 미리 판독한 결과, 그 밖에는 규칙 판독(mode: "rule")으로 응답.
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청" }, { status: 400 });
  const { text, today = new Date().toISOString().slice(0, 10) } = parsed.data;

  let note = !llmConfigured() ? "AI 키가 설정되지 않음" : !allowLLM(request) ? "요청이 많아 잠시 AI 대신 처리" : null;
  if (!note) {
    try {
      return Response.json({ ...(await readNotice(text, today, { web: true })), mode: "ai" });
    } catch (e) {
      console.error("[llm]", (e as Error).message);
      note = "AI 응답 지연·오류";
    }
  }
  const reading = ruleNotice(text, today);
  return Response.json({ reading, evidence_missing: !evidenceInSource(reading.evidence, maskPII(text)) && !evidenceInSource(reading.evidence, text), mode: "rule", note });
}
