import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLobbyTitle } from "../../src/lib/lobby-titles.js";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import LobbyPage from "../../src/routes/(game)/quiz/lobby/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));
vi.mock("../../src/lib/toast.js", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));
vi.mock("../../src/lib/storage.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/lib/storage.js")>();
  return { ...actual, storage: { ...actual.storage, getQuizConfig: vi.fn() } };
});

import { goto } from "$app/navigation";
import { storage } from "../../src/lib/storage.js";
import { toast } from "../../src/lib/toast.js";

function makeSession() {
  const session = new MockQuizSession();
  session.isCurator = true;
  session.phase = "lobby";
  session.players = [
    {
      id: "p-active",
      nickname: "Seeker",
      avatar: "",
      score: 0,
      status: "active",
    },
  ];
  return session;
}

describe("lobby page — start game with unreadable quiz config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("null config → one error toast, no session.startGame, no navigation", async () => {
    vi.mocked(storage.getQuizConfig).mockReturnValue(null);
    const session = makeSession();
    const startGameSpy = vi.spyOn(session, "startGame");
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    await fireEvent.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't read the quiz setup. Go back and create the quiz again.",
    );
    expect(startGameSpy).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it("corrupt config → same toast, no session.startGame", async () => {
    vi.mocked(storage.getQuizConfig).mockReturnValue("{not json");
    const session = makeSession();
    const startGameSpy = vi.spyOn(session, "startGame");
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    await fireEvent.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(toast.error).toHaveBeenCalledOnce();
    expect(startGameSpy).not.toHaveBeenCalled();
  });

  it("config present → session.startGame called once, no toast", async () => {
    vi.mocked(storage.getQuizConfig).mockReturnValue(
      JSON.stringify({
        categoryIds: ["science"],
        timer: 20,
        questionsPerRound: 10,
        advanceMode: "auto_5",
      }),
    );
    const session = makeSession();
    const startGameSpy = vi.spyOn(session, "startGame");
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    await fireEvent.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(startGameSpy).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

function makeRosterSession(isCurator: boolean) {
  const session = new MockQuizSession();
  session.isCurator = isCurator;
  session.playerId = "p-me";
  session.phase = "lobby";
  session.players = [
    {
      id: "p-me",
      nickname: "Seeker",
      avatar: "",
      score: 0,
      status: "active",
      ...(isCurator ? { isCurator: true } : {}),
    },
    {
      id: "p-other",
      nickname: "Rival",
      avatar: "",
      score: 0,
      status: "active",
    },
  ];
  return session;
}

describe("lobby roster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("curator view renders the versus divider and each player's title", () => {
    const session = makeRosterSession(true);
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    expect(screen.getByText("versus")).toBeInTheDocument();
    const meTitle = getLobbyTitle("Seeker");
    const otherTitle = getLobbyTitle("Rival");
    if (meTitle.prefix)
      expect(screen.getByText(meTitle.prefix.trim())).toBeInTheDocument();
    if (meTitle.suffix)
      expect(screen.getByText(meTitle.suffix.trim())).toBeInTheDocument();
    if (otherTitle.prefix)
      expect(screen.getByText(otherTitle.prefix.trim())).toBeInTheDocument();
    if (otherTitle.suffix)
      expect(screen.getByText(otherTitle.suffix.trim())).toBeInTheDocument();
  });

  it("curator view renders remove/block/edit buttons for a non-curator row, none for its own row", () => {
    const session = makeRosterSession(true);
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    expect(
      screen.getByRole("button", { name: "Remove Rival" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove and block Rival" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit nickname for Rival" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove Seeker" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove and block Seeker" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit nickname for Seeker" }),
    ).not.toBeInTheDocument();
  });

  it("clicking Remove calls session.removePlayer with that player's id", async () => {
    const session = makeRosterSession(true);
    const removeSpy = vi.spyOn(session, "removePlayer");
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    await fireEvent.click(screen.getByRole("button", { name: "Remove Rival" }));

    expect(removeSpy).toHaveBeenCalledWith("p-other");
  });

  it("inline rename: edit → input appears; Enter persists via the nickname endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const session = makeRosterSession(true);
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    await fireEvent.click(
      screen.getByRole("button", { name: "Edit nickname for Rival" }),
    );
    const input = screen.getByLabelText("Edit nickname for Rival");
    expect(input).toBeInTheDocument();

    await fireEvent.input(input, { target: { value: "Renamed" } });
    await fireEvent.keyDown(input, { key: "Enter" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/lobby/player",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ playerId: "p-other", nickname: "Renamed" }),
      }),
    );
    vi.unstubAllGlobals();
  });

  it("curator alone: own row and the divider render, with the no-players line beneath", () => {
    const session = makeRosterSession(true);
    session.players = session.players.slice(0, 1);
    const { container } = render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    expect(screen.getByText("Seeker")).toBeInTheDocument();
    expect(container.textContent).toContain("versus");
    expect(container.textContent).toContain("No players yet.");
  });

  it("rename moves focus into the editor and back to the pencil on Enter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    const session = makeRosterSession(true);
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Edit nickname for Rival" }),
    );
    await tick();
    const input = screen.getByLabelText("Edit nickname for Rival");
    expect(document.activeElement).toBe(input);
    await fireEvent.keyDown(input, { key: "Enter" });
    await tick();
    await tick();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Edit nickname for Rival" }),
    );
    vi.unstubAllGlobals();
  });

  it("player view renders the versus divider and titles, no remove/block buttons", () => {
    const session = makeRosterSession(false);
    render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );

    expect(screen.getByText("versus")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
    const otherTitle = getLobbyTitle("Rival");
    if (otherTitle.prefix)
      expect(screen.getByText(otherTitle.prefix.trim())).toBeInTheDocument();
    if (otherTitle.suffix)
      expect(screen.getByText(otherTitle.suffix.trim())).toBeInTheDocument();
  });
});

