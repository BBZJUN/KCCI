# 평가셋 (소개서 08 기대효과의 측정 근거)

| 세트 | 목표 수량 | 위치 | 측정 지표 |
|---|---|---|---|
| 가상 공고 | 30건 (민간 p01~p15 · 공공 p16~p30, 141단계) | `postings/pNN.txt` + `postings/answers.jsonl` | 전형 추출 정확도 (목표 90%+) |
| 안내 메일 | 20건 | `notices/nNN.txt` + `notices/answers.jsonl` | 결과·다음 일정 판독 정확도 (목표 90%+) |
| 충돌 시나리오 | 10건 | `conflicts/scenarios.json` | 충돌 탐지율 (목표 100%) |

## 작성 규칙
- 모든 데이터는 **가상**이다. 실제 기업명을 쓸 땐 첫 줄에 `시연용 가상 공고`를 적는다. 실존 개인정보 금지.
- 공고는 표현을 다양하게: 날짜 명시 / `12월 중순` / `추후 안내` / `1월 중` / 시각 포함 / 연도 생략.
- 정답(`answers.jsonl`)은 한 줄에 공고 1건. 단계 순서대로 `stage_type`, `kind`, `start`, `end`(하루짜리는 start와 같게, tbd는 null).
- 범위 해석 기준: 초순 1~10일, 중순 11~20일, 하순 21~말일, `N월 중` = 그 달 전체.

## 만들기
p01은 수기 원본이고, p02~p30·n01~n20은 `web/scripts/gen-eval.ts` 한 스펙에서 원문과 정답을 같이 만든다 (원문과 정답이 어긋나지 않게).
날짜 표기는 공고마다 `12.2(수)` / `2026년 12월 2일(수)` / `12/2(수)` / `12월 2일`로 바꾼다.
```bash
cd web && npx tsx scripts/gen-eval.ts
```

## 실행
```bash
cd web
npm run eval                    # 공고 + 메일 (.env.local의 LLM 키 필요, 요청 간 4초 간격으로 순차 실행)
npm run eval -- postings        # 공고만 / notices: 메일만
EVAL_GAP_MS=1000 npm run eval   # 유료 등급이면 간격 줄이기
npm test                        # 충돌 시나리오 10건(src/lib/agent/conflicts.eval.test.ts) + 단위 테스트
```
- 공고: 단계 단위로 stage_type·kind·start·end가 모두 맞아야 정답. 평가는 공유 캐시를 건너뛴다.
- 메일: 건 단위로 result와 다음 단계(stage_type·date·time)가 모두 맞아야 정답. 원문은 maskPII 후 전송.
측정 결과는 `eval/results/`에 날짜별로 저장되고, 그 숫자를 소개서 08의 '실측 결과'에 옮긴다.
