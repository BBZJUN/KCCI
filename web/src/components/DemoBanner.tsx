"use client";

import { useRouter } from "next/navigation";
import { resetDemo, useCalendar } from "@/lib/store";

/** 캘린더가 비어 있을 때(심사·첫 방문) 시연 시나리오로 바로 들어가는 안내 */
export default function DemoBanner() {
  const { items } = useCalendar();
  const router = useRouter();
  if (items.length > 0) return null;
  return (
    <div className="bg-navy px-6 py-2.5 text-sm text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          <b>처음 오셨나요?</b> 가상 취준생의 12월 일정(지원 5곳·자격증·개인 일정)으로 시연 흐름을 바로 볼 수 있어요.
        </span>
        <button
          onClick={() => {
            resetDemo();
            router.push("/recommend");
          }}
          className="rounded-md bg-accent px-3 py-1 font-semibold"
        >
          시연 데이터로 시작하기
        </button>
      </div>
    </div>
  );
}
