/**
 * 공개 배포(심사·시연)용 간단한 요청 제한. 무료 LLM 한도를 한 사람이 다 쓰지 않게 IP당 분당 N회.
 * 서버리스 인스턴스마다 따로 세지만 MVP에는 충분하다. 넘으면 오류 대신 예비 경로(규칙·시연 결과)로 응답.
 */
const hits = new Map<string, number[]>();

export function allowLLM(request: Request, perMinute = Number(process.env.LLM_RATE_PER_MIN ?? 12)): boolean {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
