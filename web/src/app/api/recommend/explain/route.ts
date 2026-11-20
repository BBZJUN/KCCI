import { z } from "zod";
import { structured } from "@/lib/agent/llm";

const Body = z.object({
  posting: z.object({ company: z.string(), title: z.string(), jobTags: z.array(z.string()), region: z.string(), preferredCerts: z.array(z.string()), stageSummary: z.string() }),
  profile: z.object({ jobs: z.array(z.string()), regions: z.array(z.string()), certs: z.array(z.string()) }),
  ruleReasons: z.array(z.string()),
});
const Out = z.object({ reasons: z.array(z.string()).describe("각 25자 이내, 최대 3개") });

/** 추천 이유를 지원자 관점 문장으로 다듬는다 (REASON 모델). 규칙 점수에 없는 사실은 추가하지 않는다. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  try {
    const out = await structured({
      kind: "reason",
      system: "너는 취업 준비생에게 공고 추천 이유를 짧게 설명한다. 주어진 규칙 근거(ruleReasons)와 공고·프로필 정보에 있는 사실만 사용하고, 없는 사실을 지어내지 않는다. 한국어, 각 25자 이내, 최대 3개.",
      user: JSON.stringify(parsed.data),
      schema: Out,
      name: "recommend_reasons",
    });
    return Response.json(out);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
