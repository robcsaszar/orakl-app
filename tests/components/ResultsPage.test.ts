import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("results page — emote layer", () => {
  const me = {
    id: "p-1",
    nickname: "Alice",
    avatar: "",
    score: 5,
    status: "active" as const,
    role: "player" as const,
  };

  function emoteSession(over: { observer?: boolean; set?: string[] }) {
    const session = new MockQuizSession();
    session.phase = "final_scores";
    session.playerId = "p-1";
    session.isObserver = over.observer ?? false;
    session.pickedEmotes = over.set ?? ["heart"];
    session.finalRoster = [me];
    session.activeEmotes = [
      {
        uid: "u1",
        playerId: "p-2",
        emoteId: "heart",
        offsetX: 0.5,
        offsetY: 0.5,
      },
    ];
    return session;
  }

  afterEach(() => vi.restoreAllMocks());

  function renderResults(session: MockQuizSession) {
    // jsdom lays nothing out; give every box a size so the fan can place itself.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 600,
    } as DOMRect);
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
    return render(
      ResultsPage as never,
      { data: makeData() },
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
  }

  /** Waits for the lazy layer: a received emote is drawn once it arrives. */
  async function layerReady(container: HTMLElement) {
    await waitFor(() =>
      expect(
        container.querySelector("div.pointer-events-none.z-20"),
      ).toBeTruthy(),
    );
  }

  it("a non-Observer opens the fan with a right-click and sends", async () => {
    const session = emoteSession({});
    const send = vi.spyOn(session, "sendEmote");
    const { container } = renderResults(session);
    await layerReady(container);
    await fireEvent.contextMenu(screen.getAllByText("Alice")[0], {
      clientX: 50,
      clientY: 50,
    });
    await fireEvent.click(screen.getByRole("button", { name: "Send heart" }));
    expect(send).toHaveBeenCalledWith(
      "heart",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("covers no control: the results content gets no overlay surface", async () => {
    const { container } = renderResults(emoteSession({}));
    await layerReady(container);
    expect(container.querySelector(".emote-area")).toBeNull();
  });

  it("an Observer sees a received emote but cannot open the fan", async () => {
    const { container } = renderResults(emoteSession({ observer: true }));
    await layerReady(container);
    await fireEvent.contextMenu(screen.getAllByText("Alice")[0]);
    expect(screen.queryByRole("button", { name: "Send heart" })).toBeNull();
  });

  it("a Player with an empty set cannot open the fan", async () => {
    const { container } = renderResults(emoteSession({ set: [] }));
    await layerReady(container);
    await fireEvent.contextMenu(screen.getAllByText("Alice")[0]);
    expect(screen.queryByRole("button", { name: /^Send / })).toBeNull();
  });
});
