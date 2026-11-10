/**
 * Pre-join lobby watch — connectStatusStream polls /api/lobby on an interval.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  QuizSession,
  STATUS_POLL_MS,
} from "../src/lib/svelte/quizSession.svelte.js";

vi.mock("../src/lib/storage.js", () => ({
  storage: {
    getNickname: vi.fn().mockReturnValue(null),
    setNickname: vi.fn(),
    removeNickname: vi.fn(),
    getPlayerId: vi.fn().mockReturnValue(null),
    setPlayerId: vi.fn(),
    removePlayerId: vi.fn(),
    getLobbyCode: vi.fn().mockReturnValue(null),
    setLobbyCode: vi.fn(),
    removeLobbyCode: vi.fn(),
    getAvatar: vi.fn().mockReturnValue(null),
    setAvatar: vi.fn(),
    getRole: vi.fn().mockReturnValue(null),
    setRole: vi.fn(),
  },
}));

vi.mock("../src/lib/wakeLock.js", () => ({
  requestWakeLock: vi.fn(),
  releaseWakeLock: vi.fn(),
}));

vi.mock("@orakl/client-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@orakl/client-core")>();
  return {
    ...actual,
    createCountdown: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  };
});

function lobbyResponse(active: boolean, extra: Record<string, unknown> = {}) {
  return { ok: true, json: vi.fn().mockResolvedValue({ active, ...extra }) };
}

describe("connectStatusStream (pre-join poll)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("polls /api/lobby immediately and applies an active lobby", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      lobbyResponse(true, {
        code: "abcd",
        quizName: "Trivia",
        categories: ["x"],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();

    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledWith("/api/lobby");
    expect(session.quizName).toBe("Trivia");
    expect(session.phase).toBe("lobby");
    session.destroy();
  });

  it("polls by ?code= when the visitor has a code (anonymous, no cookie)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        lobbyResponse(true, { quizName: "Trivia", categories: ["x"] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();
    session.lobbyCode = "Iron-Vault";

    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledWith("/api/lobby?code=iron-vault");
    expect(session.phase).toBe("lobby");
    session.destroy();
  });

  it("does not wipe the visitor's code on an inactive poll (no bounce to /join)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(lobbyResponse(false));
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();
    session.lobbyCode = "iron-vault";
    session.phase = "lobby";

    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);

    // A transient/anonymous miss must not strand them: the entered code survives
    // and the phase is preserved (no bounce back to the join screen).
    expect(session.lobbyCode).toBe("iron-vault");
    expect(session.phase).toBe("lobby");
    session.destroy();
  });

  it("re-polls on the interval", async () => {
    const fetchMock = vi.fn().mockResolvedValue(lobbyResponse(false));
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();

    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);
    const first = fetchMock.mock.calls.length;

    await vi.advanceTimersByTimeAsync(STATUS_POLL_MS);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(first);
    session.destroy();
  });

  it("is idempotent — a second call does not start a second loop", async () => {
    const fetchMock = vi.fn().mockResolvedValue(lobbyResponse(false));
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();

    session.connectStatusStream();
    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock.mock.calls.length).toBe(1); // one immediate poll, not two
    session.destroy();
  });

  it("stops polling on destroy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(lobbyResponse(false));
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();

    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);
    const count = fetchMock.mock.calls.length;

    session.destroy();
    await vi.advanceTimersByTimeAsync(STATUS_POLL_MS * 5);
    expect(fetchMock.mock.calls.length).toBe(count); // no further polls
  });
  it("resumes polling after a failed first join (409 nickname_taken)", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST")
        return {
          ok: false,
          status: 409,
          json: async () => ({ code: "nickname_taken", error: "Taken" }),
        };
      return lobbyResponse(true, { quizName: "Trivia" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();
    session.lobbyCode = "iron-vault";

    await session.connect("Ada");
    await vi.advanceTimersByTimeAsync(0);

    expect(session.error).toBe("Taken");
    expect(fetchMock).toHaveBeenCalledWith("/api/lobby?code=iron-vault");
    session.destroy();
  });

  it("a poll tick still in flight at destroy() writes nothing", async () => {
    let release: (() => void) | undefined;
    const fetchMock = vi.fn(async () => {
      await new Promise<void>((r) => {
        release = r;
      });
      return lobbyResponse(true, { code: "abcd", quizName: "Trivia" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { storage } = await import("../src/lib/storage.js");
    vi.mocked(storage.setLobbyCode).mockClear();
    const session = new QuizSession();

    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);
    expect(release).toBeDefined();
    session.destroy();
    release?.();
    await vi.advanceTimersByTimeAsync(0);

    expect(storage.setLobbyCode).not.toHaveBeenCalled();
    expect(session.phase).toBeNull();
    expect(session.quizName).toBe("");
  });

  it("initCodeEntry() stopped by destroy() mid-flight neither stores a code nor moves on", async () => {
    let release: (() => void) | undefined;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/avatars") return { ok: true, json: async () => [] };
      await new Promise<void>((r) => {
        release = r;
      });
      return lobbyResponse(true, { code: "abcd", quizName: "Trivia" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { storage } = await import("../src/lib/storage.js");
    vi.mocked(storage.setLobbyCode).mockClear();
    const session = new QuizSession();

    const pending = session.initCodeEntry();
    await vi.advanceTimersByTimeAsync(0);
    expect(release).toBeDefined();
    session.destroy();
    release?.();
    await pending;

    expect(storage.setLobbyCode).not.toHaveBeenCalled();
    expect(session.phase).toBeNull();
    expect(session.quizName).toBe("");
  });

  it("initCodeEntry() whose lobby lookup fails after destroy() starts no poll", async () => {
    let fail: ((e: Error) => void) | undefined;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/avatars") return { ok: true, json: async () => [] };
      await new Promise<never>((_, rej) => {
        fail = rej;
      });
      throw new Error("unreachable");
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();

    const pending = session.initCodeEntry();
    await vi.advanceTimersByTimeAsync(0);
    expect(fail).toBeDefined();
    session.destroy();
    fail?.(new Error("network"));
    await pending;
    await vi.advanceTimersByTimeAsync(STATUS_POLL_MS * 3);

    // The one lookup initCodeEntry made itself; no poll follows it.
    expect(
      fetchMock.mock.calls.filter(([u]) => String(u).startsWith("/api/lobby"))
        .length,
    ).toBe(1);
  });

  it("validateCode() answered after destroy() applies nothing", async () => {
    let release: (() => void) | undefined;
    const fetchMock = vi.fn(async () => {
      await new Promise<void>((r) => {
        release = r;
      });
      return lobbyResponse(true, { code: "abcd", quizName: "Trivia" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();
    session.lobbyCode = "abcd";

    const pending = session.validateCode();
    await vi.advanceTimersByTimeAsync(0);
    session.destroy();
    release?.();

    expect(await pending).toBe(false);
    expect(session.quizName).toBe("");
  });

  it("validateCode()'s fallback lookup answered after destroy() applies nothing", async () => {
    let release: (() => void) | undefined;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("?code=")) return lobbyResponse(false);
      await new Promise<void>((r) => {
        release = r;
      });
      return lobbyResponse(true, { code: "abcd", quizName: "Trivia" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();
    session.lobbyCode = "abcd";

    const pending = session.validateCode();
    await vi.advanceTimersByTimeAsync(0);
    expect(release).toBeDefined();
    session.destroy();
    release?.();

    expect(await pending).toBe(false);
    expect(session.quizName).toBe("");
    expect(session.error).toBe("");
  });

  it("validateCode() whose lookup fails after destroy() sets no error", async () => {
    let fail: ((e: Error) => void) | undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<never>((_, rej) => {
          fail = rej;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();
    session.lobbyCode = "abcd";

    const pending = session.validateCode();
    await vi.advanceTimersByTimeAsync(0);
    session.destroy();
    fail?.(new Error("network"));

    expect(await pending).toBe(false);
    expect(session.error).toBe("");
  });

  it("keeps an error set while polling", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(lobbyResponse(false)));
    const session = new QuizSession();
    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);

    session.error = "Not connected";
    await vi.advanceTimersByTimeAsync(STATUS_POLL_MS);

    expect(session.error).toBe("Not connected");
    session.destroy();
  });

  it("leaves polling stopped after a 201 join", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST")
        return {
          ok: true,
          status: 201,
          json: async () => ({ playerId: "p1", status: "active" }),
        };
      return lobbyResponse(false);
    });
    vi.stubGlobal("fetch", fetchMock);
    const session = new QuizSession();
    session.connectStatusStream();
    await vi.advanceTimersByTimeAsync(0);

    await session.connect("Ada");
    fetchMock.mockClear();
    await vi.advanceTimersByTimeAsync(STATUS_POLL_MS * 2);

    expect(fetchMock).not.toHaveBeenCalled();
    session.destroy();
  });
});
