/**
 * 전형 추출 정확도 측정: eval/postings/*.txt 를 parsePosting으로 돌려 answers.jsonl과 비교.
 * 단계 단위 정답 = stage_type, kind, start, end 가 모두 일치.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { parsePosting } from "../src/lib/agent/parsePosting";

type Ans = { id: string; today: string; stages: { stage_type: string; kind: string; start: string | null; end: string | null }[] };

const root = join(__dirname, "..", "..", "eval");
const answers: Ans[] = readFileSync(join(root, "postings", "answers.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

async function main() {
  let total = 0, hit = 0;
  const rows: string[] = [];
  for (const a of answers) {
    const text = readFileSync(join(root, "postings", `${a.id}.txt`), "utf8");
    const { extraction } = await parsePosting(text, a.today);
    a.stages.forEach((exp, i) => {
      const got = extraction.stages[i];
      const end = got ? (got.kind === "fixed" ? got.end ?? got.start : got.end) : undefined;
      const ok = !!got && got.stage_type === exp.stage_type && got.kind === exp.kind && got.start === exp.start && end === exp.end;
      total++; if (ok) hit++;
      if (!ok) rows.push(`${a.id}#${i + 1} expected ${JSON.stringify(exp)} got ${JSON.stringify(got ?? null)}`);
    });
    if (extraction.stages.length > a.stages.length) rows.push(`${a.id}: extra stages ${extraction.stages.length - a.stages.length}`);
  }
  const acc = total ? (hit / total) * 100 : 0;
  const report = `전형 추출 정확도: ${hit}/${total} = ${acc.toFixed(1)}%\n\n${rows.join("\n")}`;
  console.log(report);
  mkdirSync(join(root, "results"), { recursive: true });
  writeFileSync(join(root, "results", `postings-${new Date().toISOString().slice(0, 10)}.txt`), report);
}
main().catch((e) => { console.error(e); process.exit(1); });
