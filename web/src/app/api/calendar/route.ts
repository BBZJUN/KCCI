import { shortName } from "@/lib/calendar";
import { bearer, rest, rowsToItems, supabaseConfig, type ApplicationRow, type PersonalRow } from "@/lib/remote";

/** 로그인 사용자의 전체 일정 (지원 건 단계 + 개인·자격증) → CalendarItem[] */
export async function GET(request: Request) {
  if (!supabaseConfig()) return Response.json({ error: "Supabase가 설정되지 않았습니다. 지금은 브라우저 저장소를 사용합니다." }, { status: 501 });
  const auth = bearer(request);
  if (!auth) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  try {
    const [apps, personal] = await Promise.all([
      rest<ApplicationRow[]>("applications?select=id,company,title,color,stages(*)&status=eq.active", auth.token),
      rest<PersonalRow[]>("personal_events?select=id,title,category,start_date,end_date", auth.token),
    ]);
    return Response.json({ items: rowsToItems(apps, personal, shortName) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
