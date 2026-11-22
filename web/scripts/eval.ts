/**
 * 평가셋 정확도 측정 (소개서 08 '실측 결과'의 근거)
 *   npm run eval                 # 공고 + 메일
 *   npm run eval -- postings     # 공고만
 *   npm run eval -- notices      # 메일만
 *   npm run eval -- hard         # 서술형·표·영문 등 어려운 공고 10건 (AI)
 *   npm run eval -- rule         # 같은 공고를 규칙 추출만으로 (AI 없이 비교 기준)
 * - 공고: 단계 단위 정답 = stage_type, kind, start, end 모두 일치
 * - 메일: 건 단위 정답 = result, 다음 단계 stage_type·date·time 모두 일치
 * 무료 등급 분당 한도 때문에 순차 실행한다 (429는 llm.ts 재시도에 맡김). 충돌 시나리오는 npm test가 검증.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parsePosting } from "../src/lib/agent/parsePosting";
import { readNotice } from "../src/lib/agent/readNotice";
import { ruleExtract } from "../src/lib/agent/fallback";
import type { PostingExtraction } from "../src/lib/schemas";

const root = join(__dirname, "..", "..", "eval");
const jsonl = <T>(path: string): T[] => readFileSync(path, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as T);
const stamp = new Date().toISOString().slice(0, 10);
const GAP_MS = Number(process.env.EVAL_GAP_MS ?? 4000); // 요청 사이 간격 (무료 등급 RPM 보호)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type PostingAns = { id: string; today: string; stages: { stage_type: string; kind: string; start: string | null; end: string | null }[] };
type NoticeAns = { id: string; today: string; result: string; next: { stage_type: string; date: string | null; time: string | null } | null };

type Extractor = (text: string, today: string) => Promise<{ extraction: PostingExtraction; plan: { evidence_missing: boolean }[] }>;
const aiExtract: Extractor = (text, today) => parsePosting(text, today, undefined, { cache: false });
const ruleOnly: Extractor = async (text, today) => ({ extraction: ruleExtract(text, today), plan: [] });

async function evalPostings(dir = "postings", extract: Extractor = aiExtract, label = "전형 추출 정확도") {
  const answers = jsonl<PostingAns>(join(root, dir, "answers.jsonl"));
  const isRule = extract === ruleOnly;
  let total = 0, hit = 0, evidenceMissing = 0;
  const rows: string[] = [];
  for (const [n, a] of answers.entries()) {
    if (n > 0 && !isRule) await sleep(GAP_MS);
    const text = readFileSync(join(root, dir, `${a.id}.txt`), "utf8");
    try {
      const { extraction, plan } = await extract(text, a.today);
      evidenceMissing += plan.filter((p) => p.evidence_missing).length;
      a.stages.forEach((exp, i) => {
        const got = extraction.stages[i];
        const end = got ? (got.kind === "fixed" ? got.end ?? got.start : got.end) : undefined;
        const ok = !!got && got.stage_type === exp.stage_type && got.kind === exp.kind && got.start === exp.start && end === exp.end;
        total++;
        if (ok) hit++;
        else rows.push(`${a.id}#${i + 1} expected ${JSON.stringify(exp)} got ${JSON.stringify(got ?? null)}`);
      });
      if (extraction.stages.length > a.stages.length) rows.push(`${a.id}: 정답에 없는 단계 ${extraction.stages.length - a.stages.length}개`);
    } catch (e) {
      total += a.stages.length;
      rows.push(`${a.id}: 호출 실패 ${(e as Error).message}`);
    }
    process.stdout.write(`\r${dir} ${n + 1}/${answers.length}`);
  }
  const acc = total ? (hit / total) * 100 : 0;
  return `${label} [${dir}${isRule ? " · 규칙만" : " · AI"}]: ${hit}/${total} = ${acc.toFixed(1)}%${isRule ? "" : ` (근거 확인 필요 ${evidenceMissing}건)`}\n${rows.join("\n")}`;
}

async function evalNotices() {
  const answers = jsonl<NoticeAns>(join(root, "notices", "answers.jsonl"));
  let hit = 0, resultHit = 0;
  const rows: string[] = [];
  for (const [n, a] of answers.entries()) {
    if (n > 0) await sleep(GAP_MS);
    const text = readFileSync(join(root, "notices", `${a.id}.txt`), "utf8");
    try {
      const { reading } = await readNotice(text, a.today);
      const got = reading.next_stage ? { stage_type: reading.next_stage.stage_type, date: reading.next_stage.date, time: reading.next_stage.time } : null;
      const resultOk = reading.result === a.result;
      const nextOk = JSON.stringify(got) === JSON.stringify(a.next);
      if (resultOk) resultHit++;
      if (resultOk && nextOk) hit++;
      else rows.push(`${a.id} expected ${JSON.stringify({ result: a.result, next: a.next })} got ${JSON.stringify({ result: reading.result, next: got })}`);
    } catch (e) {
      rows.push(`${a.id}: 호출 실패 ${(e as Error).message}`);
    }
    process.stdout.write(`\r메일 ${n + 1}/${answers.length}`);
  }
  const N = answers.length;
  return `안내 판독 정확도: ${hit}/${N} = ${((hit / N) * 100).toFixed(1)}% (결과 판정만 ${resultHit}/${N})\n${rows.join("\n")}`;
}

async function main() {
  const which = process.argv[2] ?? "all";
  const parts: string[] = [];
  if (which === "all" || which === "postings") parts.push(await evalPostings());
  if (which === "all" || which === "hard") parts.push(await evalPostings("postings-hard"));
  if (which === "all" || which === "rule") {
    parts.push(await evalPostings("postings", ruleOnly));
    parts.push(await evalPostings("postings-hard", ruleOnly));
  }
  if (which === "all" || which === "notices") parts.push(await evalNotices());
  const report = `# eval ${stamp} · model=${process.env.LLM_MODEL_EXTRACT ?? process.env.OPENAI_MODEL_EXTRACT ?? "?"}\n\n${parts.join("\n\n")}\n`;
  console.log("\n\n" + report);
  mkdirSync(join(root, "results"), { recursive: true });
  writeFileSync(join(root, "results", `${which}-${stamp}.txt`), report);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
