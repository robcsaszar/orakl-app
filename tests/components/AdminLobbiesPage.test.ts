import { avatars } from "@orakl/shared";
import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLobbiesPage from "../../src/routes/(app)/admin/lobbies/+page.svelte";

vi.mock("$app/navigation", () => ({ invalidate: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { invalidate } from "$app/navigation";
import { toast } from "../../src/lib/toast.js";

function lobby(over: Record<string, unknown> = {}) {
  return {
    code: "abc123",
    phase: "lobby",
    curator: { accountId: "cur-1", nickname: "Pythia" },
    playerCount: 1,
    observerCount: 0,
    ageSeconds: 30,
    roster: [
      {
        playerId: "p-pythia",
        nickname: "Pythia",
        avatarId: "adder",
        role: "player",
        status: "active",
        curator: true,
        signedIn: true,
      },
      {
        playerId: "p-alice",
        nickname: "Alice",
        avatarId: "custom-1",
        role: "player",
        status: "active",
        curator: false,
        signedIn: false,
      },
    ],
    ...over,
  };
}

const customAvatar = {
  id: "custom-1",
  title: "Custom",
  description: "",
  category: "misc",
  src: "https://img.test/custom-1.png",
};

const renderPage = (lobbies = [lobby()]) =>
  render(AdminLobbiesPage, {
    props: { data: { lobbies, avatars: [customAvatar] } } as never,
  });

let tab: { opener: unknown; location: { href: string }; close: () => void };

beforeEach(() => {
  vi.clearAllMocks();
  tab = { opener: {}, location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
});

describe("admin lobbies — Watch", () => {
  it("mints a display token for the row's code and opens the Display in a new tab", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ url: "http://x/curator/display?t=tok" }),
      } as Response),
    );
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /watch abc123/i }),
    );
    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/lobbies/display-token?code=abc123",
      { method: "POST" },
    );
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe("http://x/curator/display?t=tok");
  });

  it("closes the blank tab and says so when the mint fails", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({ ok: false, json: async () => ({}) } as Response),
    );
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /watch abc123/i }),
    );
    expect(tab.close).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("offers the display link in a toast when the browser blocks the tab", async () => {
    vi.mocked(window.open).mockReturnValueOnce(null);
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ url: "http://x/curator/display?t=tok" }),
      } as Response),
    );
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /watch abc123/i }),
    );
    expect(toast.info).toHaveBeenCalledTimes(1);
    const [, opts] = vi.mocked(toast.info).mock.calls[0];
    const action = (opts as { action: { label: string; onClick: () => void } })
      .action;
    expect(action.label).toBe("Open display");
    action.onClick();
    expect(window.open).toHaveBeenLastCalledWith(
      "http://x/curator/display?t=tok",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("gives every Lobby its own Watch control", () => {
    renderPage([lobby(), lobby({ code: "def456" })]);
    expect(screen.getAllByRole("button", { name: /^watch /i })).toHaveLength(2);
  });
});

describe("admin lobbies — Close", () => {
  it("posts the close only after the confirm click, then refreshes the list", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response),
    );
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /^close abc123$/i }),
    );
    expect(global.fetch).not.toHaveBeenCalled();
    await userEvent.click(
      await screen.findByRole("button", {
        name: /click again to close abc123/i,
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/lobbies/close?code=abc123",
      { method: "POST" },
    );
    expect(toast.success).toHaveBeenCalledWith("Lobby closed.");
    expect(invalidate).toHaveBeenCalledWith("app:admin-lobbies");
  });

  it("shows the server's error when the close fails", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "No such lobby" }),
      } as Response),
    );
    renderPage();
    await userEvent.click(
      screen.getByRole("button", { name: /^close abc123$/i }),
    );
    await userEvent.click(
      await screen.findByRole("button", {
        name: /click again to close abc123/i,
      }),
    );
    expect(toast.error).toHaveBeenCalledWith("No such lobby");
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("admin lobbies — Roster avatars", () => {
  it("shows each row's avatar, static or uploaded", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /^roster$/i }));
    expect(screen.getByRole("img", { name: "Pythia" })).toHaveAttribute(
      "src",
      avatars.find((a) => a.id === "adder")?.src,
    );
    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute(
      "src",
      customAvatar.src,
    );
  });
});

