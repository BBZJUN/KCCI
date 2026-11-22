import { PostingExtraction } from "../schemas";
import { model, structured } from "./llm";
import { getPostingCache, postingHash } from "./cache";
import { estimateSchedule } from "./estimateSchedule";
import { normalizeStages } from "./normalizeStages";

const SYSTEM = `너는 한국 채용 공고에서 전형 일정을 구조화하는 도구다.
규칙:
- 공고에 나온 전형 단계를 순서대로 모두 뽑는다 (서류 마감, AI역량검사, 코딩테스트, 필기, 각 발표, 면접, 최종 발표).
- 날짜가 명시되면 kind="fixed". '12.7~12.8'처럼 시작·끝 날짜가 모두 적힌 기간도 fixed (start=시작, end=끝).
- '12월 중순'처럼 날짜 대신 시기만 적히면 kind="range"로 start/end를 달력 날짜로 바꾼다
  (초순=1~10일, 중순=11~20일, 하순=21~말일, 'N월 중'=그 달 1일~말일). '추후 안내'처럼 날짜가 없으면 kind="tbd", start/end=null.
- 서류 접수 기간은 stage_type="document_deadline"이고 마감일 하루만 쓴다 (start=end=마감일, 마감 시각은 time).
- stage_type: 서류 발표=document_result, 필기·코딩테스트·인적성 발표=test_result, 필기·NCS·인적성·GSAT·SKCT=written_test,
  코딩테스트·과제 전형=coding_test, 1차 면접·실무면접·직무면접=interview_1, 2차·임원·컬처핏 면접=interview_2.
- 연도가 없으면 기준일(today) 이후 가장 가까운 날짜로 해석한다.
- evidence에는 근거가 된 원문 문장을 한 글자도 바꾸지 말고 그대로 복사한다. 원문에 없는 내용을 지어내지 않는다.
- 공고에 없는 단계를 추측해서 추가하지 않는다.`;

/** opts.cache=false: 평가(eval)처럼 매번 모델 성능을 재야 할 때 공유 캐시를 건너뛴다 */
export async function parsePosting(text: string, today: string, sourceUrl?: string, opts: { cache?: boolean } = {}) {
  const useCache = opts.cache !== false;
  const cache = getPostingCache();
  const hash = postingHash(text);
  const hit = useCache ? await cache.get(hash) : null;
  if (hit) return { extraction: hit.extraction, plan: estimateSchedule(hit.extraction.stages, text), cached: true, hash };

  const raw = await structured({
    kind: "extract",
    system: SYSTEM,
    user: `today=${today}\n\n[공고 원문]\n${text}`,
    schema: PostingExtraction,
    name: "posting_extraction",
  });
  const extraction = { ...raw, stages: normalizeStages(raw.stages) };
  if (useCache) await cache.set(hash, { extraction, model: model("extract"), createdAt: new Date().toISOString() }, sourceUrl);
  return { extraction, plan: estimateSchedule(extraction.stages, text), cached: false, hash };
}
