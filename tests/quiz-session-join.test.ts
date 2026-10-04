/**
 * QuizSession join, validate, reconnect, fatal and leave paths — driven through
 * the injectable PlayerSessionFactory seam and a stubbed fetch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PlayerSession,
  PlayerSessionCallbacks,
} from "../src/lib/player-session.js";
import { storage } from "../src/lib/storage.js";
import {
  JOIN_ERROR_COPY,
  QuizSession,
} from "../src/lib/svelte/quizSession.svelte.js";
import { toast } from "../src/lib/toast.js";

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
    getDeviceId: vi.fn().mockReturnValue("dev-1"),
    setDeviceId: vi.fn(),
    removeQuizConfig: vi.fn(),
  },
}));

vi.mock("../src/lib/toast.js", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
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

type Reply = { status?: number; body?: unknown; throws?: boolean };

/** fetch keyed by `METHOD pathname`; unlisted routes answer 404 `{}`. */
function stubFetch(routes: Record<string, Reply>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    const reply = routes[key] ?? { status: 404, body: {} };
    if (reply.throws) throw new Error("network");
    const status = reply.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (reply.body === undefined) throw new Error("not json");
        return reply.body;
      },
    } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

function makeSession() {
  const stub: PlayerSession = {
    connect: vi.fn(),
    send: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    destroy: vi.fn(),
  };
  let callbacks: PlayerSessionCallbacks | null = null;
  const factory = vi.fn((cb: PlayerSessionCallbacks) => {
    callbacks = cb;
    return stub;
  });
  const session = new QuizSession({ sessionFactory: factory });
  return { session, stub, factory, callbacks: () => callbacks };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(storage.getNickname).mockReturnValue(null);
  vi.mocked(storage.getPlayerId).mockReturnValue(null);
  vi.mocked(storage.getLobbyCode).mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateCode", () => {
  it("returns true for a known code and applies its meta", async () => {
    const f = stubFetch({
      "GET /api/lobby": {
        body: { active: true, quizName: "Trivia", categories: ["x"] },
      },
    });
    const { session } = makeSession();
    session.lobbyCode = "Iron-Vault";

    expect(await session.validateCode()).toBe(true);
    expect(f).toHaveBeenCalledWith("/api/lobby?code=iron-vault");
    expect(session.quizName).toBe("Trivia");
  });

  it("returns false with the no-lobby copy for an unknown code", async () => {
    stubFetch({ "GET /api/lobby": { body: { active: false } } });
    const { session } = makeSession();
    session.lobbyCode = "nope";

    expect(await session.validateCode()).toBe(false);
    expect(session.error).toMatch(/^No active lobby/);
  });

  it("returns false on a network error", async () => {
    stubFetch({ "GET /api/lobby": { throws: true } });
    const { session } = makeSession();
    session.lobbyCode = "iron-vault";

    expect(await session.validateCode()).toBe(false);
    expect(session.error).toBe("Could not reach the game server.");
  });

  it("returns false without fetching for an empty code", async () => {
    const f = stubFetch({});
    const { session } = makeSession();
    session.lobbyCode = "  ";

    expect(await session.validateCode()).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("connect", () => {
  it("seats an active player and opens the socket", async () => {
    stubFetch({
      "POST /api/lobby/join": {
        status: 201,
        body: { playerId: "p1", status: "active", role: "player" },
      },
    });
    const { session, stub } = makeSession();

    await session.connect("Ada");

    expect(session.membership).toBe("active");
    expect(session.phase).toBe("lobby");
    expect(storage.setPlayerId).toHaveBeenCalledWith("p1");
    expect(stub.connect).toHaveBeenCalled();
    expect(session.isJoining).toBe(false);
  });

  it("keeps a pending player pending and opens the socket", async () => {
    stubFetch({
      "POST /api/lobby/join": {
        status: 201,
        body: { playerId: "p1", status: "pending" },
      },
    });
    const { session, stub } = makeSession();

    await session.connect("Ada");

    expect(session.membership).toBe("pending");
    expect(stub.connect).toHaveBeenCalled();
  });

  it("shows the server message on 429 and opens no socket", async () => {
    stubFetch({
      "POST /api/lobby/join": {
        status: 429,
        body: { error: "Too many requests" },
      },
    });
    const { session, stub } = makeSession();

    await session.connect("Ada");

    expect(session.error).toBe("Too many requests");
    expect(session.isJoining).toBe(false);
    expect(stub.connect).not.toHaveBeenCalled();
  });

  it("falls back to the connect copy on a non-JSON 502", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch({ "POST /api/lobby/join": { status: 502 } });
    const { session } = makeSession();

    await session.connect("Ada");

    expect(session.error).toBe("Could not connect to the game server.");
    expect(session.isJoining).toBe(false);
  });

  it("device_blocked on a first join drops the stored playerId", async () => {
    stubFetch({
      "POST /api/lobby/join": {
        status: 403,
        body: { code: "device_blocked" },
      },
    });
    const { session } = makeSession();
    session.playerId = "stale";

    await session.connect("Ada");

    expect(session.error).toBe(JOIN_ERROR_COPY.device_blocked);
    expect(session.playerId).toBeNull();
    expect(storage.removePlayerId).toHaveBeenCalled();
  });
});

describe("init reconnect failures", () => {
  async function reconnectWith(reply: Reply) {
    vi.mocked(storage.getNickname).mockReturnValue("Ada");
    vi.mocked(storage.getPlayerId).mockReturnValue("p1");
    vi.mocked(storage.getLobbyCode).mockReturnValue("iron-vault");
    stubFetch({
      "GET /api/avatars": { body: [] },
      "POST /api/lobby/join": reply,
    });
    const made = makeSession();
    await made.session.init({ isLoggedIn: false, profileAvatarId: "" });
    return made.session;
  }

  function expectCodeEntry(session: QuizSession) {
    expect(session.isReconnecting).toBe(false);
    expect(session.membership).toBe("none");
    expect(session.phase).toBeNull();
  }

  it("device_blocked resets to code-entry and forgets the seat", async () => {
    const session = await reconnectWith({
      status: 403,
      body: { code: "device_blocked" },
    });
    expectCodeEntry(session);
    expect(session.playerId).toBeNull();
    expect(storage.removePlayerId).toHaveBeenCalled();
  });

  it("device_in_lobby resets and removes the stored lobby code", async () => {
    const session = await reconnectWith({
      status: 409,
      body: { code: "device_in_lobby" },
    });
    expectCodeEntry(session);
    expect(session.error).toBe(JOIN_ERROR_COPY.device_in_lobby);
    expect(storage.removeLobbyCode).toHaveBeenCalled();
  });

  it("a generic 404 resets the same state", async () => {
    const session = await reconnectWith({
      status: 404,
      body: { error: "No active lobby" },
    });
    expectCodeEntry(session);
    expect(storage.removeLobbyCode).toHaveBeenCalled();
  });
});

describe("onConnectionFatal", () => {
  it("clears storage, flags connectionLost and destroys the socket", async () => {
    stubFetch({
      "POST /api/lobby/join": {
        status: 201,
        body: { playerId: "p1", status: "active" },
      },
    });
    const { session, stub, callbacks } = makeSession();
    await session.connect("Ada");

    callbacks()?.onFatal?.();

    expect(session.connectionLost).toBe(true);
    expect(session.membership).toBe("none");
    expect(session.playerId).toBeNull();
    expect(storage.removePlayerId).toHaveBeenCalled();
    expect(storage.removeLobbyCode).toHaveBeenCalled();
    expect(stub.destroy).toHaveBeenCalled();
  });
});

describe("leaveLobby", () => {
  async function seated() {
    stubFetch({
      "POST /api/lobby/join": {
        status: 201,
        body: { playerId: "p1", status: "active" },
      },
    });
    const made = makeSession();
    made.session.lobbyCode = "iron-vault";
    await made.session.connect("Ada");
    vi.clearAllMocks();
    return made;
  }

  it("on 200 destroys the socket, forgets the seat and drops to code-entry", async () => {
    const { session, stub } = await seated();
    const f = stubFetch({ "DELETE /api/lobby/me": { body: { ok: true } } });

    await session.leaveLobby();

    expect(f).toHaveBeenCalledWith("/api/lobby/me", { method: "DELETE" });
    expect(stub.destroy).toHaveBeenCalled();
    expect(storage.removePlayerId).toHaveBeenCalled();
    expect(storage.removeLobbyCode).toHaveBeenCalled();
    expect(session.membership).toBe("none");
    expect(session.phase).toBeNull();
    expect(session.playerId).toBeNull();
    expect(session.isReconnecting).toBe(false);
  });

  it("toasts and keeps state on a 403", async () => {
    const { session, stub } = await seated();
    stubFetch({ "DELETE /api/lobby/me": { status: 403, body: {} } });

    await session.leaveLobby();

    expect(toast.error).toHaveBeenCalledWith("Couldn't leave. Try again.");
    expect(stub.destroy).not.toHaveBeenCalled();
    expect(storage.removePlayerId).not.toHaveBeenCalled();
    expect(session.membership).toBe("active");
    expect(session.playerId).toBe("p1");
  });

  it("toasts and keeps state on a thrown fetch", async () => {
    const { session } = await seated();
    stubFetch({ "DELETE /api/lobby/me": { throws: true } });

    await session.leaveLobby();

    expect(toast.error).toHaveBeenCalledWith("Couldn't leave. Try again.");
    expect(session.membership).toBe("active");
    expect(storage.removeLobbyCode).not.toHaveBeenCalled();
  });

  it("init() afterwards sends no join POST", async () => {
    const { session } = await seated();
    stubFetch({ "DELETE /api/lobby/me": { body: { ok: true } } });
    await session.leaveLobby();

    vi.useFakeTimers();
    const f = stubFetch({ "GET /api/avatars": { body: [] } });
    await session.init({ isLoggedIn: false, profileAvatarId: "" });
    session.destroy();
    vi.useRealTimers();

    const joins = f.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(joins).toHaveLength(0);
  });
});
