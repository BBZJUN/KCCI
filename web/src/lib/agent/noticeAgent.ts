import type { CalendarItem } from "../calendar";
import { findConflicts } from "../calendar";
import { applyChangesTo, planNoticeChanges, type NoticePlan } from "../notice";
import type { NoticeReading } from "../schemas";
import type { Conflict } from "./detectConflict";
import { evidenceInSource } from "./evidence";
import { ruleNotice } from "./fallback";
import { maskPII } from "./pii";
import { readNotice } from "./readNotice";
import { suggestAdjustment, type Advice } from "./suggestAdjustment";
import { knownCapture, transcribeCapture } from "./transcribeCapture";

/**
 * 안내 반영 에이전트: 사용자가 안내(글 또는 캡처)를 넘기면 도구를 차례로 호출해
 * 판독 → 캘린더 변경안 → 변경 후 충돌 확인 → 조정 문구까지 만들고, 반영은 사용자 승인을 기다린다.
 * 각 도구 호출은 trace로 남겨 화면에 그대로 보여준다 (무엇을 AI가, 무엇을 코드가 했는지).
 */
export type Step = {
  tool: string;
  label: string;
  by: "AI" | "코드" | "예비";
  status: "done" | "skipped" | "failed" | "waiting";
  ms: number;
  summary: string;
};

export type AgentResult = {
  trace: Step[];
  transcript: string | null;
  reading: NoticeReading;
  evidence_missing: boolean;
  plan: NoticePlan;
  conflicts: { conflict: Conflict; advice: Advice }[];
};

type Input = { text?: string; image?: string; items: CalendarItem[]; today: string; useAI: boolean };

async function timed<T>(fn: () => Promise<T> | T): Promise<[T, number]> {
  const t = Date.now();
  const v = await fn();
  return [v, Date.now() - t];
}

const key = (c: Conflict) => [c.a.id, c.b.id].sort().join("|") + c.severity;
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;

export async function runNoticeAgent({ text, image, items, today, useAI }: Input): Promise<AgentResult> {
  const trace: Step[] = [];
  let source = text?.trim() ?? "";
  let transcript: string | null = null;

  // 1) 캡처면 글자 옮기기
  if (image) {
    const t0 = Date.now();
    let got: string | null = null;
    let by: Step["by"] = "AI";
    if (useAI) {
      try {
        const out = await transcribeCapture(image);
        got = out.text;
      } catch (e) {
        console.error("[llm]", (e as Error).message);
      }
    }
    if (!got) {
      got = knownCapture(image);
      by = "예비";
    }
    if (!got) {
      trace.push({ tool: "transcribe_capture", label: "캡처 글자 읽기", by: "AI", status: "failed", ms: Date.now() - t0, summary: "AI 연결이 안 돼 캡처를 읽지 못했어요. 글을 붙여넣어 주세요." });
      throw Object.assign(new Error("캡처를 읽지 못했어요. 안내 글을 붙여넣어 주세요."), { trace });
    }
    transcript = got;
    source = got;
    trace.push({ tool: "transcribe_capture", label: "캡처 글자 읽기", by, status: "done", ms: Date.now() - t0, summary: `${got.split("\n").length}줄 옮김 · 이름·연락처는 가림` });
  }

  // 2) 안내 판독
  let reading: NoticeReading;
  let evidenceMissing = false;
  {
    const t0 = Date.now();
    let by: Step["by"] = "AI";
    try {
      if (!useAI) throw new Error("AI off");
      const r = await readNotice(source, today, { web: true });
      reading = r.reading;
      evidenceMissing = r.evidence_missing;
    } catch (e) {
      if ((e as Error).message !== "AI off") console.error("[llm]", (e as Error).message);
      by = "예비";
      reading = ruleNotice(source, today);
      evidenceMissing = !evidenceInSource(reading.evidence, source) && !evidenceInSource(reading.evidence, maskPII(source));
    }
    const resultText = { pass: "합격", fail: "불합격", schedule_only: "일정 안내", unknown: "판단 불가" }[reading.result];
    const next = reading.next_stage ? ` · 다음: ${reading.next_stage.stage_name} ${reading.next_stage.date ? md(reading.next_stage.date) : "날짜 미정"}${reading.next_stage.time ? " " + reading.next_stage.time : ""}` : "";
    trace.push({ tool: "read_notice", label: "안내 판독", by, status: "done", ms: Date.now() - t0, summary: `${reading.company} ${resultText}${next}` });
  }

  // 3) 캘린더 변경안 (코드)
  const [plan, msPlan] = await timed(() => planNoticeChanges(items, reading, today, reading.evidence));
  const counts = { confirm: 0, add: 0, cancel: 0 };
  plan.changes.forEach((c) => counts[c.type]++);
  trace.push({
    tool: "plan_changes",
    label: "캘린더 변경안",
    by: "코드",
    status: "done",
    ms: msPlan,
    summary: plan.changes.length ? [counts.confirm && `확정 ${counts.confirm}`, counts.add && `추가 ${counts.add}`, counts.cancel && `정리 ${counts.cancel}`].filter(Boolean).join(" · ") : plan.note,
  });

  // 4) 반영했을 때 새로 생기는 충돌 (코드)
  const [newConflicts, msConf] = await timed(() => {
    const before = new Set(findConflicts(items).map(key));
    const changed = new Set(plan.changes.map((c) => (c.type === "cancel" ? c.itemId : c.after.id)));
    return findConflicts(applyChangesTo(items, plan.changes)).filter((c) => !before.has(key(c)) && (changed.has(c.a.id) || changed.has(c.b.id)));
  });
  trace.push({
    tool: "detect_conflict",
    label: "반영 후 충돌 확인",
    by: "코드",
    status: "done",
    ms: msConf,
    summary: newConflicts.length ? newConflicts.map((c) => `${md(c.overlapStart)} ${c.a.title} ↔ ${c.b.title}`).join(", ") : "새로 겹치는 일정 없음",
  });

  // 5) 충돌마다 조정 문구 (대상은 코드, 문구는 AI 또는 기본 문구)
  const conflicts: AgentResult["conflicts"] = [];
  if (newConflicts.length) {
    const t0 = Date.now();
    for (const c of newConflicts.slice(0, 2)) conflicts.push({ conflict: c, advice: await suggestAdjustment(c, useAI) });
    const anyAI = conflicts.some((x) => x.advice.source === "ai");
    trace.push({ tool: "suggest_adjustment", label: "조정 문구 작성", by: anyAI ? "AI" : "코드", status: "done", ms: Date.now() - t0, summary: `${conflicts.length}건 · 대상: ${conflicts.map((x) => (x.advice.target_id === x.conflict.a.id ? x.conflict.a.title : x.conflict.b.title)).join(", ")}` });
  } else {
    trace.push({ tool: "suggest_adjustment", label: "조정 문구 작성", by: "코드", status: "skipped", ms: 0, summary: "조정할 충돌 없음" });
  }

  // 6) 사용자 승인 대기
  trace.push({ tool: "await_approval", label: "사용자 승인", by: "코드", status: "waiting", ms: 0, summary: plan.changes.length ? "승인하면 캘린더에 반영돼요" : "반영할 변경 없음" });

  return { trace, transcript, reading, evidence_missing: evidenceMissing, plan, conflicts };
}
