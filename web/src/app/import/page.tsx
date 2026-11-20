"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMPANY_COLORS } from "@/lib/calendar";
import { decodeImport } from "@/lib/importPayload";
import { setDraft, useCalendar } from "@/lib/store";

/** 크롬 확장에서 넘어온 분석 결과를 draft로 넣고 화면 ②로 보낸다. 캘린더 반영은 화면 ②에서 사용자가 누를 때만. */
const noop = () => () => {};

export default function ImportPage() {
  const router = useRouter();
  const { items } = useCalendar();
  // 서버 렌더·하이드레이션 중에는 "" → 클라이언트에서만 해시를 읽는다
  const hash = useSyncExternalStore(noop, () => window.location.hash || "#", () => "");
  const payload = useMemo(() => (hash ? decodeImport(hash) : null), [hash]);
  const failed = hash !== "" && !payload;

  useEffect(() => {
    if (!payload) return;
    const groups = new Set(items.map((i) => i.groupId));
    setDraft({
      postingId: `ext-${payload.hash ?? Date.now()}`,
      text: payload.text,
      extraction: payload.extraction,
      color: COMPANY_COLORS[groups.size % COMPANY_COLORS.length],
      source: "extension",
      sourceUrl: payload.sourceUrl ?? undefined,
    });
    // 원문이 담긴 해시를 주소창·방문 기록에 남기지 않는다
    router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 text-center">
      {failed ? (
        <>
          <p className="font-semibold">가져온 공고를 읽지 못했어요.</p>
          <p className="mt-1 text-sm text-muted">확장에서 다시 시도하거나, 공고 원문을 직접 붙여넣어 주세요.</p>
          <Link href="/" className="mt-4 inline-block rounded-lg bg-navy px-4 py-2 font-semibold text-white">공고 담기로 이동</Link>
        </>
      ) : (
        <p className="text-sm text-muted">확장에서 가져온 공고를 여는 중…</p>
      )}
    </main>
  );
}
