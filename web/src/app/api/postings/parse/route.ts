import { z } from "zod";
import { parsePosting } from "@/lib/agent/parsePosting";
import { estimateSchedule } from "@/lib/agent/estimateSchedule";
import { knownPosting, ruleExtract } from "@/lib/agent/fallback";
import { postingHash } from "@/lib/agent/cache";
import { llmConfigured } from "@/lib/agent/llm";
import { allowLLM } from "@/lib/rateLimit";

const Body = z.object({
  text: z.string().min(20, "공고 원문이 너무 짧습니다").max(40000, "공고 원문이 너무 깁니다"),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sourceUrl: z.string().url().optional(),
});

/**
 * 공고 → 전형 일정. 순서: 공유 캐시 → AI(Gemini) → 시연용 공고면 미리 분석한 결과 → 줄 단위 규칙 추출.
 * mode: "ai" | "cache" | "demo" | "rule" — 화면에서 어떤 경로의 결과인지 표시한다.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "잘못된 요청" }, { status: 400 });
  const { text, sourceUrl, today = new Date().toISOString().slice(0, 10) } = parsed.data;

  let note = !llmConfigured() ? "AI 키가 설정되지 않음" : !allowLLM(request) ? "요청이 많아 잠시 AI 대신 처리" : null;
  if (!note) {
    try {
      const r = await parsePosting(text, today, sourceUrl, { web: true });
      return Response.json({ ...r, mode: r.cached ? "cache" : "ai" });
    } catch (e) {
      console.error("[llm]", (e as Error).message);
      note = "AI 응답 지연·오류";
    }
  }
  const known = knownPosting(text);
  const extraction = known ?? ruleExtract(text, today);
  if (!known && extraction.stages.length === 0) return Response.json({ error: "공고에서 전형 일정을 찾지 못했어요. '전형명: 날짜' 줄이 있는 공고 원문을 붙여넣어 주세요." }, { status: 422 });
  return Response.json({ extraction, plan: estimateSchedule(extraction.stages, text), cached: false, hash: postingHash(text), mode: known ? "demo" : "rule", note });
}
