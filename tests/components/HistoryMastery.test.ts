import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HistoryPage from "../../src/routes/(app)/history/+page.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

function data(strongestId: string, weakestId: string) {
  return {
    runs: [],
    trendRuns: [],
    latestRunAt: null,
    latestGameAt: null,
    stats: {
      runs: 1,
      total_answered: 0,
      total_correct: 0,
      best_score: 0,
      best_streak: 0,
    },
    badgeTally: {},
    categoryName: { "greek-mythology": "Greek mythology" },
    attemptStats: {},
    dayStreak: 0,
    mastery: {
      strongest: { categoryId: strongestId, correct: 8, total: 10 },
      weakest: { categoryId: weakestId, correct: 2, total: 10 },
    },
    gameStats: {},
    games: [],
    uiFlags: {},
  } as never;
}

describe("history mastery sentences", () => {
  it("renders the category name for a mapped id and the id for an unmapped one", () => {
    render(HistoryPage, {
      props: { data: data("greek-mythology", "norse-lore") },
    });
    expect(screen.getByText(/strongest category/).textContent).toContain(
      "Greek mythology",
    );
    const weakest = screen.getByText(/weakest category/).textContent ?? "";
    expect(weakest).toContain("norse-lore");
    expect(screen.queryByText(/greek-mythology/)).toBeNull();
  });
});
