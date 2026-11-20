import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "잡도리 — 취준 일정, 단단히 챙기다",
  description: "공고를 수락하면 전형 일정을 캘린더에 자동으로 만들고, 결과와 충돌까지 챙겨 주는 취준 일정관리 AI 에이전트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
