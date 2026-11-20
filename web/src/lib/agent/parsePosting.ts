import { zodTextFormat } from "openai/helpers/zod";
import { PostingExtraction } from "../schemas";
import { getOpenAI, model } from "./openai";
import { estimateSchedule } from "./estimateSchedule";

const SYSTEM = `너는 한국 채용 공고에서 전형 일정을 구조화하는 도구다.
규칙:
- 공고에 나온 전형 단계를 순서대로 모두 뽑는다 (서류 마감, AI역량검사, 코딩테스트, 필기, 각 발표, 면접, 최종 발표).
- 날짜가 명시되면 kind="fixed". '12월 중순', '12월 2~3주차'처럼 범위면 kind="range"로 start/end를 달력 날짜로 바꾼다
  (초순=1~10일, 중순=11~20일, 하순=21~말일). '추후 안내'처럼 날짜가 없으면 kind="tbd", start/end=null.
- 연도가 없으면 기준일(today) 이후 가장 가까운 날짜로 해석한다.
- evidence에는 근거가 된 원문 문장을 한 글자도 바꾸지 말고 그대로 복사한다. 원문에 없는 내용을 지어내지 않는다.
- 공고에 없는 단계를 추측해서 추가하지 않는다.`;

export async function parsePosting(text: string, today: string) {
  const res = await getOpenAI().responses.parse({
    model: model("extract"),
    input: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `today=${today}\n\n[공고 원문]\n${text}` },
    ],
    text: { format: zodTextFormat(PostingExtraction, "posting_extraction") },
  });
  const extraction = res.output_parsed;
  if (!extraction) throw new Error("공고 구조화 결과가 비어 있습니다");
  return { extraction, plan: estimateSchedule(extraction.stages, text) };
}