describe("admin lobbies — Remove", () => {
  const openRoster = () =>
    userEvent.click(screen.getByRole("button", { name: /^roster$/i }));

  it("offers no remove controls on the Curator's row", async () => {
    renderPage();
    await openRoster();
    expect(screen.queryByRole("button", { name: /remove pythia/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Remove Alice" }),
    ).toBeInTheDocument();
  });

  it("posts the player id to remove, then refreshes the list", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response),
    );
    renderPage();
    await openRoster();
    await userEvent.click(screen.getByRole("button", { name: "Remove Alice" }));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/lobbies/remove?code=abc123",
      { method: "POST", body: JSON.stringify({ playerId: "p-alice" }) },
    );
    expect(toast.success).toHaveBeenCalledWith("Alice removed.");
    expect(invalidate).toHaveBeenCalledWith("app:admin-lobbies");
  });

  it("acts once on a double click while the request runs", async () => {
    let answer: (r: Response) => void = () => {};
    global.fetch = vi.fn(
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    renderPage();
    await openRoster();
    const remove = screen.getByRole("button", { name: "Remove Alice" });
    await userEvent.click(remove);
    await userEvent.click(remove);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    answer({ ok: true, json: async () => ({ ok: true }) } as Response);
  });

  it("posts to block for Remove and block", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response),
    );
    renderPage();
    await openRoster();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove and block Alice" }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/lobbies/block?code=abc123",
      { method: "POST", body: JSON.stringify({ playerId: "p-alice" }) },
    );
    expect(toast.success).toHaveBeenCalledWith("Alice removed and blocked.");
  });

  it("shows the server's error when the removal fails", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "No such player" }),
      } as Response),
    );
    renderPage();
    await openRoster();
    await userEvent.click(screen.getByRole("button", { name: "Remove Alice" }));
    expect(toast.error).toHaveBeenCalledWith("No such player");
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("admin lobbies — Rename", () => {
  const openRoster = () =>
    userEvent.click(screen.getByRole("button", { name: /^roster$/i }));
  const startRename = async (nick: string) => {
    await openRoster();
    await userEvent.click(
      screen.getByRole("button", { name: `Rename ${nick}` }),
    );
    const input = screen.getByRole("textbox", {
      name: `New nickname for ${nick}`,
    });
    await userEvent.clear(input);
    await userEvent.type(input, "New");
  };

  it("offers Rename on the Curator's row too", async () => {
    renderPage();
    await openRoster();
    expect(
      screen.getByRole("button", { name: "Rename Pythia" }),
    ).toBeInTheDocument();
  });

  it("sends one rename when Enter is pressed twice while it runs", async () => {
    let answer: (r: Response) => void = () => {};
    global.fetch = vi.fn(
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );
    renderPage();
    await startRename("Alice");
    await userEvent.keyboard("{Enter}{Enter}");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    answer({ ok: true, json: async () => ({ ok: true }) } as Response);
  });

  it("posts the new nickname on Enter, then refreshes the list", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response),
    );
    renderPage();
    await startRename("Alice");
    await userEvent.keyboard("{Enter}");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/lobbies/rename?code=abc123",
      {
        method: "POST",
        body: JSON.stringify({ playerId: "p-alice", nickname: "New" }),
      },
    );
    expect(toast.success).toHaveBeenCalledWith("Renamed to New.");
    expect(invalidate).toHaveBeenCalledWith("app:admin-lobbies");
  });

  it("keeps the editor open and toasts the server's error on failure", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "Nickname already taken" }),
      } as Response),
    );
    renderPage();
    await startRename("Alice");
    await userEvent.click(
      screen.getByRole("button", { name: "Save nickname for Alice" }),
    );
    expect(toast.error).toHaveBeenCalledWith("Nickname already taken");
    expect(invalidate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("textbox", { name: "New nickname for Alice" }),
    ).toBeInTheDocument();
  });

  it("shows only save and cancel on the row being renamed", async () => {
    renderPage();
    await startRename("Alice");
    expect(screen.queryByRole("button", { name: "Remove Alice" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Remove and block Alice" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Rename Alice" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Save nickname for Alice" }),
    ).toBeInTheDocument();
  });

  it("focuses the rename input when the editor opens", async () => {
    renderPage();
    await openRoster();
    await userEvent.click(screen.getByRole("button", { name: "Rename Alice" }));
    expect(
      screen.getByRole("textbox", { name: "New nickname for Alice" }),
    ).toHaveFocus();
  });

  it("returns focus to Rename on Escape", async () => {
    renderPage();
    await startRename("Alice");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Rename Alice" }),
      ).toHaveFocus(),
    );
  });

  it("returns focus for a nickname with a quote in it", async () => {
    const quoted = lobby();
    quoted.roster[1] = { ...quoted.roster[1], nickname: 'Bo"b' };
    renderPage([quoted]);
    await startRename('Bo"b');
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: 'Rename Bo"b' })).toHaveFocus(),
    );
  });

  it("shows sentence-case badges", async () => {
    renderPage();
    await openRoster();
    expect(screen.getByText("Curator")).toBeInTheDocument();
    expect(screen.getAllByText("Player").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getByText("Guest")).toBeInTheDocument();
    expect(screen.getByText("Signed in")).toBeInTheDocument();
  });

  it("closes the editor on Escape without posting", async () => {
    global.fetch = vi.fn();
    renderPage();
    await startRename("Alice");
    await userEvent.keyboard("{Escape}");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("textbox", { name: "New nickname for Alice" }),
    ).toBeNull();
  });
});

