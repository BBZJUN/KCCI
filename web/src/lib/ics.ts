import type { CalendarItem } from "./calendar";

/**
 * 캘린더 파일(.ics, RFC 5545)로 내보내기 — Google 캘린더·iPhone·Outlook에서 '가져오기'로 열 수 있다.
 * 시각이 있으면 1시간 일정(Asia/Seoul), 없으면 종일 일정. 추정 일정은 제목 앞에 [범위]/[추정]을 붙여 구분한다.
 */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const ymd = (d: string) => d.replace(/-/g, "");
function nextDay(d: string): string {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}
/** 75바이트 넘는 줄 접기 (UTF-8 기준, 한글이 잘리지 않게 글자 단위) */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > 73) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n");
}

export function toICS(items: CalendarItem[], stamp = "20261207T000000Z"): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//jobdori//KCCI 2026//KO", "CALSCALE:GREGORIAN", "X-WR-CALNAME:잡도리 취준 캘린더", "X-WR-TIMEZONE:Asia/Seoul"];
  for (const it of items) {
    if (it.status === "cancelled") continue;
    const prefix = it.confidence === "mid" ? "[범위] " : it.confidence === "low" ? "[추정] " : "";
    lines.push("BEGIN:VEVENT", `UID:${it.id}@jobdori`, `DTSTAMP:${stamp}`);
    if (it.time && it.start === it.end) {
      const [h, m] = it.time.split(":").map(Number);
      const end = `${String(Math.min(h + 1, 23)).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
      lines.push(`DTSTART;TZID=Asia/Seoul:${ymd(it.start)}T${it.time.replace(":", "")}00`, `DTEND;TZID=Asia/Seoul:${ymd(it.start)}T${end}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(it.start)}`, `DTEND;VALUE=DATE:${ymd(nextDay(it.end))}`);
    }
    lines.push(`SUMMARY:${esc(prefix + it.label)}`, `DESCRIPTION:${esc(`근거: ${it.evidence}`)}`);
    if (it.confidence !== "high") lines.push("STATUS:TENTATIVE");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
