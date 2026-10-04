/**
 * QuizSession unit tests — drive state via the injectable PlayerSessionFactory
 * seam; no real socket, no network.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PlayerSession,
  PlayerSessionCallbacks,
} from "../src/lib/player-session.js";
import { storage } from "../src/lib/storage.js";
import { QuizSession } from "../src/lib/svelte/quizSession.svelte.js";

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
    removeQuizConfig: vi.fn(),
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

// ── Factory helper ─────────────────────────────────────────────────────────────

function makeFactory() {
  let captured: PlayerSessionCallbacks | null = null;
  const stub: PlayerSession = {
    connect: vi.fn(),
    send: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    destroy: vi.fn(),
  };
  const factory = (opts: PlayerSessionCallbacks) => {
    captured = opts;
    return stub;
  };
  const send = (msg: Record<string, unknown>) => {
    if (!captured) throw new Error("factory not called yet");
    captured.onMessage(msg as Parameters<typeof captured.onMessage>[0]);
  };
  return { factory, stub, send };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("QuizSession (injectable factory)", () => {
  let session: QuizSession;
  let send: (msg: Record<string, unknown>) => void;
  let stub: PlayerSession;

  beforeEach(() => {
    const f = makeFactory();
    session = new QuizSession({ sessionFactory: f.factory });
    send = f.send;
    stub = f.stub;
    // Instantiate the transport so server frames can be fed and action sends
    // captured (connectStatusStream now polls REST, not the socket factory).
    (session as unknown as { getSession(): PlayerSession }).getSession();
  });

  // ── lobby:update ────────────────────────────────────────────────────────────

  describe("lobby:update", () => {
    it("updates players list", () => {
      send({
        type: "lobby:update",
        players: [
          {
            id: "p1",
            nickname: "Alice",
            avatar: "",
            score: 0,
            status: "active",
          },
        ],
        accessMode: "open",
        maxPlayers: null,
      });
      expect(session.players).toHaveLength(1);
      expect(session.players[0].nickname).toBe("Alice");
    });

    it("updates lobbyAccessMode and lobbyMaxPlayers", () => {
      send({
        type: "lobby:update",
        players: [],
        accessMode: "invite-only",
        maxPlayers: 10,
      });
      expect(session.lobbyAccessMode).toBe("invite-only");
      expect(session.lobbyMaxPlayers).toBe(10);
    });

    it("resyncs isObserver from the self row (curator's 'Update quiz' hero<->observer flip has no other signal)", () => {
      session.playerId = "cur-1";
      session.isObserver = false;
      send({
        type: "lobby:update",
        players: [
          {
            id: "cur-1",
            nickname: "Host",
            avatar: "",
            score: 0,
            status: "active",
            role: "observer",
            isCurator: true,
          },
        ],
        accessMode: "open",
        maxPlayers: null,
      });
      expect(session.isObserver).toBe(true);
    });

    it("applies quiz meta from a curator edit (#963)", () => {
      send({
        type: "lobby:update",
        players: [],
        accessMode: "open",
        maxPlayers: null,
        quizName: "Quiz II",
        description: "New desc",
        categories: ["science"],
        difficulty: "hard",
      });
      expect(session.quizName).toBe("Quiz II");
      expect(session.description).toBe("New desc");
      expect(session.lobbyCategories).toEqual(["science"]);
      expect(session.lobbyDifficulty).toBe("hard");
    });

    it("leaves quiz meta untouched when the frame omits it (#963)", () => {
      send({
        type: "lobby:update",
        players: [],
        accessMode: "open",
        maxPlayers: null,
        quizName: "Quiz II",
        description: "New desc",
        categories: ["science"],
        difficulty: "hard",
      });
      send({
        type: "lobby:update",
        players: [],
        accessMode: "invite-only",
        maxPlayers: 5,
      });
      expect(session.quizName).toBe("Quiz II");
      expect(session.description).toBe("New desc");
      expect(session.lobbyCategories).toEqual(["science"]);
      expect(session.lobbyDifficulty).toBe("hard");
    });
  });

  // ── game:final-scores ────────────────────────────────────────────────────────

  describe("game:final-scores", () => {
    it("sets finalRoster from the frame; a following lobby:update role flip changes players but not finalRoster", () => {
      send({
        type: "game:final-scores",
        players: [
          {
            id: "cur-1",
            nickname: "Host",
            avatar: "",
            score: 5,
            status: "active",
            role: "player",
            isCurator: true,
          },
        ],
      });
      expect(session.finalRoster).toHaveLength(1);
      expect(session.finalRoster[0].role).toBe("player");

      send({
        type: "lobby:update",
        players: [
          {
            id: "cur-1",
            nickname: "Host",
            avatar: "",
            score: 5,
            status: "active",
            role: "observer",
            isCurator: true,
          },
        ],
        accessMode: "open",
        maxPlayers: null,
      });

      expect(session.players[0].role).toBe("observer");
      expect(session.finalRoster[0].role).toBe("player");
    });
  });

  const NOT_CONNECTED =
    "Not connected — your role wasn't submitted. Try again.";

  // ── submitRoleChoice (optimistic) ─────────────────────────────────────────────

  describe("submitRoleChoice (optimistic)", () => {
    it("locks roleSubmitted and sends player:role over the socket", () => {
      session.playerId = "p1";
      session.selectedRole = "observer";

      session.submitRoleChoice();
      expect(session.roleSubmitted).toBe(true);
      expect(stub.send).toHaveBeenCalledWith({
        type: "player:role",
        role: "observer",
      });
    });

    it("offline: clears error before setting it so a repeat press re-fires the layout toast", () => {
      vi.mocked(stub.isConnected).mockReturnValue(false);
      const seen: string[] = [];
      const desc = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(session),
        "error",
      );
      Object.defineProperty(session, "error", {
        get: () => desc?.get?.call(session),
        set: (v: string) => {
          seen.push(v);
          desc?.set?.call(session, v);
        },
        configurable: true,
      });

      session.submitRoleChoice();
      session.submitRoleChoice();

      expect(session.roleSubmitted).toBe(false);
      expect(seen).toEqual(["", NOT_CONNECTED, "", NOT_CONNECTED]);
    });
  });

  // ── player:removed ──────────────────────────────────────────────────────────

  describe("player:removed", () => {
    it("sets wasRemoved and clears playerId when it is this player", () => {
      session.playerId = "p1";
      send({ type: "player:removed", playerId: "p1" });
      expect(session.wasRemoved).toBe(true);
      expect(session.playerId).toBeNull();
    });

    it("does nothing when a different player is removed", () => {
      session.playerId = "p1";
      send({ type: "player:removed", playerId: "p2" });
      expect(session.wasRemoved).toBe(false);
      expect(session.playerId).toBe("p1");
    });
  });

  // ── lobby:ended ─────────────────────────────────────────────────────────────

  describe("lobby:ended", () => {
    it("clears identity and resets membership", () => {
      session.playerId = "p1";
      session.lobbyCode = "ABC123";
      session.membership = "active";
      send({ type: "lobby:ended" });
      expect(session.playerId).toBeNull();
      expect(session.lobbyCode).toBe("");
      expect(session.membership).toBe("none");
      expect(session.phase).toBeNull();
    });

    it("calls destroy on the session transport", () => {
      send({ type: "lobby:ended" });
      expect(stub.destroy).toHaveBeenCalled();
    });

    it("sets lobbyClosed so the layout routes to /closed", () => {
      session.membership = "active";
      send({ type: "lobby:ended" });
      expect(session.lobbyClosed).toBe(true);
      expect(session.membership).toBe("none");
    });
  });

  describe("avatar dialog", () => {
    it("cancelling the picker drops a ticked save-to-profile", () => {
      session.saveToProfile = true;
      session.openAvatarSelector();
      session.closeAvatarSelector();
      expect(session.saveToProfile).toBe(false);
    });
  });

  describe("closeLobby (toolbox)", () => {
    it("drops the stored quiz config once the lobby is deleted", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);
      await session.closeLobby();
      expect(fetchMock).toHaveBeenCalledWith("/api/lobby", {
        method: "DELETE",
      });
      expect(storage.removeQuizConfig).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("keeps the stored quiz config when the delete fails", async () => {
      vi.mocked(storage.removeQuizConfig).mockClear();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
      await session.closeLobby();
      expect(storage.removeQuizConfig).not.toHaveBeenCalled();
      expect(session.error).toBe("Failed to close lobby");
      vi.unstubAllGlobals();
    });
  });

  // ── lobby:reset ─────────────────────────────────────────────────────────────

  describe("lobby:reset", () => {
    it("player: keeps membership and playerId, drops phase to lobby, flags curatorEditing", () => {
      session.playerId = "p1";
      session.lobbyCode = "abcd";
      session.membership = "active";
      session.phase = "final_scores";
      send({ type: "lobby:reset" });
      expect(session.curatorEditing).toBe(true);
      expect(session.phase).toBe("lobby");
      expect(session.membership).toBe("active");
      expect(session.playerId).toBe("p1");
      expect(session.lobbyCode).toBe("abcd");
      expect(stub.destroy).not.toHaveBeenCalled();
    });

    it("curator: flags curatorEditing so the layout routes to /curator/create", () => {
      session.isCurator = true;
      session.playerId = "cur-1";
      session.membership = "active";
      session.phase = "playing";
      send({ type: "lobby:reset" });
      expect(session.curatorEditing).toBe(true);
      expect(session.phase).toBe("lobby");
      expect(session.membership).toBe("active");
      expect(session.playerId).toBe("cur-1");
    });

    it("game:start clears curatorEditing", () => {
      send({ type: "lobby:reset" });
      expect(session.curatorEditing).toBe(true);
      send({ type: "game:start", timerDuration: 30, totalQuestions: 5 });
      expect(session.curatorEditing).toBe(false);
    });
  });

  // ── lobby:rejected ──────────────────────────────────────────────────────────

  describe("lobby:rejected", () => {
    it("sets error message and resets membership", () => {
      session.membership = "pending";
      send({ type: "lobby:rejected" });
      expect(session.error).toBeTruthy();
      expect(session.membership).toBe("none");
    });

    it("calls destroy on the session transport", () => {
      send({ type: "lobby:rejected" });
      expect(stub.destroy).toHaveBeenCalled();
    });
  });

  // ── lobby:approved ──────────────────────────────────────────────────────────

  describe("lobby:approved", () => {
    it("sets membership to active and clears reconnecting state", () => {
      session.membership = "pending";
      session.isReconnecting = true;
      send({ type: "lobby:approved", midGame: false });
      expect(session.membership).toBe("active");
      expect(session.isReconnecting).toBe(false);
    });
  });

  describe("lobby:update while pending", () => {
    const roster = (status: string, role = "player") => ({
      type: "lobby:update",
      players: [
        { id: "p1", nickname: "Me", avatar: "", score: 0, status, role },
      ],
      accessMode: "invite-only",
      maxPlayers: null,
    });

    beforeEach(() => {
      session.playerId = "p1";
      session.membership = "pending";
      session.isReconnecting = true;
    });

    it("recovers approval when the own row is active", () => {
      send(roster("active"));
      expect(session.membership).toBe("active");
      expect(session.phase).toBe("lobby");
      expect(session.isReconnecting).toBe(false);
    });

    it("stays pending while the own row is pending", () => {
      send(roster("pending"));
      expect(session.membership).toBe("pending");
    });

    it("seats an approved observer as observer", () => {
      send(roster("active", "observer"));
      expect(session.isObserver).toBe(true);
      expect(session.selectedRole).toBe("observer");
    });
  });

  // ── game:intermission / game:resume ─────────────────────────────────────────

  describe("game:intermission and game:resume", () => {
    it("sets isIntermission on intermission", () => {
      send({ type: "game:intermission" });
      expect(session.isIntermission).toBe(true);
    });

    it("clears isIntermission on resume", () => {
      send({ type: "game:intermission" });
      send({ type: "game:resume" });
      expect(session.isIntermission).toBe(false);
    });
  });

  // ── between-question countdown (#1094) ────────────────────────────────────

  describe("between-question countdown", () => {
    const reveal = () =>
      send({
        type: "game:round-result",
        correctAnswerId: "a1",
        players: [],
        playerAnswers: {},
      });

    it("counts the configured delay: auto_10 starts at 10, auto_5 at 5", () => {
      send({
        type: "game:start",
        timerDuration: 30,
        totalQuestions: 5,
        advanceMode: "auto_10",
      });
      reveal();
      expect(session.nextQuestionCountdownTotal).toBe(10);
      expect(session.nextQuestionCountdown).toBe(10);
      send({
        type: "game:start",
        timerDuration: 30,
        totalQuestions: 5,
        advanceMode: "auto_5",
      });
      reveal();
      expect(session.nextQuestionCountdown).toBe(5);
    });

    it("a replayed reveal starts the ring at the server's remaining seconds", () => {
      send({
        type: "game:start",
        timerDuration: 30,
        totalQuestions: 5,
        advanceMode: "auto_10",
      });
      send({
        type: "game:round-result",
        correctAnswerId: "a1",
        players: [],
        playerAnswers: {},
        countdownRemaining: 2,
      });
      expect(session.nextQuestionCountdownTotal).toBe(10);
      expect(session.nextQuestionCountdown).toBe(2);
    });

    it("a replayed reveal with no seconds left starts no ring", () => {
      vi.useFakeTimers();
      try {
        send({
          type: "game:start",
          timerDuration: 30,
          totalQuestions: 5,
          advanceMode: "auto_10",
        });
        send({
          type: "game:round-result",
          correctAnswerId: "a1",
          players: [],
          playerAnswers: {},
          countdownRemaining: 0,
        });
        vi.advanceTimersByTime(1_500);
        expect(session.nextQuestionCountdown).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it("manual lobbies count nothing", () => {
      send({
        type: "game:start",
        timerDuration: 30,
        totalQuestions: 5,
        advanceMode: "manual",
      });
      reveal();
      expect(session.nextQuestionCountdownTotal).toBe(0);
      expect(session.nextQuestionCountdown).toBe(0);
    });

    it("resets to the full delay on game:resume while the reveal is showing", () => {
      send({
        type: "game:start",
        timerDuration: 30,
        totalQuestions: 5,
        advanceMode: "auto_10",
      });
      reveal();
      session.nextQuestionCountdown = 3;
      send({ type: "game:intermission" });
      send({ type: "game:resume" });
      expect(session.nextQuestionCountdown).toBe(10);
    });

    it("a resume mid-question leaves the countdown alone", () => {
      send({
        type: "game:start",
        timerDuration: 30,
        totalQuestions: 5,
        advanceMode: "auto_10",
      });
      send({ type: "game:intermission" });
      send({ type: "game:resume" });
      expect(session.nextQuestionCountdown).toBe(0);
    });
  });

  // ── role:selection-start ─────────────────────────────────────────────────────

  describe("role:selection-start", () => {
    it("sets phase to role_selection and updates players", () => {
      send({
        type: "role:selection-start",
        players: [
          {
            id: "p1",
            nickname: "Alice",
            avatar: "",
            score: 0,
            status: "active",
          },
        ],
        timeRemaining: 30,
      });
      expect(session.phase).toBe("role_selection");
      expect(session.roleSelectionTimeRemaining).toBe(30);
      expect(session.roleSelectionLocked).toBe(false);
    });
  });

  // ── game:round-result (own streak) ───────────────────────────────────────

  describe("game:round-result — streak", () => {
    it("sets streak and flourish from the reveal message", () => {
      send({
        type: "game:round-result",
        correctAnswerId: "a",
        players: [],
        playerAnswers: {},
        yourStreak: { streak: 3, flourish: { kind: "gain", value: 3 } },
      });
      expect(session.streak).toBe(3);
      expect(session.streakFlourish).toEqual({ kind: "gain", value: 3 });
    });

    it("defaults to streak 0 and no flourish when yourStreak is absent", () => {
      session.streak = 5;
      session.streakFlourish = { kind: "gain", value: 5 };
      send({
        type: "game:round-result",
        correctAnswerId: "a",
        players: [],
        playerAnswers: {},
      });
      expect(session.streak).toBe(0);
      expect(session.streakFlourish).toBeNull();
    });

    it("resets streak state on game:start", () => {
      send({
        type: "game:round-result",
        correctAnswerId: "a",
        players: [],
        playerAnswers: {},
        yourStreak: { streak: 3, flourish: { kind: "gain", value: 3 } },
      });
      send({ type: "game:start", timerDuration: 30, totalQuestions: 5 });
      expect(session.streak).toBe(0);
      expect(session.streakFlourish).toBeNull();
    });
  });

  // ── applyStateMessages (SSR seed) ──────────────────────────────────────────
  describe("applyStateMessages (SSR seed)", () => {
    it("replays state messages through the normal handler", () => {
      session.applyStateMessages([
        {
          type: "game:start",
          totalQuestions: 3,
          timerDuration: 25,
          advanceMode: "manual",
        },
        {
          type: "game:question",
          questionIndex: 1,
          totalQuestions: 3,
          text: "Q?",
          categoryId: "cat",
          questionType: "true_false",
          answers: [
            { id: "a", text: "True" },
            { id: "b", text: "False" },
          ],
          timeRemaining: 12,
          serverTs: 0,
        },
      ]);
      expect(session.timerDuration).toBe(25);
      expect(session.advanceMode).toBe("manual");
      expect(session.phase).toBe("playing");
      expect(session.questionType).toBe("true_false");
      expect(session.answers).toHaveLength(2);
    });

    it("is a no-op for an empty list", () => {
      session.applyStateMessages([]);
      expect(session.phase).toBeNull();
    });
  });

  // ── seedLobbyRoster (SSR first-paint seed) ──────────────────────────────────
  describe("seedLobbyRoster", () => {
    it("seeds playerId, roster, access mode and max players", () => {
      session.seedLobbyRoster({
        playerId: "p1",
        players: [
          {
            id: "p1",
            nickname: "Alpha",
            avatar: "",
            score: 0,
            status: "active",
          },
          {
            id: "p2",
            nickname: "Beta",
            avatar: "",
            score: 0,
            status: "active",
          },
        ],
        accessMode: "invite-only",
        maxPlayers: 8,
      });
      expect(session.playerId).toBe("p1");
      expect(session.players).toHaveLength(2);
      expect(session.lobbyAccessMode).toBe("invite-only");
      expect(session.lobbyMaxPlayers).toBe(8);
    });

    it("leaves players untouched when none are provided (no lobby)", () => {
      session.players = [
        { id: "x", nickname: "X", avatar: "", score: 0, status: "active" },
      ];
      session.seedLobbyRoster({ playerId: "p9" });
      expect(session.playerId).toBe("p9");
      expect(session.players).toHaveLength(1); // unchanged
    });

    it("does not overwrite playerId with a null/empty seed", () => {
      session.playerId = "existing";
      session.seedLobbyRoster({ playerId: null });
      expect(session.playerId).toBe("existing");
    });
  });

  // ── optimistic profile edits on the self roster row (LOBBY-3) ───────────────
  describe("optimistic profile (self roster row)", () => {
    beforeEach(() => {
      session.playerId = "p1";
      session.membership = "active";
      session.players = [
        { id: "p1", nickname: "Old", avatar: "a1", score: 0, status: "active" },
        { id: "p2", nickname: "Bob", avatar: "a2", score: 0, status: "active" },
      ];
    });

    const self = () => session.players.find((p) => p.id === "p1");

    it("saveNickname updates the self row immediately, persists on ok", async () => {
      let resolveFetch: (v: unknown) => void = () => {};
      vi.stubGlobal(
        "fetch",
        vi.fn(
          () =>
            new Promise((r) => {
              resolveFetch = r;
            }),
        ),
      );
      const pending = session.saveNickname("NewName");
      expect(self()?.nickname).toBe("NewName"); // optimistic, pre-resolve
      resolveFetch({ ok: true });
      expect(await pending).toBeNull();
      expect(session.nickname).toBe("NewName");
      vi.unstubAllGlobals();
    });

    it("saveNickname reverts the self row on a non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error: "Taken" }),
        }),
      );
      expect(await session.saveNickname("NewName")).toBe("Taken");
      expect(self()?.nickname).toBe("Old"); // reverted
      vi.unstubAllGlobals();
    });

    it("saveNickname reverts the self row on a network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
      expect(await session.saveNickname("NewName")).toBe("Connection error");
      expect(self()?.nickname).toBe("Old");
      vi.unstubAllGlobals();
    });

    it("saveNickname skips the server round-trip when not in an active lobby (/join, pre-code-entry)", async () => {
      session.membership = "none";
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      expect(await session.saveNickname("NewName")).toBeNull();
      expect(session.nickname).toBe("NewName");
      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it("updateAvatarOnServer updates the self row avatar, reverts on non-ok", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      session.selectedAvatarId = "a9";
      let resolveFetch: (v: unknown) => void = () => {};
      vi.stubGlobal(
        "fetch",
        vi.fn(
          () =>
            new Promise((r) => {
              resolveFetch = r;
            }),
        ),
      );
      const pending = session.updateAvatarOnServer();
      expect(self()?.avatar).toBe("a9"); // optimistic
      resolveFetch({ ok: false, status: 400 });
      await pending;
      expect(self()?.avatar).toBe("a1"); // reverted
      vi.unstubAllGlobals();
    });

    it("never touches other players' rows", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
      await session.saveNickname("NewName");
      expect(session.players.find((p) => p.id === "p2")?.nickname).toBe("Bob");
      vi.unstubAllGlobals();
    });

    it("reverts only the failed field after an intervening lobby:update", async () => {
      let resolveFetch: (v: unknown) => void = () => {};
      vi.stubGlobal(
        "fetch",
        vi.fn(
          () =>
            new Promise((r) => {
              resolveFetch = r;
            }),
        ),
      );
      // Optimistic nickname edit in flight.
      const pending = session.saveNickname("NewName");
      expect(self()?.nickname).toBe("NewName");

      // An unrelated lobby:update swaps the whole roster (p1 keeps an avatar
      // change that landed server-side; p3 joined).
      send({
        type: "lobby:update",
        players: [
          {
            id: "p1",
            nickname: "NewName",
            avatar: "a-server",
            score: 1,
            status: "active",
          },
          {
            id: "p3",
            nickname: "Cara",
            avatar: "a3",
            score: 0,
            status: "active",
          },
        ],
        accessMode: "open",
        maxPlayers: null,
      });

      // Now the nickname save fails → only nickname reverts; avatar + the new
      // roster row stay intact (keyed revert + field-scoped restore).
      resolveFetch({ ok: false, json: async () => ({ error: "Taken" }) });
      expect(await pending).toBe("Taken");
      expect(self()?.nickname).toBe("Old"); // reverted to the captured value
      expect(self()?.avatar).toBe("a-server"); // untouched by the revert
      expect(session.players.find((p) => p.id === "p3")?.nickname).toBe("Cara");
      vi.unstubAllGlobals();
    });
  });

  // ── selectAnswer / sendEmote (socket actions + echo de-dupe) ────────────────
  describe("selectAnswer", () => {
    it("locks and sends player:answer over the socket", () => {
      session.playerId = "p1";
      session.answered = false;
      session.isObserver = false;
      session.timeRemaining = 30;
      session.selectAnswer("a1");
      expect(session.answered).toBe(true);
      expect(session.selectedAnswerId).toBe("a1");
      expect(stub.send).toHaveBeenCalledWith({
        type: "player:answer",
        answerId: "a1",
      });
    });

    it("no-ops once the timer has run out", () => {
      session.playerId = "p1";
      session.answered = false;
      session.isObserver = false;
      session.timeRemaining = 0;
      session.selectAnswer("a1");
      expect(session.answered).toBe(false);
      expect(stub.send).not.toHaveBeenCalled();
    });
  });

  // ── question rating at the reveal ───────────────────────────────────────────
  describe("question rating", () => {
    function question(questionId: string) {
      send({
        type: "game:question",
        questionId,
        questionIndex: 0,
        totalQuestions: 2,
        text: "Q",
        categoryId: "c",
        questionType: "text_choice",
        answers: [{ id: "a1", text: "A" }],
        timeRemaining: 10,
        serverTs: 0,
      });
    }
    function reveal(withStreak: boolean) {
      send({
        type: "game:round-result",
        correctAnswerId: "a1",
        players: [],
        playerAnswers: {},
        ...(withStreak ? { yourStreak: { streak: 1, flourish: null } } : {}),
      });
    }

    it("sends player:rate with the question id on a tap", () => {
      question("q-1");
      reveal(true);
      session.rate("up");
      expect(stub.send).toHaveBeenCalledWith({
        type: "player:rate",
        questionId: "q-1",
        rating: "up",
      });
      expect(session.rating.pending).toBe("up");
    });

    it("queues a second tap before the ack and sends it after", () => {
      question("q-1");
      reveal(true);
      session.rate("up");
      session.rate("down");
      expect(stub.send).toHaveBeenCalledTimes(1);
      send({ type: "player:rate-ack", questionId: "q-1", ok: true });
      expect(session.rating.result).toMatchObject({ rating: "up", ok: true });
      expect(stub.send).toHaveBeenCalledTimes(2);
      expect(stub.send).toHaveBeenLastCalledWith({
        type: "player:rate",
        questionId: "q-1",
        rating: "down",
      });
    });

    it("ignores an ack for another question", () => {
      question("q-1");
      reveal(true);
      session.rate("up");
      send({ type: "player:rate-ack", questionId: "q-0", ok: true });
      expect(session.rating.pending).toBe("up");
      expect(session.rating.result).toBeNull();
    });

    it("resets the rating when the next question arrives", () => {
      question("q-1");
      reveal(true);
      session.rate("up");
      question("q-2");
      expect(session.rating.questionId).toBe("q-2");
      expect(session.rating.pending).toBeNull();
      expect(session.playedRound).toBe(false);
    });

    it("canRate is true for a logged-in player whose result has yourStreak", () => {
      session.isLoggedIn = true;
      question("q-1");
      reveal(true);
      expect(session.canRate).toBe(true);
    });

    it("canRate is false without yourStreak", () => {
      session.isLoggedIn = true;
      question("q-1");
      reveal(false);
      expect(session.canRate).toBe(false);
    });

    it("canRate is false for an observer", () => {
      session.isLoggedIn = true;
      session.isObserver = true;
      question("q-1");
      reveal(true);
      expect(session.canRate).toBe(false);
    });

    it("canRate is false for a guest", () => {
      session.isLoggedIn = false;
      question("q-1");
      reveal(true);
      expect(session.canRate).toBe(false);
    });

    it("canRate is true for the curator without yourStreak", () => {
      session.isLoggedIn = true;
      session.isCurator = true;
      question("q-1");
      reveal(false);
      expect(session.canRate).toBe(true);
    });
  });

  // ── game:tick (folded from gameStore.store.ts — ADR 0010) ──────────────────
  describe("game:tick", () => {
    it("lag-compensates timeRemaining via serverTs", () => {
      send({
        type: "game:tick",
        timeRemaining: 20,
        serverTs: Date.now() - 2000,
      });
      expect(session.timeRemaining).toBe(18);
    });

    it("updates the live answered tally", () => {
      send({
        type: "game:tick",
        timeRemaining: 10,
        serverTs: Date.now(),
        answeredCount: 3,
        answeredTotal: 5,
      });
      expect(session.answeredCount).toBe(3);
      expect(session.totalToAnswer).toBe(5);
    });
  });

  describe("sendEmote", () => {
    beforeEach(() => {
      session.playerId = "p1";
      session.answered = true;
    });

    function emote(playerId: string, emoteId = "smile") {
      send({
        type: "player:emote",
        playerId,
        emoteId,
        offsetX: 0.5,
        offsetY: 0.5,
      });
    }

    it("renders immediately and sends player:emote", () => {
      session.sendEmote("smile", 0.5, 0.5);
      expect(session.activeEmotes).toHaveLength(1);
      expect(stub.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "player:emote",
          emoteId: "smile",
          offsetX: 0.5,
          offsetY: 0.5,
        }),
      );
    });

    it("swallows the server echo of our own emote (no duplicate)", () => {
      session.sendEmote("smile", 0.5, 0.5);
      expect(session.activeEmotes).toHaveLength(1);
      emote("p1"); // server echoes the sender back
      expect(session.activeEmotes).toHaveLength(1); // echo swallowed
    });

    it("renders another player's emote (never swallowed)", () => {
      emote("p2");
      expect(session.activeEmotes).toHaveLength(1);
    });

    it("resets the pending counter on a new question (dropped-echo leak guard)", () => {
      session.sendEmote("smile", 0.5, 0.5);
      expect(session.activeEmotes).toHaveLength(1);

      // A new question clears active emotes AND the stuck swallow counter.
      send({
        type: "game:question",
        questionIndex: 1,
        totalQuestions: 2,
        text: "Q2",
        categoryId: "c",
        questionType: "text_choice",
        answers: [{ id: "a1", text: "A" }],
        timeRemaining: 10,
        serverTs: 0,
      });
      expect(session.activeEmotes).toHaveLength(0);

      // The next self echo must render (counter was reset, not still pending).
      emote("p1", "wave");
      expect(session.activeEmotes).toHaveLength(1);
    });
  });
});
