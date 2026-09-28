import { FLAG_REGISTRY } from "@orakl/shared";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import HistoryPage from "../src/routes/(app)/history/+page.svelte";
import GameHistoryDetailPage from "../src/routes/(app)/history/game/[id]/+page.svelte";

describe("BADGE_DISPLAY registry entry", () => {
  it("exists, db tier, default off", () => {
    expect(FLAG_REGISTRY.BADGE_DISPLAY).toBeDefined();
    expect(FLAG_REGISTRY.BADGE_DISPLAY.tier).toBe("db");
    expect(FLAG_REGISTRY.BADGE_DISPLAY.default).toBe(false);
  });
});

// History tally page (aggregate badge tally at src/routes/(app)/history/+page.svelte)
describe("/history badge tally surface", () => {
  function baseData(uiFlags: { BADGE_DISPLAY?: boolean }) {
    return {
      runs: [],
      trendRuns: [],
      latestRunAt: null,
      latestGameAt: null,
      stats: { runs: 0, best_score: 0, best_streak: 0, accuracy: null },
      badgeTally: {
        flawless: { count: 2, bestRarity: "epic" },
      },
      categoryName: {},
      attemptStats: { attempts: 0, focusRate: 0, fastestCorrectMs: null },
      dayStreak: 0,
      mastery: { strongest: null, weakest: null },
      gameStats: { games: 0, wins: 0, podiums: 0, best_rank: null },
      games: [],
      uiFlags,
    };
  }

  it("flag off: no badge tally renders", () => {
    render(HistoryPage, {
      props: { data: baseData({ BADGE_DISPLAY: false }) } as never,
    });
    expect(screen.queryByText("Badges earned")).not.toBeInTheDocument();
  });

  it("flag on: badge tally renders", () => {
    render(HistoryPage, {
      props: { data: baseData({ BADGE_DISPLAY: true }) } as never,
    });
    expect(screen.getByText("Badges earned")).toBeInTheDocument();
  });
});

// Game history detail page (badge section at
// src/routes/(app)/history/game/[id]/+page.svelte)
describe("/history/game/[id] badge section", () => {
  function baseData(uiFlags: { BADGE_DISPLAY?: boolean }) {
    return {
      game: {
        startedAt: "2026-01-01 12:00:00",
        quizName: "Test quiz",
        finalScore: 100,
        rank: 1,
        playerCount: 4,
      },
      stats: { accuracy: 0.5, avgTimeMs: 2000 },
      standings: [],
      badges: [{ id: "flawless", rarity: "epic" }],
      breakdown: null,
      alreadyFlaggedIds: [],
      uiFlags,
    };
  }

  it("flag off: no badges-earned section renders", () => {
    render(GameHistoryDetailPage, {
      props: { data: baseData({ BADGE_DISPLAY: false }) } as never,
    });
    expect(screen.queryByText("Badges earned")).not.toBeInTheDocument();
  });

  it("flag on: badges-earned section renders", () => {
    render(GameHistoryDetailPage, {
      props: { data: baseData({ BADGE_DISPLAY: true }) } as never,
    });
    expect(screen.getByText("Badges earned")).toBeInTheDocument();
  });
});
