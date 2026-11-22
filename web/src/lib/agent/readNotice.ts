import { NoticeReading } from "../schemas";
import { structured, WEB_BUDGET } from "./llm";
import { evidenceInSource } from "./evidence";
import { maskPII } from "./pii";

export { maskPII };

const SYSTEM = `너는 채용 결과·일정 안내 메일/문자를 판독하는 도구다.
- result: 합격이면 pass, 불합격이면 fail, 결과 없이 일정만 알리면 schedule_only, 판단 불가면 unknown.
- 다음 전형 일정이 있으면 next_stage에 날짜(YYYY-MM-DD)·시각(HH:MM)·방식을 넣는다. 응시 기간처럼 기간이면 시작 날짜·시작 시각을 쓴다. 날짜가 아직 없으면 date/time=null. 다음 전형이 없으면(최종 합격·불합격) next_stage=null.
- 연도가 없으면 기준일(today) 이후 가장 가까운 날짜로 해석한다.
- evidence에는 판단 근거 원문 문장을 그대로 복사한다. [이름]·[연락처]·[이메일] 같은 가림 표시도 바꾸지 말고 그대로 둔다. 원문에 없는 내용은 지어내지 않는다.`;

export async function readNotice(text: string, today: string, opts: { web?: boolean } = {}) {
  const masked = maskPII(text);
  const reading = await structured({
    kind: "extract",
    system: SYSTEM,
    user: `today=${today}\n\n[안내 원문]\n${masked}`,
    schema: NoticeReading,
    name: "notice_reading",
    budget: opts.web ? WEB_BUDGET : undefined,
  });
  return { reading, evidence_missing: !evidenceInSource(reading.evidence, masked) };
}
