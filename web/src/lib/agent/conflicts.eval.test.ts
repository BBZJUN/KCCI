import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectConflicts } from "./detectConflict";
import type { CalendarEvent } from "../schemas";

/** eval/conflicts/scenarios.json — 충돌 탐지율 100%·오탐 0 확인 (소개서 08 지표) */
type Scenario = { id: string; desc: string; events: CalendarEvent[]; expected: [string, string, "hard" | "soft"][] };
const { scenarios } = JSON.parse(readFileSync(join(__dirname, "../../../../eval/conflicts/scenarios.json"), "utf8")) as { scenarios: Scenario[] };
const key = (a: string, b: string, s: string) => `${[a, b].sort().join("|")}:${s}`;

describe("충돌 시나리오 평가셋", () => {
  it("10건이다", () => expect(scenarios).toHaveLength(10));
  for (const sc of scenarios) {
    it(`${sc.id} ${sc.desc}`, () => {
      const got = detectConflicts(sc.events).map((c) => key(c.a.id, c.b.id, c.severity)).sort();
      expect(got).toEqual(sc.expected.map(([a, b, s]) => key(a, b, s)).sort());
    });
  }
});
