import { describe, expect, it } from "vitest";
import { load as soloLoad } from "../../src/routes/(app)/solo/+page.js";
import { load as soloHistoryLoad } from "../../src/routes/(app)/solo/history/+page.js";
import { load as soloHistoryIdLoad } from "../../src/routes/(app)/solo/history/[id]/+page.js";
import { load as trialsLoad } from "../../src/routes/(app)/trials/+page.js";
import { load as trialsGameLoad } from "../../src/routes/(app)/trials/game/[id]/+page.js";
import { load as trialsSoloLoad } from "../../src/routes/(app)/trials/solo/[id]/+page.js";

// Legacy player-record URLs (/solo, /solo/history*, /trials*) redirect
// straight to their surviving target — one hop, no chain (#788).
describe("legacy player-record routes redirect", () => {
  const cases: [string, () => unknown, number, string][] = [
    ["/solo", () => soloLoad({} as any), 302, "/solo/setup"],
    ["/solo/history", () => soloHistoryLoad({} as any), 301, "/history"],
    [
      "/solo/history/[id]",
      () => soloHistoryIdLoad({ params: { id: "r1" } } as any),
      301,
      "/history/solo/r1",
    ],
    ["/trials", () => trialsLoad({} as any), 301, "/history"],
    [
      "/trials/solo/[id]",
      () => trialsSoloLoad({ params: { id: "r1" } } as any),
      301,
      "/history/solo/r1",
    ],
    [
      "/trials/game/[id]",
      () => trialsGameLoad({ params: { id: "g1" } } as any),
      301,
      "/history/game/g1",
    ],
  ];

  it.each(cases)("%s → %i %s", (_route, run, status, location) => {
    expect(run).toThrow(expect.objectContaining({ status, location }));
  });
});
