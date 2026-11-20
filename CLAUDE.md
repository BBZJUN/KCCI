# 잡도리 (KCCI 2026 청년 CAREER FAIR AI 해커톤)

공고를 수락하면 AI 에이전트가 전형 일정을 캘린더에 자동으로 만들고(확정=실선, 범위=점선, 규칙 추정=점점선), 결과 안내를 읽어 다음 전형을 확정하며, 면접·자격증·개인 일정 충돌을 미리 알려주는 취준 일정관리 서비스.

**마감: 2026-11-23(월) 17:00 KST.** 시연 가능한 MVP가 최우선. `docs/tasks.md`의 P0를 위에서부터 끝낸다.

## 먼저 읽을 것
- `docs/PRD.md` — 화면 3개, 이용 흐름, 시연 시나리오 (소개서 05·07과 1:1 대응)
- `docs/agent-spec.md` — 에이전트 도구 5개 입출력, 신뢰도 규칙, 프롬프트 원칙
- `docs/tasks.md` — 우선순위·담당·진행 상태 (작업 끝나면 체크)
- `docs/proposal.pdf` — 제출한 프로젝트 소개서. **소개서에 적은 동작과 다르게 구현하지 않는다.** 바꿔야 하면 tasks.md에 '소개서 수정 필요'로 남긴다.
- `web/AGENTS.md` — Next.js 16은 학습 데이터와 다르다. 코드 쓰기 전에 `web/node_modules/next/dist/docs/`의 해당 가이드를 확인.

## 구조
```
web/                Next.js 16 (App Router) + TypeScript + Tailwind v4 — 웹 캘린더와 Agent API
  src/lib/schemas.ts        zod 스키마 (LLM 출력 = Structured Outputs, optional 대신 nullable)
  src/lib/agent/            llm(structured) · parsePosting · cache · estimateSchedule · readNotice · detectConflict · conflictAdvice · evidence · pii
  src/lib/remote.ts         Supabase 행 ↔ CalendarItem (서버 API용)
  src/app/api/              postings/parse · notices/read · conflicts(/suggest) · recommend/explain · applications · calendar
  scripts/eval.ts           평가셋 정확도 측정 (gen-eval.ts: 평가셋 생성)
extension/          크롬 확장 MV3 (빌드 없는 JS) — 공고 페이지에서 '캘린더에 담기'
supabase/migrations/ DB 스키마 + RLS
eval/               가상 공고·안내 메일·충돌 시나리오 평가셋
```

## 명령
```bash
cd web
cp .env.example .env.local   # 키 채우기
npm run dev                  # http://localhost:3000
npm test                     # vitest (추정 규칙·충돌·가드)
npm run lint && npm run build
npm run eval                 # 전형 추출 정확도 → eval/results/
```
확장: chrome://extensions → 개발자 모드 → '압축해제된 확장 프로그램 로드' → `extension/`

## 규칙
- **AI는 제안, 사용자가 확정.** 일정 확정·삭제·조정은 항상 사용자 승인 후 반영한다.
- 모든 날짜에 원문 근거 문장(evidence)을 저장·표시한다. 원문에 없는 근거는 `evidence_missing`으로 표시.
- 안내 메일 원문은 저장하지 않는다. LLM에 보내기 전 `maskPII` 적용.
- 충돌 판단은 코드(`detectConflict`)로만 한다. LLM은 조정 문구 제안에만 쓴다.
- 같은 공고는 `posting_cache`로 1회만 분석한다.
- 민간 플랫폼은 크롤링하지 않는다. 사용자가 연 페이지를 확장으로 읽는 방식만 허용.
- LLM 호출은 `src/lib/agent/llm.ts`의 `structured()` 하나로만 한다 (OpenAI 호환 Chat Completions → Gemini 무료 등급·Groq·OpenAI 공용). 공급자·모델명은 `LLM_BASE_URL` / `LLM_MODEL_EXTRACT` / `LLM_MODEL_REASON` 환경변수로 받고 하드코딩하지 않는다.
- 무료 등급은 분당 요청 수가 작다. 반복 호출(eval 등)은 순차 실행하고 429는 재시도에 맡긴다.
- 데모 데이터는 전부 가상. 실제 기업명을 쓰면 '시연용 가상' 표시를 유지한다.
- 순수 로직(추정·충돌·파싱 보조)을 바꾸면 `agent.test.ts`에 테스트를 추가하고 `npm test`를 통과시킨다.
- UI 문구는 한국어, 디자인 토큰은 `globals.css`의 `@theme` (navy #1F2A44, accent #F26B3A).
