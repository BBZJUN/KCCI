/** 공백·구두점 차이를 무시하고 원문에 근거 문장이 실제로 있는지 확인 (환각 방지) */
export function normalize(s: string): string {
  return s.replace(/[\s·・,.()（）\[\]"'“”‘’~\-–—:]/g, "").toLowerCase();
}

export function evidenceInSource(evidence: string, source: string): boolean {
  const e = normalize(evidence);
  if (e.length < 4) return false;
  return normalize(source).includes(e);
}
