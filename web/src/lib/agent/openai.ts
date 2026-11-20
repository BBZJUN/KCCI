import OpenAI from "openai";

let client: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다 (.env.local)");
  client ??= new OpenAI();
  return client;
}

/** 추출용 경량 모델 / 추천 이유 등 문장 품질용 상위 모델 (docs/agent-spec.md '모델 라우팅') */
export function model(kind: "extract" | "reason"): string {
  const m = kind === "extract" ? process.env.OPENAI_MODEL_EXTRACT : process.env.OPENAI_MODEL_REASON;
  if (!m) throw new Error(`OPENAI_MODEL_${kind === "extract" ? "EXTRACT" : "REASON"}가 설정되지 않았습니다 (.env.local)`);
  return m;
}
