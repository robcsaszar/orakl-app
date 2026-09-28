import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPage from "../../src/routes/(app)/history/+page.svelte";

let url = new URL("http://localhost/history");

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  replaceState: vi.fn(),
}));
vi.mock("$app/state", () => ({
  page: {
    get url() {
      return url;
    },
    state: {},
  },
}));

function setUrl(search = "") {
  url = new URL(`http://localhost/history${search}`);
}

function data(over: Record<string, unknown> = {}) {
  const base = {
    runs: [
      {
        id: "r1",
        total_score: 480,
        total_answered: 10,
        correct_count: 9,
        max_streak: 9,
        mode: "endless",
        category_ids: '["science"]',
        completed_at: 1_717_000_000_000,
      },
    ],
    stats: {
      runs: 1,
      total_answered: 10,
      total_correct: 9,
      best_score: 480,
      best_streak: 9,
    },
    badgeTally: {},
    categoryName: { science: "Science" },
    attemptStats: { attempts: 10, focusRate: 0.9, fastestCorrectMs: 1200 },
    dayStreak: 2,
    mastery: { strongest: null, weakest: null },
    gameStats: { games: 1, wins: 0, podiums: 1, best_rank: 1 },
    games: [
      {
        id: "g1",
        quiz_name: "Friday night myths",
        started_at: "2024-05-30 19:00:00",
        final_score: 720,
        rank: 1,
        player_count: 8,
        badges: [],
      },
    ],
    uiFlags: {},
    runsNextCursor: null,
    gamesNextCursor: null,
    range: "all",
    ...over,
  } as Record<string, unknown> & {
    runs: { completed_at: number }[];
    games: { started_at: string }[];
  };
  // Lifetime heads default to the listed rows, as the loader does for "all".
  return {
    trendRuns: base.runs,
    latestRunAt: base.runs[0]?.completed_at ?? null,
    latestGameAt: base.games[0]?.started_at ?? null,
    ...base,
  } as never;
}

beforeEach(() => {
  setUrl();
  vi.clearAllMocks();
});

