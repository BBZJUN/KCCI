"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POSTINGS } from "@/lib/postings";
import { rankJobs, type Profile, type Ranked } from "@/lib/recommend";
import { dismissPosting, setDraft, setProfile, useCalendar, useClientToday } from "@/lib/store";

const split = (s: string) => s.split(/[,·\s]+/).map((x) => x.trim()).filter(Boolean);

function ProfileEditor({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ jobs: profile.jobs.join(", "), regions: profile.regions.join(", "), certs: profile.certs.join(", ") });
  if (!open)
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">내 조건</span>
        {[...profile.jobs.map((j) => `직무 ${j}`), ...profile.regions.map((r) => `지역 ${r}`), ...profile.certs.map((c) => `자격 ${c}`)].map((t) => (
          <span key={t} className="rounded-full bg-panel px-2.5 py-1 text-xs font-semibold text-head">{t}</span>
        ))}
        <button onClick={() => setOpen(true)} className="text-xs font-semibold text-accent underline">수정</button>
      </div>
    );
  return (
    <form
      className="flex flex-wrap items-end gap-2 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setProfile({ jobs: split(form.jobs), regions: split(form.regions), certs: split(form.certs) });
        setOpen(false);
      }}
    >
      {(["jobs", "regions", "certs"] as const).map((k) => (
        <label key={k} className="flex flex-col text-xs text-muted">
          {k === "jobs" ? "관심 직무" : k === "regions" ? "희망 지역" : "보유 자격"}
          <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-40 rounded-md border border-slate-300 px-2 py-1 text-sm text-navy" />
        </label>
      ))}
      <button className="rounded-md bg-navy px-3 py-1.5 font-semibold text-white">저장</button>
    </form>
  );
}

function Card({ r, onAccept }: { r: Ranked; onAccept: () => void }) {
  const p = r.posting;
  const [ai, setAi] = useState<string[] | null>(null);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const { profile } = useCalendar();

  async function explain() {
    setAiMsg("AI가 추천 이유를 정리하는 중…");
    try {
      const res = await fetch("/api/recommend/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting: { company: p.company, title: p.title, jobTags: p.jobTags, region: p.region, preferredCerts: p.preferredCerts, stageSummary: r.stageSummary },
          profile,
          ruleReasons: r.reasons.map((x) => x.text),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAi(data.reasons);
      setAiMsg(null);
    } catch {
      setAiMsg("API 키를 설정하면 AI 설명을 볼 수 있어요. 지금은 규칙 기반 이유를 보여줘요.");
    }
  }

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ background: p.color }}>{p.initial}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <b>{p.company}</b>
            {r.inProgress && <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] font-semibold text-head">진행 중인 기업</span>}
          </div>
          <p className="truncate text-sm text-muted">{p.title}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${r.dday <= 3 ? "bg-accent" : "bg-head"}`}>{r.dday === 0 ? "D-day" : `D-${r.dday}`}</span>
      </div>

      <p className="mt-3 text-xs font-bold text-accent">추천 이유 {ai && "· AI 정리"}</p>
      <ul className="mt-1 space-y-1 text-sm">
        {(ai ? ai.map((t) => ({ ok: true, text: t })) : r.reasons).map((x) => (
          <li key={x.text} className={x.ok ? "text-navy" : "text-amber-700"}>{x.ok ? "✓" : "!"}&nbsp; {x.text}</li>
        ))}
      </ul>
      {!ai && <button onClick={explain} className="mt-1 self-start text-xs font-semibold text-head underline">AI로 이유 다듬기</button>}
      {aiMsg && <p className="mt-1 text-xs text-muted">{aiMsg}</p>}

      <p className="mt-3 text-xs text-muted">전형 {r.posting.extraction.stages.length}단계 · {r.stageSummary}</p>
      <p className="text-[11px] text-muted">출처: {p.source}</p>

      <div className="mt-auto flex gap-2 pt-3">
        <button onClick={onAccept} className="flex-1 rounded-lg bg-accent py-2 text-sm font-semibold text-white">수락하고 전형 일정 만들기</button>
        <button onClick={() => dismissPosting(p.id)} className="rounded-lg border border-slate-300 px-3 text-sm font-semibold">관심 없음</button>
      </div>
    </article>
  );
}

export default function RecommendPage() {
  const router = useRouter();
  const { items, today, profile, dismissed } = useCalendar();
  const clientToday = useClientToday();
  const base = today ?? clientToday;
  const ranked = useMemo(() => (base ? rankJobs(POSTINGS, profile, items, base, dismissed) : []), [base, profile, items, dismissed]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">잡도리</p>
          <h1 className="text-3xl font-bold">오늘의 추천 공고</h1>
          <p className="mt-1 text-muted">관심 직무·지역·자격과 지금 캘린더의 일정 여유를 함께 보고 골랐어요.</p>
        </div>
        <Link href="/calendar" className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">내 캘린더 →</Link>
      </div>
      <div className="mt-4"><ProfileEditor key={JSON.stringify(profile)} profile={profile} /></div>
      {today && <p className="mt-2 text-xs text-muted">시연 기준일 {today} · 공고는 모두 시연용 가상 공고입니다.</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ranked.map((r) => (
          <Card
            key={r.posting.id}
            r={r}
            onAccept={() => {
              setDraft({ postingId: r.posting.id, text: r.posting.text, extraction: r.posting.extraction, color: r.posting.color });
              router.push("/");
            }}
          />
        ))}
      </div>
      {base && ranked.length === 0 && <p className="mt-6 text-center text-muted">지금 추천할 공고가 없어요.</p>}
    </main>
  );
}
