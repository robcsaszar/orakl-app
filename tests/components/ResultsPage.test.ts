import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import { toast } from "../../src/lib/toast.js";
import ResultsPage from "../../src/routes/(game)/quiz/results/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

const invalidateAll = vi.hoisted(() => vi.fn());
vi.mock("$app/navigation", () => ({ invalidateAll }));
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

describe("results page — refresh after a socket flap", () => {
  const fetchMock = vi.fn();
  const breakdownRow = {
    questionIndex: 0,
    categoryId: "general",
    timeToAnswerMs: 1200,
    questionText: "Fresh question text",
    isCorrect: true,
    selectedAnswerText: "a",
    correctAnswerText: "a",
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(toast.error).mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  function renderWith(data = makeData()) {
    const session = new MockQuizSession();
    session.phase = "final_scores";
    session.finalRoster = [];
    render(
      ResultsPage as never,
      { data },
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    return session;
  }

  function setVisibility(state: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  async function reconnect(session: MockQuizSession) {
    session.isReconnecting = true;
    await tick();
    session.isReconnecting = false;
    await tick();
  }

  it("fetches the results once when the socket returns, without invalidateAll", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    const session = renderWith();
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
    session.isReconnecting = true;
    await tick();
    expect(fetchMock).not.toHaveBeenCalled();
    session.isReconnecting = false;
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/quiz/results");
    expect(invalidateAll).not.toHaveBeenCalled();
  });

  it("a 503 refresh keeps the standings on screen and toasts once", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    const session = renderWith(makeData({ breakdown: [breakdownRow] }));
    session.finalRoster = [
      {
        id: "p-9",
        nickname: "Standing Kept",
        avatar: "",
        score: 3,
        status: "active",
        role: "player",
      },
    ];
    await reconnect(session);
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Standing Kept")).toBeInTheDocument();
    expect(screen.getByText(/Fresh question text/)).toBeInTheDocument();
  });

  it("a 409 refresh (the game moved on) shows no error toast", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: "wrong_phase", route: "/quiz/lobby" },
        { status: 409 },
      ),
    );
    const session = renderWith();
    await reconnect(session);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await tick();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("a successful refresh updates the breakdown", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json(makeData({ breakdown: [breakdownRow], canFlag: false })),
    );
    const session = renderWith();
    expect(screen.queryByText(/Fresh question text/)).toBeNull();
    await reconnect(session);
    await waitFor(() =>
      expect(screen.getByText(/Fresh question text/)).toBeInTheDocument(),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("refreshes once on becoming visible while the breakdown row is absent", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    renderWith();
    setVisibility("hidden");
    expect(fetchMock).not.toHaveBeenCalled();
    setVisibility("visible");
    setVisibility("visible");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidateAll).not.toHaveBeenCalled();
  });

  it("does not refresh on becoming visible when the breakdown row is present", async () => {
    renderWith(makeData({ breakdown: [] }));
    setVisibility("visible");
    expect(fetchMock).not.toHaveBeenCalled();
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

describe("results page — archived (the lobby is gone; its saved game, read-only)", () => {
  const standings = [
    {
      nickname: "Bob",
      avatarId: null,
      score: 90,
      rank: 1,
      role: "player" as const,
      isViewer: false,
    },
    {
      nickname: "Alice",
      avatarId: null,
      score: 50,
      rank: 2,
      role: "player" as const,
      isViewer: true,
    },
  ];
  const breakdown = [
    {
      questionIndex: 0,
      categoryId: "general",
      isCorrect: true,
      timeToAnswerMs: 2000,
      questionText: "Which oracle sat at Delphi?",
      correctAnswerText: "Pythia",
      selectedAnswerText: "Pythia",
    },
  ];

  function archivedSession() {
    const session = new MockQuizSession();
    // No socket: nothing live, except a stray emote the layer would draw.
    session.pickedEmotes = ["heart"];
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

  function renderArchived(session = archivedSession()) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
    return render(
      ResultsPage as never,
      { data: makeData({ archived: true, standings, breakdown }) },
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
  }

  beforeEach(() => vi.mocked(toast.loading).mockClear());

  it("renders the saved standings with the caller's row marked", () => {
    renderArchived();
    const rows = screen.getAllByRole("listitem");
    expect(rows[0].textContent).toContain("Bob");
    expect(rows[0].textContent).toContain("90");
    expect(rows[1].textContent).toContain("Alice");
    expect(rows[1].textContent).toContain("You");
    expect(rows[0].textContent).not.toContain("You");
    expect(screen.queryByText("Standings are still arriving.")).toBeNull();
  });

  it("renders the caller's own breakdown from the saved game", () => {
    renderArchived();
    expect(
      screen.getByText(/Which oracle sat at Delphi\?/),
    ).toBeInTheDocument();
    expect(screen.getByText("Your answers")).toBeInTheDocument();
  });

  it("a guest's create-account link carries the nickname from the saved row", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
    render(
      ResultsPage as never,
      {
        data: makeData({
          archived: true,
          standings,
          breakdown,
          isAnonymousPlayer: true,
        }),
      },
      {
        wrapper: LobbySessionHarness,
        wrapperProps: { session: archivedSession() },
      },
    );
    const link = screen.getByRole("link", { name: "Create account" });
    expect(link.getAttribute("href")).toContain("nickname=Alice");
  });

  it("no emotes and no wait for a next quiz", async () => {
    const { container } = renderArchived();
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector("div.pointer-events-none.z-20")).toBeNull();
    expect(toast.loading).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/The vault will open for the next quiz/),
    ).toBeNull();
  });
});
