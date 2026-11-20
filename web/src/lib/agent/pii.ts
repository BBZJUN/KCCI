/** 개인정보 최소화: 이름·전화·이메일을 마스킹한 뒤 LLM에 전달 (서버·클라이언트 공용, 외부 의존성 없음) */
export function maskPII(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[이메일]")
    .replace(/01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]")
    .replace(/([가-힣]{2,4})\s?(님|씨)/g, "[이름]$2");
}