describe("/history page — default tab (US #2)", () => {
  it("opens on solo when the latest run is newer than the latest game", () => {
    render(HistoryPage, {
      props: {
        data: data({
          runs: [
            {
              id: "r1",
              total_score: 480,
              total_answered: 10,
              correct_count: 9,
              max_streak: 9,
              mode: "normal",
              category_ids: '["science"]',
              completed_at: new Date("2024-06-01T00:00:00Z").getTime(),
            },
          ],
          games: [
            {
              id: "g1",
              quiz_name: "Old game",
              started_at: "2024-01-01 00:00:00",
              final_score: 100,
              rank: 1,
              player_count: 2,
              badges: [],
            },
          ],
        }),
      },
    });
    expect(screen.getByRole("tab", { name: "Solo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens on multiplayer when the latest game is newer than the latest run", () => {
    render(HistoryPage, {
      props: {
        data: data({
          runs: [
            {
              id: "r1",
              total_score: 480,
              total_answered: 10,
              correct_count: 9,
              max_streak: 9,
              mode: "normal",
              category_ids: '["science"]',
              completed_at: new Date("2024-01-01T00:00:00Z").getTime(),
            },
          ],
          games: [
            {
              id: "g1",
              quiz_name: "New game",
              started_at: "2024-06-01 00:00:00",
              final_score: 100,
              rank: 1,
              player_count: 2,
              badges: [],
            },
          ],
        }),
      },
    });
    expect(screen.getByRole("tab", { name: "Multiplayer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("?tab=multiplayer overrides recency", () => {
    setUrl("?tab=multiplayer");
    render(HistoryPage, {
      props: {
        data: data({
          runs: [
            {
              id: "r1",
              total_score: 480,
              total_answered: 10,
              correct_count: 9,
              max_streak: 9,
              mode: "normal",
              category_ids: '["science"]',
              completed_at: new Date("2024-06-01T00:00:00Z").getTime(),
            },
          ],
        }),
      },
    });
    expect(screen.getByRole("tab", { name: "Multiplayer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("/history page — badge tally", () => {
  it("renders the tally outside the tabpanel when BADGE_DISPLAY is on", () => {
    render(HistoryPage, {
      props: {
        data: data({
          uiFlags: { BADGE_DISPLAY: true },
          badgeTally: { victor: { count: 2, bestRarity: "rare" } },
        }),
      },
    });
    const heading = screen.getByRole("heading", { name: "Badges earned" });
    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).not.toContainElement(heading);
  });
});

describe("/history page — zero solo runs (US #5)", () => {
  it("shows no Best score tile and an inline Begin one link", () => {
    setUrl("?tab=solo");
    render(HistoryPage, {
      props: {
        data: data({
          runs: [],
          stats: {
            runs: 0,
            total_answered: 0,
            total_correct: 0,
            best_score: 0,
            best_streak: 0,
          },
          mastery: { strongest: null, weakest: null },
        }),
      },
    });
    expect(screen.queryByText("Best score")).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Begin one" });
    expect(link).toHaveAttribute("href", "/solo/setup");
  });
});

describe("/history page — rows (US #6)", () => {
  it("solo row shows the Endless badge and links to the run's review page", () => {
    setUrl("?tab=solo");
    render(HistoryPage, { props: { data: data() } });
    expect(screen.getByText("Endless")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review trial/ })).toHaveAttribute(
      "href",
      "/history/solo/r1",
    );
  });

  it("game row shows rank of player count", () => {
    setUrl("?tab=multiplayer");
    render(HistoryPage, { props: { data: data() } });
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("#1 of 8")).toBeInTheDocument();
  });
});

describe("/history page — date range chips (#1276)", () => {
  it("renders chips with data.range selected", () => {
    setUrl("?tab=solo&range=7d");
    render(HistoryPage, { props: { data: data({ range: "7d" }) } });
    const group = screen.getByRole("radiogroup", { name: "Date range" });
    expect(
      within(group).getByRole("radio", { name: "7 days" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("radio", { name: "All" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("shows a ranged-empty line, not the no-history invitation, when a range empties a list with lifetime runs", () => {
    setUrl("?tab=solo&range=7d");
    render(HistoryPage, {
      props: { data: data({ range: "7d", runs: [] }) },
    });
    expect(
      screen.getByText("No trials in the last 7 days."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No trials recorded yet/),
    ).not.toBeInTheDocument();
  });

  it("shows a ranged-empty line for the multiplayer list too", () => {
    setUrl("?tab=multiplayer&range=30d");
    render(HistoryPage, {
      props: { data: data({ range: "30d", games: [] }) },
    });
    expect(
      screen.getByText("No games in the last 30 days."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No multiplayer quizzes recorded yet/),
    ).not.toBeInTheDocument();
  });
});

describe("/history page — Load more (US #7)", () => {
  it("solo tab shows Load more when a cursor is present, hidden without one", () => {
    setUrl("?tab=solo");
    const { rerender } = render(HistoryPage, {
      props: { data: data({ runsNextCursor: "cursor-1" }) },
    });
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();

    rerender({ data: data({ runsNextCursor: null }) });
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("multiplayer tab shows Load more when a cursor is present, hidden without one", () => {
    setUrl("?tab=multiplayer");
    const { rerender } = render(HistoryPage, {
      props: { data: data({ gamesNextCursor: "cursor-1" }) },
    });
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();

    rerender({ data: data({ gamesNextCursor: null }) });
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });
});

describe("/history page — lifetime reads under a range", () => {
  it("keeps the trend and default tab on lifetime play when the range empties the lists", () => {
    const lifetime = [0, 1, 2].map((i) => ({
      id: `t${i}`,
      total_score: 100,
      total_answered: 10,
      correct_count: 5 + i,
      max_streak: 1,
      mode: "normal",
      category_ids: "[]",
      completed_at: 1_717_000_000_000 - i * 1000,
    }));
    render(HistoryPage, {
      props: {
        data: data({
          range: "7d",
          runs: [],
          games: [],
          trendRuns: lifetime,
          latestRunAt: lifetime[0].completed_at,
          latestGameAt: "2020-01-01 00:00:00",
        }),
      },
    });
    expect(screen.getByText(/Accuracy trend/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Solo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens on Multiplayer when the lifetime latest game is newer, though the range empties both lists", () => {
    render(HistoryPage, {
      props: {
        data: data({
          range: "7d",
          runs: [],
          games: [],
          trendRuns: [],
          latestRunAt: Date.UTC(2024, 0, 1),
          latestGameAt: "2024-06-01 12:00:00",
        }),
      },
    });
    expect(screen.getByRole("tab", { name: "Multiplayer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("/history page — chosen tab survives a data reload", () => {
  it("keeps Multiplayer after the load data refreshes", async () => {
    const { rerender } = render(HistoryPage, { props: { data: data() } });
    // Default fixture: the game (2024-05-30) is newer than the run → Multiplayer.
    await fireEvent.click(screen.getByRole("tab", { name: "Solo" }));
    expect(screen.getByRole("tab", { name: "Solo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await rerender({ data: data() });
    expect(screen.getByRole("tab", { name: "Solo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("/history page — mastery needs a completed run", () => {
  it("hides the category lines when no run was completed", () => {
    setUrl("?tab=solo");
    render(HistoryPage, {
      props: {
        data: data({
          runs: [],
          trendRuns: [],
          stats: {
            runs: 0,
            total_answered: 0,
            total_correct: 0,
            best_score: 0,
            best_streak: 0,
          },
          mastery: {
            strongest: { categoryId: "science", correct: 8, total: 10 },
            weakest: null,
          },
        }),
      },
    });
    expect(screen.queryByText(/strongest category/)).toBeNull();
  });
});

describe("/history page — a click beats a later recency flip", () => {
  it("keeps Solo after the user picked it and a newer game arrives", async () => {
    const solo = {
      latestRunAt: Date.UTC(2024, 5, 1),
      latestGameAt: "2024-01-01 00:00:00",
    };
    const { rerender } = render(HistoryPage, { props: { data: data(solo) } });
    await fireEvent.click(screen.getByRole("tab", { name: "Multiplayer" }));
    await fireEvent.click(screen.getByRole("tab", { name: "Solo" }));
    await rerender({
      data: data({ ...solo, latestGameAt: "2024-07-01 00:00:00" }),
    });
    expect(screen.getByRole("tab", { name: "Solo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
