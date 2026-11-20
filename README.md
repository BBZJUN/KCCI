# 잡도리 — 취준 일정, 단단히 챙기다

2026 대한민국 청년 CAREER FAIR AI 해커톤 출품작 (팀 싸피)

공고를 수락하면 AI 에이전트가 서류 마감부터 최종 발표까지 전형 일정을 캘린더에 만들고(확정·범위·추정을 선 스타일로 구분), 결과 안내를 읽어 다음 전형을 확정하며, 면접·자격증·개인 일정 충돌을 미리 알려줍니다.

- 소개서: [`docs/proposal.pdf`](docs/proposal.pdf)
- 기획·스펙: [`docs/PRD.md`](docs/PRD.md), [`docs/agent-spec.md`](docs/agent-spec.md)
- 작업 목록: [`docs/tasks.md`](docs/tasks.md)

## 실행
```bash
cd web
cp .env.example .env.local   # OPENAI_API_KEY, 모델명, Supabase 키 입력
npm install
npm run dev                  # http://localhost:3000
npm test
```
크롬 확장: `chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램 로드 → `extension/`
