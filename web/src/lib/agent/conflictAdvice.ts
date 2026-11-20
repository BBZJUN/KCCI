import type { CalendarEvent, ConflictAdvice } from "../schemas";
import type { Conflict } from "./detectConflict";

const RANK: Record<CalendarEvent["confidence"], number> = { high: 2, mid: 1, low: 0 };

/**
 * 조정 대상 고르기 (코드 규칙):
 * 1) 신뢰도가 낮은 쪽(추정 일정)  2) 같으면 개인 일정(직접 옮길 수 있음)  3) 그래도 같으면 늦게 시작하는 쪽
 */
export function pickTarget(c: Pick<Conflict, "a" | "b">): { target: CalendarEvent; keep: CalendarEvent } {
  const { a, b } = c;
  if (RANK[a.confidence] !== RANK[b.confidence]) return RANK[a.confidence] < RANK[b.confidence] ? { target: a, keep: b } : { target: b, keep: a };
  const pa = a.category !== "application", pb = b.category !== "application";
  if (pa !== pb) return pa ? { target: a, keep: b } : { target: b, keep: a };
  return a.start > b.start ? { target: a, keep: b } : { target: b, keep: a };
}

const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일`;

/** LLM 키가 없거나 호출이 실패하면 쓰는 템플릿 문구 */
export function templateAdvice(c: Pick<Conflict, "a" | "b" | "overlapStart">): ConflictAdvice {
  const { target, keep } = pickTarget(c);
  const day = md(c.overlapStart);
  if (target.category !== "application") {
    return {
      target_id: target.id,
      reason: `${keep.title}은(는) 기업 일정이라 바꾸기 어렵고, ${target.title}은(는) 직접 옮길 수 있어요.`,
      message: `${day} ${target.title} 일정을 다른 날로 옮겨 주세요. 같은 날 ${keep.title}이(가) 있습니다.`,
    };
  }
  const estimated = target.confidence !== "high";
  return {
    target_id: target.id,
    reason: estimated
      ? `${target.title}은(는) 아직 추정 일정이라, 확정 안내 전에 미리 문의해 두는 게 좋아요.`
      : `두 일정 모두 확정이라 한쪽에 조정을 요청해야 해요. 나중에 잡힌 ${target.title} 쪽에 문의하는 안이에요.`,
    message: [
      "안녕하세요, 채용 담당자님.",
      `${target.title.replace(/^\S+\s/, "")} 전형 일정 관련해 문의드립니다.`,
      `${day}에 다른 기업의 확정된 전형 일정이 있어 참석이 어려울 수 있습니다.`,
      estimated ? "아직 일정이 확정 전이라면 다른 날짜로 배정이 가능한지 여쭙고 싶습니다." : "가능하시다면 다른 시간대나 날짜로 조정이 가능한지 여쭙고 싶습니다.",
      "번거롭게 해드려 죄송하며, 회신 기다리겠습니다. 감사합니다.",
    ].join("\n"),
  };
}
