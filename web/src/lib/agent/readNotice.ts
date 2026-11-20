import { zodTextFormat } from "openai/helpers/zod";
import { NoticeReading } from "../schemas";
import { getOpenAI, model } from "./openai";
import { evidenceInSource } from "./evidence";
import { maskPII } from "./pii";

export { maskPII };

const SYSTEM = `너는 채용 결과·일정 안내 메일/문자를 판독하는 도구다.
- result: 합격이면 pass, 불합격이면 fail, 결과 없이 일정만 알리면 schedule_only, 판단 불가면 unknown.
- 다음 전형 일정이 있으면 next_stage에 날짜(YYYY-MM-DD)·시각(HH:MM)·방식을 넣는다. 없으면 null.
- 연도가 없으면 기준일(today) 이후 가장 가까운 날짜로 해석한다.
- evidence에는 판단 근거 원문 문장을 그대로 복사한다. 원문에 없는 내용은 지어내지 않는다.`;

export async function readNotice(text: string, today: string) {
  const masked = maskPII(text);
  const res = await getOpenAI().responses.parse({
    model: model("extract"),
    input: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `today=${today}\n\n[안내 원문]\n${masked}` },
    ],
    text: { format: zodTextFormat(NoticeReading, "notice_reading") },
  });
  const reading = res.output_parsed;
  if (!reading) throw new Error("안내 판독 결과가 비어 있습니다");
  return { reading, evidence_missing: !evidenceInSource(reading.evidence, masked) };
}
