# 배포 가이드 (Vercel + Supabase + 크롬 확장)

## 1. 로컬에서 먼저 확인
```bash
cd web
cp .env.example .env.local      # LLM_API_KEY, LLM_MODEL_EXTRACT, LLM_MODEL_REASON 입력
npm run dev                     # http://localhost:3000
npm run eval -- postings        # 키가 제대로 붙었는지 확인 (약 2분, 무료 등급 간격 4초)
```
키가 없어도 화면은 모두 동작한다 (시연 데이터, '예시 결과로 화면 보기', 예시 안내 3종, 조정 문구는 기본 문구).

## 2. Supabase (선택 — 없으면 브라우저 저장소 + 서버 메모리 캐시)
1. supabase.com에서 프로젝트 생성 → SQL Editor에 `supabase/migrations/0001_init.sql` 붙여넣고 실행
2. Project Settings → API에서 값 복사
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용. `posting_cache` 쓰기에만 사용, 브라우저에 노출 금지)
3. 효과
   - `posting_cache`: 같은 공고 원문(정규화 → sha256)은 사용자와 상관없이 1회만 LLM 분석
   - `POST /api/applications`, `GET /api/calendar`: `Authorization: Bearer <사용자 access token>`으로 호출, RLS가 본인 데이터만 허용
   - 로그인 UI를 붙이기 전까지 웹 화면은 브라우저 저장소(`src/lib/store.ts`)를 쓴다. 키가 없으면 두 API는 501을 돌려준다.

## 3. Vercel
1. vercel.com → Add New Project → GitHub `BBZJUN/KCCI` 선택
2. **Root Directory: `web`** (Framework: Next.js 자동 인식)
3. Environment Variables에 `.env.local`과 같은 값 입력
   - 필수: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL_EXTRACT`, `LLM_MODEL_REASON`
   - 선택: Supabase 3개, `DATA_GO_KR_SERVICE_KEY`
4. Deploy → 배포 주소 확인 (예: `https://jobdori.vercel.app`)
5. `/calendar`에서 '시연 데이터 불러오기' → 충돌 경고의 '조정 문구 제안'이 AI 문구로 나오면 키 연결 완료

## 4. 크롬 확장
- `manifest.json`의 `host_permissions`에 `http://localhost:3000/*`, `https://*.vercel.app/*`가 이미 있어 Vercel 기본 도메인은 추가 작업 없음
- 확장 팝업 오른쪽 위 **설정** → 잡도리 웹 주소에 배포 주소 입력 → 저장
- 다른 도메인을 쓰면 저장할 때 크롬이 그 주소 접근 권한을 한 번 묻는다 (`optional_host_permissions`)
- 흐름: 공고 페이지 → '전형 일정 가져오기' → '웹 캘린더에서 확인하고 담기' → 화면 ②에서 확인 후 '캘린더에 추가'
  - 공고 원문은 주소의 `#` 뒤로만 넘겨 서버 로그에 남지 않고, 웹이 읽은 뒤 주소에서 지운다

## 5. 제출 전 체크
- [ ] 배포 주소에서 화면 ①②③·캘린더 동작
- [ ] `npm run eval` 결과(`eval/results/`)를 소개서 08 실측 칸에 반영
- [ ] 소개서 07에 배포 URL·저장소 링크·캡처 2장
