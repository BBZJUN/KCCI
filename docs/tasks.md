# 작업 목록 (마감 11/23 월 17:00)

담당: 강재준(PM·AI/백엔드) · 김세헌(웹·확장) · 이영은(데이터·평가·UX)
상태: [ ] 할 일 · [~] 진행 · [x] 완료

## 11/20(금) — 뼈대
- [x] Next.js 16 + 스키마 + 도구 2·3·4·5 골격, 단위 테스트 8개, API 3개
- [x] Supabase 스키마(RLS), 크롬 확장 골격, 평가셋 양식
- [ ] (강재준) Gemini 무료 키 발급(aistudio.google.com) → `.env.local` 세팅, `npm run eval`로 p01 통과 확인
- [x] 소개서 수정: 04 구조도·기술 스택·별첨의 'OpenAI Responses API' → Google Gemini API(OpenAI 호환). `docs/proposal.pdf` 갱신
- [ ] (강재준) Supabase 프로젝트 생성 → `supabase/migrations/0001_init.sql` 적용

## 11/21(토) — P0 기능
- [x] (김세헌) 월간 캘린더 `/calendar`: 기업 색·선 스타일 3종·현재 전형 테두리·충돌 배지·충돌 경고 바·일정 상세(근거, 확정/정리 버튼)
- [x] (김세헌) 화면 ② 전형 일정 확인 → [N개 일정 캘린더에 추가] (키 없을 땐 '예시 결과로 화면 보기')
- [~] (강재준) 저장소 교체: 서버 쪽(`src/lib/remote.ts`, 행↔CalendarItem 변환 + 테스트) 완료. 남은 것: Supabase 로그인 UI 붙이고 `store.ts`가 로그인 시 API로 동기화
- [x] (강재준) `POST /api/applications`, `GET /api/calendar` (사용자 토큰으로 RLS 적용, 키 없으면 501)
- [x] (강재준) `posting_cache` 공유 캐시 적용 (`src/lib/agent/cache.ts`, Supabase 없으면 메모리)
- [x] (강재준) 화면 ③ `/notices` 안내 반영: 판독 → 변경 제안(점선→실선 / 새 일정 / 불합격 시 이후 일정 정리) → 승인 시 적용. 예시 안내 3종으로 키 없이 시연 가능
- [x] (이영은) 가상 공고 30건(141단계) + 정답, 안내 메일 20건 + 정답, 충돌 시나리오 10건 (`web/scripts/gen-eval.ts`)
- [x] (이영은) 개인·자격증 일정 추가·삭제 UI (`AddEventForm`)
- [ ] (이영은) Q-net 시험일정 API 연동 — `DATA_GO_KR_SERVICE_KEY` 발급 후

## 11/22(일) — P1 + 측정
- [x] (강재준) 화면 ① `/recommend`: `rankJobs`(직무·지역·자격·일정 여유 점수, 충돌 경고) + 'AI로 이유 다듬기'(`/api/recommend/explain`, REASON 모델). 수락 → 화면 ②로 (공유 캐시 결과)
- [ ] (이영은) 추천 후보를 가상 공고 → 잡알리오 API 실데이터로 교체 (`src/lib/postings.ts`)
- [x] (강재준) 충돌 조정 문구 제안 (`/api/conflicts/suggest`, 대상은 코드 규칙, 키 없으면 기본 문구)
- [x] (김세헌) 확장: 웹 주소 설정 + '웹 캘린더에서 확인하고 담기' → `/import` → 화면 ②
- [~] (이영은) 측정: 충돌 10/10 (`npm test`). 공고·메일은 키 넣고 `npm run eval` → 소개서 08 실측 칸 채우기
- [x] 시연 데이터 시드 (`src/lib/demo.ts`, 캘린더 '시연 데이터 불러오기')

## 11/23(월) — 제출
- [ ] Vercel 배포 (`docs/deploy.md`). 확장은 `*.vercel.app` 기본 허용 + 설정에서 주소 입력
- [ ] 3분 시연 영상 녹화
- [ ] 소개서 07 캡처 2장·URL·저장소 링크, 08 실측값 채우고 PDF 재출력
- [x] AI 활용내역 최종본 `docs/ai-usage.md` (모델명 칸만 키 세팅 후 채우기)
- [ ] 제출 링크 업로드 + korcham.careerfair@gmail.com 메일 발송 (제목: `[싸피]_잡도리_AI 해커톤_20261123 / 과제제출`)