describe("admin lobbies — game controls", () => {
  const okFetch = () =>
    vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response),
    );

  it("shows no stop or intermission control while the lobby has no game", () => {
    renderPage([lobby({ phase: "lobby" })]);
    expect(screen.queryByRole("button", { name: /stop game/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /intermission/i })).toBeNull();
  });

  it("stops a playing game only after the confirm click, then refreshes", async () => {
    global.fetch = okFetch();
    renderPage([lobby({ phase: "playing" })]);
    await userEvent.click(
      screen.getByRole("button", { name: /^stop game abc123$/i }),
    );
    expect(global.fetch).not.toHaveBeenCalled();
    await userEvent.click(
      await screen.findByRole("button", {
        name: /click again to stop game abc123/i,
      }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/lobbies/stop?code=abc123",
      { method: "POST" },
    );
    expect(toast.success).toHaveBeenCalledWith("Game stopped.");
    expect(invalidate).toHaveBeenCalledWith("app:admin-lobbies");
  });

  it("starts an intermission on a playing game", async () => {
    global.fetch = okFetch();
    renderPage([lobby({ phase: "playing" })]);
    await userEvent.click(
      screen.getByRole("button", { name: /^start intermission abc123$/i }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/lobbies/intermission?code=abc123",
      { method: "POST", body: JSON.stringify({ action: "start" }) },
    );
    expect(toast.success).toHaveBeenCalledWith("Intermission started.");
    expect(invalidate).toHaveBeenCalledWith("app:admin-lobbies");
  });

  it("ends an intermission and offers no start", async () => {
    global.fetch = okFetch();
    renderPage([lobby({ phase: "intermission" })]);
    expect(
      screen.queryByRole("button", { name: /start intermission/i }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /^stop game abc123$/i }),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: /^end intermission abc123$/i }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/lobbies/intermission?code=abc123",
      { method: "POST", body: JSON.stringify({ action: "end" }) },
    );
    expect(toast.success).toHaveBeenCalledWith("Intermission ended.");
  });

  it("shows the server's error when an intermission fails", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "Not in intermission" }),
      } as Response),
    );
    renderPage([lobby({ phase: "round_results" })]);
    await userEvent.click(
      screen.getByRole("button", { name: /^start intermission abc123$/i }),
    );
    expect(toast.error).toHaveBeenCalledWith("Not in intermission");
    expect(invalidate).toHaveBeenCalledWith("app:admin-lobbies");
  });
});
