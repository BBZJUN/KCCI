# 에이전트 스펙

에이전트는 도구 5개를 순서대로 호출한다. 각 도구는 `web/src/lib/agent/`의 함수 하나에 대응한다.

| # | 도구 | 구현 | AI/코드 | 입력 | 출력 | 상태 |
|---|---|---|---|---|---|---|
| 1 | `search_jobs` · `rank_jobs` | `recommend.ts` (TODO) | AI | 관심 직무·지역, 내 일정, 잡알리오 공고 목록 | 추천 공고 + 이유 3개 | P1 |
| 2 | `parse_posting` | `parsePosting.ts` | AI | 공고 원문, today | `PostingExtraction` | ✅ 골격 |
| 3 | `estimate_schedule` | `estimateSchedule.ts` | 규칙 | 추출 단계 | `PlannedStage[]` (신뢰도·basis) | ✅ + 테스트 |
| 4 | `read_notice` | `readNotice.ts` | AI | 메일·문자 원문(마스킹) | `NoticeReading` | ✅ 골격 |
| 5 | `detect_conflict` | `detectConflict.ts` | 코드 | 캘린더 이벤트 | `Conflict[]` (hard/soft) | ✅ + 테스트 |

## 신뢰도 → UI
| kind | 의미 | confidence | 선 |
|---|---|---|---|
| fixed | 공고·안내에 날짜 명시 | high (근거 없으면 mid) | 실선 |
| range | '12월 중순' 등 범위 | mid | 점선 |
| tbd | '추후 안내' → 기본 간격 추정 | low | 점점선 |

범위 해석: 초순 1~10일, 중순 11~20일, 하순 21~말일, 'N월 중' = 그 달 전체.
기본 간격(`DEFAULT_GAP`, 앞 단계 종료일 기준 일수): 서류 발표 7~14, AI역검 3~7, 1차 면접 5~10, 최종 발표 5~14 등.
P1: 같은 기업의 지난 공고 이력이 쌓이면 그 간격을 우선 적용.

## 환각·오류 대응 (소개서 03)
1. evidence는 원문 그대로 복사하도록 프롬프트에 명시 → `evidenceInSource`로 실제 포함 여부 검증 → 없으면 `evidence_missing`, 신뢰도 한 단계 하향
2. 공고에 없는 단계는 추가 금지
3. 일정 확정·삭제는 사용자 승인 후 반영 (`notice_logs.applied`)
4. 파싱 실패 시 '직접 수정' 폼으로 전환
5. LLM 입력 전 `maskPII` (이름·전화·이메일)

## LLM 공급자 · Structured Outputs
- `llm.ts`의 `structured()`: OpenAI 호환 Chat Completions `chat.completions.parse` + `zodResponseFormat` (openai v7, zod v4)
- 공급자는 `LLM_BASE_URL`로 선택: **Gemini 무료 등급(기본 권장)** `https://generativelanguage.googleapis.com/v1beta/openai/` · Groq `https://api.groq.com/openai/v1` · OpenAI(비움)
- 공급자가 json_schema를 거부(400/422)하면 JSON 모드 + 스키마 프롬프트로 재요청하고 zod로 검증 (mock 서버로 두 경로 확인함)
- strict 모드: 모든 필드 required, 선택값은 `.nullable()`로. `.optional()` 금지.
- 무료 등급 한도가 작으므로 SDK `maxRetries: 4`로 429 재시도

## 모델 라우팅 · 비용
- 추출(2, 4): `LLM_MODEL_EXTRACT` (경량, 예: Gemini Flash 계열)
- 추천 이유·조정 문구(1, 5의 제안): `LLM_MODEL_REASON` (비우면 EXTRACT 모델 사용)
- 공유 캐시: 공고 원문을 정규화 → sha256 → `posting_cache` 조회 후 없을 때만 호출
- 호출 시점: 공고 수락, 안내 업로드 때만 (상시 폴링 없음)

## 공공데이터
- 잡알리오 공공기관 채용정보: data.go.kr/data/15050508 (이용허락범위 제한 없음) — 추천 후보
- 한국산업인력공단 국가자격 시험일정: 공공데이터포털 오픈API (활용신청 필요) — 자격증 일정 자동 추가
- 키: `DATA_GO_KR_SERVICE_KEY`
