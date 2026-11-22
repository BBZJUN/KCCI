# 잡도리 — 취준 일정, 단단히 챙기다

2026 대한민국 청년 CAREER FAIR AI 해커톤 출품작 (팀 싸피)

공고를 수락하면 AI 에이전트가 서류 마감부터 최종 발표까지 전형 일정을 캘린더에 만들고(확정·범위·추정을 선 스타일로 구분), 결과 안내를 읽어 다음 전형을 확정하며, 면접·자격증·개인 일정 충돌을 미리 알려줍니다.

## 심사위원용 바로 보기
- **프로토타입**: [배포 URL — 배포 후 기재] (로그인 없음, 첫 화면 상단 '시연 데이터로 시작하기')
- 시연 순서 (약 3분)
  1. **추천 공고** — 신한은행 카드의 '내 일정과 겹침' 경고 확인 → '수락하고 전형 일정 만들기'
  2. **전형 일정 확인** — 단계마다 원문 근거, 확정·범위·추정 표시 → '캘린더에 추가'
  3. **안내 메일** — 예시 '토스뱅크 서류 합격' → 'AI로 판독하기' → '확정 일정으로 반영' (점선 → 실선)
  4. **내 캘린더** — 12/17 충돌 경고의 '조정 문구 제안', '+ 개인·자격증 일정'
- 실측: 전형 추출 141/141, 안내 판독 20/20, 충돌 10/10 (`eval/results/`, 개선 전 결과 포함)
- AI 활용내역: [`docs/ai-usage.txt`](docs/ai-usage.txt)

## 문서
- 소개서: [`docs/proposal.pdf`](docs/proposal.pdf)
- 기획·스펙: [`docs/PRD.md`](docs/PRD.md), [`docs/agent-spec.md`](docs/agent-spec.md)
- 작업 목록: [`docs/tasks.md`](docs/tasks.md)

## 실행
```bash
cd web
cp .env.example .env.local   # 무료 Gemini 키(aistudio.google.com)와 모델명 입력
npm install
npm run dev                  # http://localhost:3000
npm test                     # 47개
npm run eval                 # 평가셋 정확도 (키 필요)
```
배포: [`docs/deploy.md`](docs/deploy.md)
크롬 확장: `chrome://extensions` → 개발자 모드 → 압축해제된 확장 프로그램 로드 → `extension/`
