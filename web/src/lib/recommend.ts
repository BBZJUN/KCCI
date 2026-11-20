import type { CalendarItem } from "./calendar";
import { applicationToItems, findConflicts } from "./calendar";
import { estimateSchedule } from "./agent/estimateSchedule";
import type { Posting } from "./postings";

export type Profile = { jobs: string[]; regions: string[]; certs: string[] };
export const DEFAULT_PROFILE: Profile = { jobs: ["백엔드", "서버"], regions: ["서울"], certs: ["SQLD"] };

export type Reason = { ok: boolean; text: string };
export type Ranked = {
  posting: Posting;
  score: number;
  dday: number;
  reasons: Reason[];
  conflicts: { date: string; with: string }[];
  stageSummary: string;
  inProgress: boolean;
};

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8))}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/**
 * rank_jobs (규칙 기반 점수 + 설명). 소개서 03의 1단계.
 * 추천 이유 문장을 LLM으로 다듬는 건 /api/recommend/explain (REASON 모델) — 키가 없으면 이 문장을 그대로 쓴다.
 */
export function rankJobs(postings: Posting[], profile: Profile, calendar: CalendarItem[], today: string, dismissed: string[] = []): Ranked[] {
  const active = calendar.filter((i) => i.status !== "cancelled");
  const companies = new Set(active.map((i) => i.company).filter(Boolean));

  return postings
    .filter((p) => !dismissed.includes(p.id) && p.deadline >= today)
    .map((p) => {
      const reasons: Reason[] = [];
      let score = 0;

      const jobHit = p.jobTags.filter((t) => profile.jobs.some((j) => t.includes(j) || j.includes(t)));
      if (jobHit.length) { score += 40 * Math.min(1, jobHit.length / 2); reasons.push({ ok: true, text: `관심 직무(${jobHit.join("·")}) 일치` }); }
      else reasons.push({ ok: false, text: `관심 직무와 다름 (${p.jobTags.join("·")})` });

      if (profile.regions.includes(p.region)) { score += 10; reasons.push({ ok: true, text: `희망 지역(${p.region})` }); }

      const certHit = p.preferredCerts.filter((c) => profile.certs.includes(c));
      if (certHit.length) { score += 15; reasons.push({ ok: true, text: `보유 자격(${certHit.join("·")}) 우대 조건` }); }

      // 일정 여유: 이 공고를 수락했을 때 생길 일정과 기존 캘린더의 충돌 수
      const plan = estimateSchedule(p.extraction.stages, p.text);
      const draft = applicationToItems({ id: `rec-${p.id}`, company: p.company, title: p.title, color: p.color, stages: plan });
      const conflicts = findConflicts([...active, ...draft])
        .filter((c) => (c.a.id.startsWith("rec-") ? 1 : 0) + (c.b.id.startsWith("rec-") ? 1 : 0) === 1)
        .map((c) => ({ date: c.overlapStart, with: c.a.id.startsWith("rec-") ? c.b.title : c.a.title }));
      const window = draft.filter((d) => d.start > p.deadline);
      const span = window.length ? `${md(window[0].start)}~${md(window[window.length - 1].end)}` : "";
      if (conflicts.length === 0) { score += 20; reasons.push({ ok: true, text: span ? `예상 전형 기간(${span}) 일정 여유` : "기존 일정과 겹치지 않음" }); }
      else { score -= 10 * conflicts.length; reasons.push({ ok: false, text: `${md(conflicts[0].date)} ${conflicts[0].with}와 겹칠 수 있음` }); }

      const dday = daysBetween(today, p.deadline);
      if (dday <= 3) score += 5; // 마감 임박은 먼저 보여준다

      return {
        posting: p,
        score: Math.round(score),
        dday,
        reasons: reasons.slice(0, 4),
        conflicts,
        stageSummary: p.extraction.stages.map((s) => s.stage_name).join(" → "),
        inProgress: companies.has(p.company),
      };
    })
    .sort((a, b) => b.score - a.score || a.dday - b.dday);
}