describe("lobby roster — pending join requests", () => {
  const pendingRow = {
    id: "p-pending",
    nickname: "Lurker",
    avatar: "",
    score: 0,
    status: "pending" as const,
  };

  it("player view does not render a pending row's nickname", () => {
    const session = makeRosterSession(false);
    session.players = [...session.players, pendingRow];
    const { container } = render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    expect(container.textContent).not.toContain("Lurker");
    expect(container.textContent).toContain("Rival");
  });

  it("curator view still lists it under Awaiting approval", () => {
    const session = makeRosterSession(true);
    session.players = [...session.players, pendingRow];
    const { container } = render(
      LobbyPage as never,
      {},
      { wrapper: LobbySessionHarness, wrapperProps: { session } },
    );
    expect(container.textContent).toContain("Awaiting approval (1)");
    expect(container.textContent).toContain("Lurker");
  });
});

describe("lobby seat count", () => {
  const row = (
    id: string,
    extra: Partial<MockQuizSession["players"][number]> = {},
  ) => ({
    id,
    nickname: id,
    avatar: "",
    score: 0,
    status: "active" as const,
    ...extra,
  });

  function seatSession(maxPlayers: number | null) {
    const session = makeRosterSession(false);
    session.lobbyAccessMode = "open";
    session.lobbyMaxPlayers = maxPlayers;
    session.players = [
      row("p-me"),
      row("rival"),
      row("waiting", { status: "pending" }),
      row("watcher", { role: "observer" }),
      row("host", { isCurator: true }),
    ];
    return session;
  }

  it("counts active and pending heroes, not observers or the curator", () => {
    const { container } = render(
      LobbyPage as never,
      {},
      {
        wrapper: LobbySessionHarness,
        wrapperProps: { session: seatSession(4) },
      },
    );
    expect(container.textContent).toContain("3/4 players");
  });

  it("shows no readout without a cap", () => {
    const { container } = render(
      LobbyPage as never,
      {},
      {
        wrapper: LobbySessionHarness,
        wrapperProps: { session: seatSession(null) },
      },
    );
    expect(container.textContent).not.toMatch(/\d+\/\d+ players/);
  });
});
