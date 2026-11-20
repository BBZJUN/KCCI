import { PERSONAL_COLORS, type CalendarItem } from "./calendar";

/**
 * Supabase 저장소 (서버 전용). 브라우저는 지금 localStorage(store.ts)를 쓰고,
 * 로그인이 붙으면 같은 CalendarItem 모양으로 이 API(/api/applications, /api/calendar)에 동기화한다.
 * 요청마다 사용자의 access token을 그대로 넘겨 RLS(본인 데이터만)를 DB가 강제하게 한다.
 */

export type StageRow = {
  id?: string;
  application_id?: string;
  seq: number;
  stage_name: string;
  stage_type: string;
  kind: "fixed" | "range" | "tbd";
  start_date: string;
  end_date: string;
  start_time: string | null;
  confidence: CalendarItem["confidence"];
  basis: "posting" | "rule" | "notice" | "user";
  evidence: string;
  status: CalendarItem["status"];
};

export type ApplicationRow = { id: string; company: string; title: string; color: string; stages: StageRow[] };
export type PersonalRow = { id: string; title: string; category: "personal" | "certificate"; start_date: string; end_date: string };

/** 캘린더 칩 라벨에서 회사 약칭을 뺀 단계 이름 */
function stageName(item: CalendarItem): string {
  const parts = item.label.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : item.label;
}

export function itemsToStageRows(items: CalendarItem[]): StageRow[] {
  return items.map((it, seq) => ({
    seq,
    stage_name: stageName(it),
    stage_type: "other",
    kind: it.confidence === "high" ? "fixed" : it.confidence === "mid" ? "range" : "tbd",
    start_date: it.start,
    end_date: it.end,
    start_time: it.time ?? null,
    confidence: it.confidence,
    basis: it.status === "confirmed" ? "notice" : it.confidence === "low" ? "rule" : "posting",
    evidence: it.evidence,
    status: it.status,
  }));
}

export function rowsToItems(apps: ApplicationRow[], personal: PersonalRow[], short: (c: string) => string): CalendarItem[] {
  const fromApps = apps.flatMap((a) =>
    [...a.stages]
      .sort((x, y) => x.seq - y.seq)
      .map<CalendarItem>((s) => ({
        id: s.id ?? `${a.id}-${s.seq}`,
        groupId: a.id,
        label: `${short(a.company)} ${s.stage_name}`,
        company: a.company,
        color: a.color,
        category: "application",
        start: s.start_date,
        end: s.end_date,
        time: s.start_time ? s.start_time.slice(0, 5) : null,
        confidence: s.confidence,
        evidence: s.evidence,
        status: s.status,
      })),
  );
  const fromPersonal = personal.map<CalendarItem>((p) => ({
    id: p.id,
    groupId: p.id,
    label: p.title,
    company: null,
    color: PERSONAL_COLORS[p.category],
    category: p.category,
    start: p.start_date,
    end: p.end_date,
    confidence: "high",
    evidence: "직접 입력",
    status: "confirmed",
  }));
  return [...fromApps, ...fromPersonal];
}

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anon ? { url: url.replace(/\/$/, ""), anon } : null;
}

/** 사용자 토큰으로 PostgREST 호출 (RLS 적용) */
export async function rest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase 미설정");
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: cfg.anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Authorization: Bearer <access token>, sub 클레임 = user_id */
export function bearer(request: Request): { token: string; userId: string } | null {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as { sub?: string };
    return payload.sub ? { token, userId: payload.sub } : null;
  } catch {
    return null;
  }
}
