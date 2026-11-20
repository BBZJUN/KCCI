import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { z } from "zod";

/**
 * LLM 호출 공통부 — OpenAI 호환 Chat Completions API 하나로 여러 공급자를 쓴다.
 *   Gemini (무료 등급): LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
 *   Groq   (무료 등급): LLM_BASE_URL=https://api.groq.com/openai/v1
 *   OpenAI          : LLM_BASE_URL 비워 둠
 * 모델명은 하드코딩하지 않는다 (LLM_MODEL_EXTRACT / LLM_MODEL_REASON).
 */
const env = (k: string) => process.env[`LLM_${k}`] || process.env[`OPENAI_${k}`] || "";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  const apiKey = env("API_KEY");
  if (!apiKey) throw new Error("LLM_API_KEY가 설정되지 않았습니다 (.env.local)");
  // 무료 등급은 분당 요청 수가 작다 → 429는 SDK가 지수 백오프로 재시도
  client ??= new OpenAI({ apiKey, baseURL: env("BASE_URL") || undefined, maxRetries: 4, timeout: 60_000 });
  return client;
}

export function model(kind: "extract" | "reason"): string {
  const m = kind === "extract" ? env("MODEL_EXTRACT") : env("MODEL_REASON") || env("MODEL_EXTRACT");
  if (!m) throw new Error(`LLM_MODEL_${kind === "extract" ? "EXTRACT" : "REASON"}가 설정되지 않았습니다 (.env.local)`);
  return m;
}

/**
 * 스키마에 맞는 JSON을 받는다.
 * 1차: json_schema(strict) 구조화 출력. 공급자가 거부하면 2차: JSON 모드 + 스키마를 프롬프트로 전달 후 zod로 검증.
 */
export async function structured<S extends z.ZodType>(opts: { kind: "extract" | "reason"; system: string; user: string; schema: S; name: string }): Promise<z.infer<S>> {
  const c = getClient();
  const messages = [
    { role: "system" as const, content: opts.system },
    { role: "user" as const, content: opts.user },
  ];
  try {
    const res = await c.chat.completions.parse({ model: model(opts.kind), messages, response_format: zodResponseFormat(opts.schema, opts.name) });
    const parsed = res.choices[0]?.message.parsed;
    if (parsed) return parsed as z.infer<S>;
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 400 && status !== 422) throw e; // 키·한도 오류는 그대로 전달
  }
  const schemaJson = JSON.stringify((zodResponseFormat(opts.schema, opts.name) as { json_schema: { schema: unknown } }).json_schema.schema);
  const res = await c.chat.completions.create({
    model: model(opts.kind),
    messages: [{ role: "system", content: `${opts.system}\n\n반드시 아래 JSON Schema를 따르는 JSON 객체 하나만 출력한다.\n${schemaJson}` }, messages[1]],
    response_format: { type: "json_object" },
  });
  const text = res.choices[0]?.message.content ?? "";
  const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  return opts.schema.parse(json);
}
