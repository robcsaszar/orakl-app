import { describe, expect, it } from "vitest";
import { isSoloPhaseRoute, routeForSoloPhase } from "../src/lib/solo-routes.js";

describe("routeForSoloPhase", () => {
  it("maps each phase to its route", () => {
    expect(routeForSoloPhase("setup")).toBe("/solo/setup");
    expect(routeForSoloPhase("playing")).toBe("/solo/play");
    expect(routeForSoloPhase("result")).toBe("/solo/results");
  });
});

describe("isSoloPhaseRoute", () => {
  it("recognises phase-owned routes", () => {
    expect(isSoloPhaseRoute("/solo/setup")).toBe(true);
    expect(isSoloPhaseRoute("/solo/play")).toBe(true);
    expect(isSoloPhaseRoute("/solo/results")).toBe(true);
  });

  it("excludes side pages so the layout doesn't bounce them", () => {
    // The bug: the leaderboard was auto-redirected to the phase route.
    expect(isSoloPhaseRoute("/solo/leaderboard")).toBe(false);
    expect(isSoloPhaseRoute("/solo")).toBe(false);
    expect(isSoloPhaseRoute("/")).toBe(false);
  });
});
