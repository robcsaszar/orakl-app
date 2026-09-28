import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import ResultsPage from "../../src/routes/(game)/quiz/results/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

vi.mock("$app/navigation", () => ({
  invalidateAll: vi.fn(),
}));
vi.mock("../../src/lib/toast.js", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

function makeData(over: Record<string, unknown> = {}) {
  return {
    uiFlags: { BADGE_DISPLAY: true, ROLE_SELECTION: true },
    alreadyFlaggedIds: [],
    claimed: false,
    isAnonymousPlayer: false,
    breakdown: null,
    canFlag: false,
    hostAllowance: null,
    ...over,
  };
}

describe("results page — podium is the final-scores snapshot", () => {
  it("curator's row (player in finalRoster, observer in live players) stays on the leaderboard and in the Players count", () => {
    const session = new MockQuizSession();
    session.isCurator = true;
    session.playerId = "cur-1";
    session.phase = "final_scores";
    session.finalRoster = [
      {
        id: "cur-1",
        nickname: "Host",
        avatar: "",
        score: 5,
        status: "active",
        role: "player",
        isCurator: true,
      },
    ];
    session.players = [
      {
        id: "cur-1",
        nickname: "Host",
        avatar: "",
        score: 5,
        status: "active",
        role: "observer",
        isCurator: true,
      },
    ];

    render(
      ResultsPage as never,
      { data: makeData() },
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    expect(screen.getByText("Host")).toBeInTheDocument();
    expect(screen.getByText("Players").closest("div")).toBeInTheDocument();
    const playersTile = screen.getByText("Players").closest("div");
    expect(playersTile?.textContent).toContain("1");
  });

  it("empty finalRoster (frame not yet arrived): standings placeholder, no tiles", () => {
    const session = new MockQuizSession();
    session.phase = "final_scores";
    session.finalRoster = [];
    render(
      ResultsPage as never,
      { data: makeData() },
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    expect(
      screen.getByText("Standings are still arriving."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Players")).toBeNull();
  });
});

describe("results page — host allowance banner (map #1184)", () => {
  it("counted game: banner names the used/left figures and the subscribe link", () => {
    const session = new MockQuizSession();
    session.phase = "final_scores";
    session.finalRoster = [];
    render(
      ResultsPage as never,
      {
        data: makeData({
          hostAllowance: { counted: true, used: 3, limit: 5, left: 2 },
        }),
      },
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    expect(screen.getByText(/Free game 3 of 5 this year/)).toBeInTheDocument();
    expect(screen.getByText(/2 left/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Subscribe to host without limits" }),
    ).toHaveAttribute("href", "/profile#host");
  });

  it("uncounted game: banner says the game did not count, no subscribe link", () => {
    const session = new MockQuizSession();
    session.phase = "final_scores";
    session.finalRoster = [];
    render(
      ResultsPage as never,
      {
        data: makeData({
          hostAllowance: { counted: false, used: 2, limit: 5, left: 3 },
        }),
      },
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    expect(
      screen.getByText("This game did not count against your 5 free games."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Subscribe to host without limits" }),
    ).not.toBeInTheDocument();
  });

  it("hostAllowance null (player, entitled host): no banner", () => {
    const session = new MockQuizSession();
    session.phase = "final_scores";
    session.finalRoster = [];
    render(
      ResultsPage as never,
      { data: makeData() },
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});
