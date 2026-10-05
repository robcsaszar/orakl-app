import type { SoloServerMessage } from "@orakl/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSoloModeStore as soloMode } from "../src/lib/soloMode.store";

const topicData = JSON.stringify([
  { id: "science", name: "Science", icon: "🔬", count: 20 },
  { id: "history", name: "History", icon: "📜", count: 15 },
]);

const profileAvatarSrc = "avatar1.png";

function create() {
  return soloMode(topicData, profileAvatarSrc);
}

// A guest-tier store (still a guest on refresh).
function createGuest() {
  return soloMode(topicData, profileAvatarSrc, true, "anon");
}

// A signed-in store owned by a specific user id.
function createUser(id = "user-1") {
  return soloMode(topicData, profileAvatarSrc, false, id);
}

// A native (Capacitor) store: a bearer-token source drives first-message auth.
function createNative(token: string | null = "native-token", id = "user-1") {
  return soloMode(topicData, profileAvatarSrc, false, id, () => token);
}

// Minimal WebSocket mock — jsdom lacks it
class FakeWS {
  static OPEN = 1;
  static CONNECTING = 0;
  readyState = FakeWS.OPEN;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e?: { code?: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  createdAt = Date.now();
  closedAt: number | null = null;

  constructor() {
    FakeWS.lastInstance = this;
    FakeWS.instances.push(this);
    const failOpen = FakeWS.failOpen;
    setTimeout(() => {
      if (this.readyState === 3) return;
      if (failOpen) this.drop();
      else this.onopen?.();
    }, 0);
  }

  /** Close from the network or server side, not through close(). */
  drop(code = 1006) {
    this.readyState = 3;
    this.closedAt = Date.now();
    this.onclose?.({ code });
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  static lastInstance: FakeWS | null = null;
  static instances: FakeWS[] = [];
  /** New sockets close (1006) instead of opening. */
  static failOpen = false;
  static reset() {
    FakeWS.lastInstance = null;
    FakeWS.instances = [];
    FakeWS.failOpen = false;
  }
}

describe("soloMode (WS store)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (global as unknown as { WebSocket: typeof FakeWS }).WebSocket = FakeWS;
    FakeWS.reset();
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Setup phase ──────────────────────────────────────────────────────────

  describe("setup phase", () => {
    it("starts in setup phase with defaults", () => {
      const q = create();
      expect(q.phase).toBe("setup");
      expect(q.timer).toBe(30);
      expect(q.questionCount).toBe(10);
      expect(q.selectedCategories).toEqual([]);
    });

    it("initializes avatarSrc from param", () => {
      const q = create();
      expect(q.avatarSrc).toBe("avatar1.png");
    });

    it("parses categories from JSON", () => {
      const q = create();
      expect(q.categories).toHaveLength(2);
      expect(q.categories[0].id).toBe("science");
    });
  });

  // ── Validation ───────────────────────────────────────────────────────────

  describe("validate", () => {
    it("fails when no categories selected", () => {
      const q = create();
      expect(q.validate()).toBe(false);
      expect(q.errors.length).toBeGreaterThan(0);
    });

    it("passes when category selected", () => {
      const q = create();
      q.selectedCategories = ["science"];
      expect(q.validate()).toBe(true);
      expect(q.errors).toHaveLength(0);
    });

    it("startQuiz aborts without category", async () => {
      const q = create();
      await q.startQuiz();
      expect(q.phase).toBe("setup");
    });
  });

  // ── startQuiz ────────────────────────────────────────────────────────────

  describe("startQuiz", () => {
    it("resets state and opens WebSocket", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      expect(FakeWS.lastInstance).not.toBeNull();
    });

    it("resets score and results on new game", async () => {
      const q = create();
      q.score = 99;
      q.results = [
        {
          text: "q",
          correct: true,
          selectedAnswer: null,
          correctAnswer: "a",
          difficulty: "easy",
        },
      ];
      q.selectedCategories = ["science"];
      await q.startQuiz();
      expect(q.score).toBe(0);
      expect(q.results).toHaveLength(0);
    });
  });

  // ── _handleServerMessage ─────────────────────────────────────────────────

  function serverMsg(q: ReturnType<typeof create>, msg: SoloServerMessage) {
    q._handleServerMessage(JSON.stringify(msg));
  }

  const baseQuestion = {
    id: "q-0",
    text: "What is 2+2?",
    categoryId: "science",
    difficulty: "easy" as const,
    answers: [
      { id: "a-correct", text: "4" },
      { id: "a-wrong", text: "5" },
    ],
  };

  describe("solo:ready", () => {
    it("sends solo:start on open (no token) so the server can respond", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0); // fire WS onopen
      const ws = FakeWS.lastInstance!;
      // The opening message must be sent immediately — otherwise the guest/web
      // connection deadlocks (server waits for a message, client waits for ready).
      expect(ws.sent.some((s) => s.includes("solo:start"))).toBe(true);
    });

    it("does not re-send start on solo:ready for the cookie/guest flow", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      const ws = FakeWS.lastInstance!;
      const before = ws.sent.filter((s) => s.includes("solo:start")).length;
      serverMsg(q, { type: "solo:ready", isGuest: true, sessionId: "sess-1" });
      const after = ws.sent.filter((s) => s.includes("solo:start")).length;
      expect(after).toBe(before);
      expect(q.isGuest).toBe(true);
    });

    // ── Native (token-first) auth, US #26 / ADR 0014 ─────────────────────────

    it("native: sends auth (not solo:start) on open when a token is sourced", async () => {
      const q = createNative("native-token");
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0); // fire WS onopen
      const ws = FakeWS.lastInstance!;
      const authMsg = ws.sent.find((s) => s.includes('"auth"'));
      expect(authMsg).toBeTruthy();
      expect(JSON.parse(authMsg!)).toEqual({
        type: "auth",
        token: "native-token",
      });
      // Start is held until solo:ready confirms auth.
      expect(ws.sent.some((s) => s.includes("solo:start"))).toBe(false);
    });

    it("native: sends solo:start only after solo:ready", async () => {
      const q = createNative("native-token");
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      const ws = FakeWS.lastInstance!;
      expect(ws.sent.some((s) => s.includes("solo:start"))).toBe(false);
      serverMsg(q, { type: "solo:ready", isGuest: false, sessionId: "sess-1" });
      expect(ws.sent.some((s) => s.includes("solo:start"))).toBe(true);
    });

    it("no native token falls back to the cookie/guest start-on-open path", async () => {
      const q = createNative(null);
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      const ws = FakeWS.lastInstance!;
      expect(ws.sent.some((s) => s.includes('"auth"'))).toBe(false);
      expect(ws.sent.some((s) => s.includes("solo:start"))).toBe(true);
    });

    it("sets isGuest=false for authed user", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      serverMsg(q, { type: "solo:ready", isGuest: false, sessionId: "sess-2" });
      expect(q.isGuest).toBe(false);
    });

    it("stores sessionId from server", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:ready",
        isGuest: true,
        sessionId: "test-session-id",
      });
      expect(q.sessionId).toBe("test-session-id");
    });
  });

  describe("solo:question", () => {
    it("sets playing phase and current question", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 5,
        timeRemaining: 30,
        serverTs: 1000,
      });
      expect(q.phase).toBe("playing");
      expect(q.currentQuestion?.id).toBe("q-0");
      expect(q.timeRemaining).toBe(30);
      expect(q.answered).toBe(false);
    });

    it("clears answered state on new question", () => {
      const q = create();
      q.answered = true;
      q.selectedAnswerId = "old";
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 1,
        totalQuestions: 5,
        timeRemaining: 30,
        serverTs: 1000,
      });
      expect(q.answered).toBe(false);
      expect(q.selectedAnswerId).toBeNull();
    });

    it("stores totalQuestions and updates questionCounter", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 5,
        timeRemaining: 30,
        serverTs: 1000,
      });
      expect(q.totalQuestions).toBe(5);
      expect(q.questionCounter).toBe("1 of 5");
    });

    it("updates progress percent from server total", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 2,
        totalQuestions: 5,
        timeRemaining: 30,
        serverTs: 1000,
      });
      expect(q.progressPercent).toBeCloseTo(60);
    });
  });

  describe("solo:tick", () => {
    it("updates timeRemaining", () => {
      const q = create();
      serverMsg(q, { type: "solo:tick", timeRemaining: 20, serverTs: 1000 });
      expect(q.timeRemaining).toBe(20);
    });
  });

  describe("solo:round-result", () => {
    it("sets correctAnswerId, showingAnswer, score", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 1,
        timeRemaining: 30,
        serverTs: 1000,
      });
      q.selectedAnswerId = "a-correct";
      serverMsg(q, {
        type: "solo:round-result",
        correctAnswerId: "a-correct",
        selectedAnswerId: "a-correct",
        isCorrect: true,
        score: 150,
        totalScore: 150,
        timeToAnswerMs: 1000,
        streak: 1,
        strikes: 0,
        fasterThanPercent: 80,
      });
      expect(q.correctAnswerId).toBe("a-correct");
      expect(q.showingAnswer).toBe(true);
      expect(q.answered).toBe(true);
      expect(q.score).toBe(150);
      expect(q.fasterThanPercent).toBe(80);
    });

    it("sets lastPointsEarned from the round's score delta, not the running total", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 1,
        timeRemaining: 30,
        serverTs: 1000,
      });
      serverMsg(q, {
        type: "solo:round-result",
        correctAnswerId: "a-correct",
        selectedAnswerId: "a-correct",
        isCorrect: true,
        score: 150,
        totalScore: 400,
        timeToAnswerMs: 1000,
        streak: 1,
        strikes: 0,
        fasterThanPercent: 80,
      });
      expect(q.lastPointsEarned).toBe(150);
      expect(q.score).toBe(400);
    });

    it("resets lastPointsEarned to 0 on the next question", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 2,
        timeRemaining: 30,
        serverTs: 1000,
      });
      serverMsg(q, {
        type: "solo:round-result",
        correctAnswerId: "a-correct",
        selectedAnswerId: "a-correct",
        isCorrect: true,
        score: 150,
        totalScore: 150,
        timeToAnswerMs: 1000,
        streak: 1,
        strikes: 0,
        fasterThanPercent: 80,
      });
      expect(q.lastPointsEarned).toBe(150);
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 1,
        totalQuestions: 2,
        timeRemaining: 30,
        serverTs: 2000,
      });
      expect(q.lastPointsEarned).toBe(0);
    });

    it("adds result to results array", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 1,
        timeRemaining: 30,
        serverTs: 1000,
      });
      serverMsg(q, {
        type: "solo:round-result",
        correctAnswerId: "a-correct",
        selectedAnswerId: null,
        isCorrect: false,
        score: 0,
        totalScore: 0,
        timeToAnswerMs: 30000,
        streak: 0,
        strikes: 1,
        fasterThanPercent: null,
      });
      expect(q.results).toHaveLength(1);
      expect(q.results[0].correct).toBe(false);
    });

    it("mirrors strikes from the server (endless lives)", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: null,
        timeRemaining: 30,
        serverTs: 1000,
      });
      serverMsg(q, {
        type: "solo:round-result",
        correctAnswerId: "a-correct",
        selectedAnswerId: null,
        isCorrect: false,
        score: 0,
        totalScore: 0,
        timeToAnswerMs: 30000,
        streak: 0,
        strikes: 2,
        fasterThanPercent: null,
      });
      expect(q.strikes).toBe(2);
    });
  });

  describe("streak flourish", () => {
    it("solo:streak records a gain flourish and bumps nonce", () => {
      const q = create();
      const before = q.streakNonce;
      serverMsg(q, { type: "solo:streak", milestone: 5, streak: 5 });
      expect(q.streak).toBe(5);
      expect(q.streakFlourish).toEqual({ kind: "gain", value: 5 });
      expect(q.streakNonce).toBe(before + 1);
    });

    it("solo:streak-lost records a loss flourish, replacing a prior gain", () => {
      const q = create();
      serverMsg(q, { type: "solo:streak", milestone: 5, streak: 5 });
      serverMsg(q, { type: "solo:streak-lost", lostStreak: 5, streak: 0 });
      expect(q.streak).toBe(0);
      expect(q.streakFlourish).toEqual({ kind: "loss", value: 5 });
    });

    it("solo:streak-near-miss records a near-miss flourish", () => {
      const q = create();
      serverMsg(q, { type: "solo:streak-near-miss", lostStreak: 4, streak: 0 });
      expect(q.streakFlourish).toEqual({ kind: "near-miss", value: 4 });
    });

    it("solo:streak-best records a best flourish", () => {
      const q = create();
      serverMsg(q, { type: "solo:streak-best", streak: 8 });
      expect(q.streak).toBe(8);
      expect(q.streakFlourish).toEqual({ kind: "best", value: 8 });
    });

    it("solo:life-spent records a life-spent flourish", () => {
      const q = create();
      serverMsg(q, { type: "solo:life-spent", livesRemaining: 1, streak: 0 });
      expect(q.streakFlourish).toEqual({ kind: "life-spent", value: 1 });
    });

    it("a later event replaces an earlier one instead of stacking", () => {
      const q = create();
      serverMsg(q, { type: "solo:streak-lost", lostStreak: 5, streak: 0 });
      serverMsg(q, { type: "solo:streak", milestone: 3, streak: 3 });
      expect(q.streakFlourish).toEqual({ kind: "gain", value: 3 });
    });
  });

  describe("refresh resume", () => {
    const STATE_KEY = "solo:state";

    afterEach(() => {
      try {
        window.sessionStorage.clear();
      } catch {
        /* jsdom */
      }
    });

    function storedState() {
      const raw = window.sessionStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    }

    it("persists the playing session (sessionId + results) during play", () => {
      const q = create();
      serverMsg(q, { type: "solo:ready", isGuest: true, sessionId: "sess-x" });
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 1,
        timeRemaining: 30,
        serverTs: 1000,
      });
      const blob = storedState();
      expect(blob.phase).toBe("playing");
      expect(blob.sessionId).toBe("sess-x");
    });

    it("init() resumes a stored playing session via solo:resume", async () => {
      window.sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          phase: "playing",
          sessionId: "stored-sess",
          claimId: null,
          isGuest: true,
          ownerId: "anon",
          finalData: null,
          results: [],
        }),
      );
      const q = createGuest();
      q.init();
      expect(q.reconnecting).toBe(true);
      expect(q.phase).toBe("playing");
      vi.advanceTimersByTime(0); // fire WS onopen
      const ws = FakeWS.lastInstance!;
      expect(ws.sent.some((s) => s.includes("solo:resume"))).toBe(true);
    });

    it("init() keeps resuming past 6 s and retries a dropped resume socket", () => {
      window.sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          phase: "playing",
          sessionId: "stored-sess",
          claimId: null,
          isGuest: true,
          ownerId: "anon",
          finalData: null,
          results: [],
        }),
      );
      const q = createGuest();
      q.init();
      vi.advanceTimersByTime(7000);
      expect(q.phase).toBe("playing");
      expect(q.reconnecting).toBe(true);
      FakeWS.lastInstance!.drop();
      expect(q.phase).toBe("playing");
      vi.advanceTimersByTime(1001);
      expect(FakeWS.instances).toHaveLength(2);
    });

    it("init() restores a finished run's results screen (no WS)", () => {
      window.sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          phase: "result",
          sessionId: null,
          claimId: "claim-1",
          isGuest: true,
          ownerId: "anon",
          finalData: {
            type: "solo:final",
            totalScore: 250,
            totalAnswered: 3,
            correctCount: 2,
            timeToAnswerAvgMs: 4000,
            maxStreak: 2,
            isLeaderboardEligible: false,
            isStreakEligible: false,
            claimId: "claim-1",
            mode: "normal",
            results: [],
          },
          results: [
            {
              text: "Q",
              correct: true,
              selectedAnswer: "A",
              correctAnswer: "A",
              difficulty: "easy",
            },
          ],
        }),
      );
      const q = createGuest();
      q.init();
      expect(q.phase).toBe("result");
      expect(q.finalData?.totalScore).toBe(250);
      expect(q.claimId).toBe("claim-1");
      expect(q.results).toHaveLength(1);
    });

    it("init() is a no-op without a stored session", () => {
      const q = create();
      q.init();
      expect(q.reconnecting).toBe(false);
      expect(q.phase).toBe("setup");
    });

    function resultBlob(ownerId: string, isGuest: boolean) {
      return JSON.stringify({
        phase: "result",
        sessionId: null,
        claimId: null,
        isGuest,
        ownerId,
        finalData: {
          type: "solo:final",
          totalScore: 250,
          totalAnswered: 3,
          correctCount: 2,
          timeToAnswerAvgMs: 4000,
          maxStreak: 2,
          isLeaderboardEligible: !isGuest,
          isStreakEligible: !isGuest,
          claimId: null,
          mode: "normal",
          results: [],
        },
        results: [],
      });
    }

    it("discards on sign-in (guest run, now a user)", () => {
      window.sessionStorage.setItem(STATE_KEY, resultBlob("anon", true));
      const q = createUser("u1");
      q.init();
      expect(q.phase).toBe("setup");
      expect(q.finalData).toBeNull();
      expect(window.sessionStorage.getItem(STATE_KEY)).toBeNull();
    });

    it("discards on sign-out (user run, now a guest)", () => {
      window.sessionStorage.setItem(STATE_KEY, resultBlob("u1", false));
      const q = createGuest();
      q.init();
      expect(q.phase).toBe("setup");
      expect(q.finalData).toBeNull();
      expect(window.sessionStorage.getItem(STATE_KEY)).toBeNull();
    });

    it("discards when switching accounts", () => {
      window.sessionStorage.setItem(STATE_KEY, resultBlob("u1", false));
      const q = createUser("u2");
      q.init();
      expect(q.phase).toBe("setup");
      expect(window.sessionStorage.getItem(STATE_KEY)).toBeNull();
    });

    it("restores the owner's own finished run", () => {
      window.sessionStorage.setItem(STATE_KEY, resultBlob("u1", false));
      const q = createUser("u1");
      q.init();
      expect(q.phase).toBe("result");
      expect(q.finalData?.totalScore).toBe(250);
    });

    it("failed resume (session_expired) drops back to setup and clears storage", () => {
      window.sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          phase: "playing",
          sessionId: "gone",
          claimId: null,
          isGuest: true,
          ownerId: "anon",
          finalData: null,
          results: [],
        }),
      );
      const q = createGuest();
      q.init();
      vi.advanceTimersByTime(0);
      serverMsg(q, {
        type: "solo:error",
        code: "session_expired",
        message: "Your trial has ended.",
      });
      expect(q.phase).toBe("setup");
      expect(q.reconnecting).toBe(false);
      expect(window.sessionStorage.getItem(STATE_KEY)).toBeNull();
    });

    it("keeps a result blob (with claimId) on solo:final for refresh continuity", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:final",
        totalScore: 10,
        totalAnswered: 1,
        correctCount: 1,
        timeToAnswerAvgMs: 1000,
        maxStreak: 1,
        isLeaderboardEligible: false,
        isStreakEligible: false,
        claimId: "claim-9",
        mode: "normal",
        results: [],
      });
      const blob = storedState();
      expect(blob.phase).toBe("result");
      expect(blob.claimId).toBe("claim-9");
      expect(blob.finalData.totalScore).toBe(10);
      expect(q.claimId).toBe("claim-9");
    });
  });

  describe("in-run reconnect", () => {
    afterEach(() => {
      window.sessionStorage.clear();
    });

    function sentTypes(ws: FakeWS): string[] {
      return ws.sent.map((s) => JSON.parse(s).type);
    }

    async function playing() {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      serverMsg(q, { type: "solo:ready", isGuest: true, sessionId: "sess-r" });
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 3,
        timeRemaining: 30,
        serverTs: 1000,
      });
      return q;
    }

    it("a mid-run close reopens at once and sends solo:resume", async () => {
      const q = await playing();
      FakeWS.lastInstance!.drop();
      expect(FakeWS.instances).toHaveLength(2);
      expect(q.reconnecting).toBe(true);
      vi.advanceTimersByTime(0);
      expect(sentTypes(FakeWS.instances[1])).toEqual(["solo:resume"]);
    });

    function resumed(q: ReturnType<typeof create>) {
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 3,
        timeRemaining: 20,
        serverTs: 2000,
      });
    }

    it("a second drop after a resume reopens after 1000 ms with solo:resume", async () => {
      const q = await playing();
      FakeWS.lastInstance!.drop();
      vi.advanceTimersByTime(0);
      resumed(q);
      expect(q.reconnecting).toBe(false);
      FakeWS.lastInstance!.drop();
      expect(q.reconnecting).toBe(true);
      vi.advanceTimersByTime(999);
      expect(FakeWS.instances).toHaveLength(2);
      vi.advanceTimersByTime(1);
      expect(FakeWS.instances).toHaveLength(3);
      vi.advanceTimersByTime(1); // fire the reopened socket's onopen
      expect(sentTypes(FakeWS.instances[2])).toEqual(["solo:resume"]);
    });

    it("failed reopens back off 1 s, 2 s, then 4 s", async () => {
      await playing();
      FakeWS.failOpen = true;
      FakeWS.lastInstance!.drop();
      vi.advanceTimersByTime(10_000);
      const ws = FakeWS.instances;
      const gaps = [2, 3, 4].map((i) => ws[i].createdAt - ws[i - 1].closedAt!);
      expect(gaps).toEqual([1000, 2000, 4000]);
    });

    it("seven failed opens end the run", async () => {
      const q = await playing();
      expect(window.sessionStorage.getItem("solo:state")).not.toBeNull();
      FakeWS.failOpen = true;
      FakeWS.lastInstance!.drop();
      vi.advanceTimersByTime(32_000);
      expect(FakeWS.instances).toHaveLength(8); // start socket + 7 opens
      expect(q.phase).toBe("setup");
      expect(q.reconnecting).toBe(false);
      expect(q.errors).toEqual(["Connection lost. Your trial has ended."]);
      expect(window.sessionStorage.getItem("solo:state")).toBeNull();
      vi.advanceTimersByTime(60_000);
      expect(FakeWS.instances).toHaveLength(8);
    });

    it("a 1011 close on the resume socket ends the run at once", async () => {
      const q = await playing();
      FakeWS.lastInstance!.drop();
      vi.advanceTimersByTime(1);
      FakeWS.lastInstance!.drop(1011);
      expect(q.phase).toBe("setup");
      expect(q.errors).toEqual(["Connection lost. Your trial has ended."]);
      vi.advanceTimersByTime(60_000);
      expect(FakeWS.instances).toHaveLength(2);
    });

    it("session_expired after a drop ends the run with the server message", async () => {
      const q = await playing();
      FakeWS.lastInstance!.drop();
      vi.advanceTimersByTime(1);
      serverMsg(q, {
        type: "solo:error",
        code: "session_expired",
        message: "Your trial has ended.",
      });
      expect(q.phase).toBe("setup");
      expect(q.errors).toEqual(["Your trial has ended."]);
      expect(window.sessionStorage.getItem("solo:state")).toBeNull();
      vi.advanceTimersByTime(60_000);
      expect(FakeWS.instances).toHaveLength(2);
    });

    it("a late-answer session_expired mid-run only sets errors", async () => {
      const q = await playing();
      expect(q.reconnecting).toBe(false);
      serverMsg(q, {
        type: "solo:error",
        code: "session_expired",
        message: "Too late.",
      });
      expect(q.errors).toEqual(["Too late."]);
      expect(q.phase).toBe("playing");
    });

    it("endRound() during the reveal opens no socket", async () => {
      const q = await playing();
      serverMsg(q, {
        type: "solo:round-result",
        isCorrect: true,
        correctAnswerId: "a-correct",
        score: 100,
        totalScore: 100,
        streak: 1,
        strikes: 0,
        fasterThanPercent: null,
      } as never);
      expect(q.showingAnswer).toBe(true);
      q.endRound();
      vi.advanceTimersByTime(5000);
      expect(FakeWS.instances).toHaveLength(1);
    });

    it("solo:final after the reveal opens no socket", async () => {
      const q = await playing();
      serverMsg(q, {
        type: "solo:round-result",
        isCorrect: true,
        correctAnswerId: "a-correct",
        score: 100,
        totalScore: 100,
        streak: 1,
        strikes: 0,
        fasterThanPercent: null,
      } as never);
      serverMsg(q, {
        type: "solo:final",
        totalScore: 0,
        totalAnswered: 1,
        correctCount: 0,
        timeToAnswerAvgMs: 0,
        maxStreak: 0,
        isLeaderboardEligible: false,
        isStreakEligible: false,
        claimId: null,
        mode: "normal",
        results: [],
      } as never);
      vi.advanceTimersByTime(5000);
      expect(FakeWS.instances).toHaveLength(1);
    });
  });

  describe("starting", () => {
    function sentStarts(ws: FakeWS): number {
      return ws.sent.filter((s) => JSON.parse(s).type === "solo:start").length;
    }

    async function started() {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      return q;
    }

    it("startQuiz sets starting; solo:question clears it", async () => {
      const q = await started();
      expect(q.starting).toBe(true);
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 1,
        timeRemaining: 30,
        serverTs: 1000,
      });
      expect(q.starting).toBe(false);
    });

    it("after solo:guest-limit, startQuiz re-sends solo:start on the same socket", async () => {
      const q = await started();
      serverMsg(q, {
        type: "solo:guest-limit",
        reason: "Guests max 1 category.",
        upgradeHint: "Sign in.",
      });
      expect(q.starting).toBe(false);
      q.selectedCategories = ["history"];
      await q.startQuiz();
      expect(FakeWS.instances).toHaveLength(1);
      const ws = FakeWS.lastInstance!;
      expect(sentStarts(ws)).toBe(2);
      expect(JSON.parse(ws.sent[1]).categoryIds).toEqual(["history"]);
    });

    it("after an empty-pool solo:error, startQuiz re-sends solo:start", async () => {
      const q = await started();
      serverMsg(q, {
        type: "solo:error",
        code: "no_questions",
        message: "No questions available for this selection.",
      } as never);
      expect(q.starting).toBe(false);
      await q.startQuiz();
      expect(FakeWS.instances).toHaveLength(1);
      expect(sentStarts(FakeWS.lastInstance!)).toBe(2);
    });

    it("two startQuiz calls before any answer send one solo:start", async () => {
      const q = await started();
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      expect(FakeWS.instances).toHaveLength(1);
      expect(sentStarts(FakeWS.lastInstance!)).toBe(1);
    });

    it("a close before the run begins surfaces an error and allows a new start", async () => {
      const q = await started();
      FakeWS.lastInstance!.drop(1011);
      expect(q.phase).toBe("setup");
      expect(q.starting).toBe(false);
      expect(q.errors).toEqual(["Connection error — check your connection"]);
      await q.startQuiz();
      expect(FakeWS.instances).toHaveLength(2);
    });

    it("destroy() while starting sets no error", async () => {
      const q = await started();
      q.destroy();
      expect(q.errors).toEqual([]);
    });
  });

  describe("solo:final", () => {
    it("sets phase=result and stores finalData", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:final",
        totalScore: 300,
        totalAnswered: 3,
        correctCount: 2,
        timeToAnswerAvgMs: 5000,
        maxStreak: 2,
        isLeaderboardEligible: true,
        isStreakEligible: true,
        mode: "normal",
        results: [],
      });
      expect(q.phase).toBe("result");
      expect(q.finalData?.totalScore).toBe(300);
      expect(q.finalData?.maxStreak).toBe(2);
    });
  });

  describe("solo:error", () => {
    it("populates errors", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:error",
        code: "internal",
        message: "Something broke",
      });
      expect(q.errors).toContain("Something broke");
    });
  });

  describe("solo:guest-limit", () => {
    it("populates guestLimit (inline CTA, not an error toast)", () => {
      const q = create();
      serverMsg(q, {
        type: "solo:guest-limit",
        reason: "Guests max 3 categories.",
        upgradeHint: "Sign in to unlock.",
      });
      expect(q.guestLimit?.reason).toMatch(/Guests max 3 categories/);
      expect(q.guestLimit?.upgradeHint).toMatch(/Sign in to unlock/);
      // Not surfaced as an error toast.
      expect(q.errors).toHaveLength(0);
    });
  });

  // ── selectAnswer ─────────────────────────────────────────────────────────

  describe("selectAnswer", () => {
    it("sets selectedAnswerId and answered=true", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      q.answered = false;
      q.showingAnswer = false;
      q.selectAnswer("a-correct");
      expect(q.selectedAnswerId).toBe("a-correct");
      expect(q.answered).toBe(true);
    });

    it("sends solo:answer over WS", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      q.answered = false;
      q.showingAnswer = false;
      q.selectAnswer("a-correct");
      const ws = FakeWS.lastInstance!;
      const answerMsg = ws.sent.find((s) => s.includes("solo:answer"));
      expect(answerMsg).toBeTruthy();
      expect(JSON.parse(answerMsg!)).toMatchObject({
        type: "solo:answer",
        answerId: "a-correct",
      });
    });

    it("ignores call if already answered", async () => {
      const q = create();
      q.answered = true;
      q.selectAnswer("a-correct");
      expect(q.selectedAnswerId).toBeNull();
    });
  });

  // ── advance ───────────────────────────────────────────────────────────────

  describe("advance", () => {
    it("sends solo:next and clears showingAnswer", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      q.showingAnswer = true;
      q.advance();
      expect(q.showingAnswer).toBe(false);
      const ws = FakeWS.lastInstance!;
      const nextMsg = ws.sent.find((s) => s.includes("solo:next"));
      expect(nextMsg).toBeTruthy();
    });

    it("ignored when not showingAnswer", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      q.showingAnswer = false;
      const sentBefore = FakeWS.lastInstance!.sent.length;
      q.advance();
      expect(FakeWS.lastInstance!.sent.length).toBe(sentBefore);
    });
  });

  // ── playAgain ─────────────────────────────────────────────────────────────

  describe("playAgain", () => {
    it("resets to setup phase", () => {
      const q = create();
      q.phase = "result";
      q.score = 300;
      q.results = [
        {
          text: "q",
          correct: true,
          selectedAnswer: "a",
          correctAnswer: "a",
          difficulty: "easy",
        },
      ];
      q.playAgain();
      expect(q.phase).toBe("setup");
      expect(q.score).toBe(0);
      expect(q.results).toHaveLength(0);
      expect(q.finalData).toBeNull();
    });
  });

  // ── endRound ──────────────────────────────────────────────────────────────

  describe("endRound", () => {
    it("transitions to result and closes WS", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      q.phase = "playing";
      q.endRound();
      expect(q.phase).toBe("result");
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  describe("isTimerLow", () => {
    it("returns true when timeRemaining <= 5", () => {
      const q = create();
      q.timeRemaining = 5;
      expect(q.isTimerLow()).toBe(true);
    });

    it("returns false when timeRemaining > 5", () => {
      const q = create();
      q.timeRemaining = 6;
      expect(q.isTimerLow()).toBe(false);
    });
  });

  describe("timerState", () => {
    it("returns counting normally", () => {
      const q = create();
      q.timeRemaining = 20;
      q.showingAnswer = false;
      expect(q.timerState()).toBe("counting");
    });

    it("returns low when <= 5", () => {
      const q = create();
      q.timeRemaining = 3;
      q.showingAnswer = false;
      expect(q.timerState()).toBe("low");
    });

    it("returns timeout when showingAnswer and no selection", () => {
      const q = create();
      q.showingAnswer = true;
      q.selectedAnswerId = null;
      expect(q.timerState()).toBe("timeout");
    });

    it("returns correct when showingAnswer and selectedAnswerId matches", () => {
      const q = create();
      q.showingAnswer = true;
      q.selectedAnswerId = "a";
      q.correctAnswerId = "a";
      expect(q.timerState()).toBe("correct");
    });

    it("returns incorrect when showingAnswer and wrong selection", () => {
      const q = create();
      q.showingAnswer = true;
      q.selectedAnswerId = "b";
      q.correctAnswerId = "a";
      expect(q.timerState()).toBe("incorrect");
    });
  });

  describe("destroy", () => {
    it("closes WebSocket", async () => {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      q.destroy();
      expect(FakeWS.lastInstance?.readyState).toBe(3);
    });
  });

  describe("question rating", () => {
    afterEach(() => {
      window.sessionStorage.clear();
    });

    async function atReveal() {
      const q = create();
      q.selectedCategories = ["science"];
      await q.startQuiz();
      vi.advanceTimersByTime(0);
      serverMsg(q, { type: "solo:ready", isGuest: false, sessionId: "sess-q" });
      serverMsg(q, {
        type: "solo:question",
        question: baseQuestion as never,
        questionIndex: 0,
        totalQuestions: 3,
        timeRemaining: 30,
        serverTs: 1000,
      });
      serverMsg(q, {
        type: "solo:round-result",
        correctAnswerId: "a-correct",
        selectedAnswerId: "a-correct",
        isCorrect: true,
        score: 100,
        totalScore: 100,
        timeToAnswerMs: 1000,
        streak: 1,
        strikes: 0,
        fasterThanPercent: 10,
      });
      return q;
    }

    function frames(type: string) {
      return FakeWS.lastInstance!.sent.map((s) => JSON.parse(s)).filter(
        (m) => m.type === type,
      );
    }

    function ack(
      q: ReturnType<typeof create>,
      questionId: string,
      ok: boolean,
    ) {
      q._handleServerMessage(
        JSON.stringify({ type: "solo:rate-ack", questionId, ok }),
      );
    }

    it("rate sends solo:rate with the bank question id", async () => {
      const q = await atReveal();
      q.rate("up");
      expect(frames("solo:rate")).toHaveLength(1);
      expect(frames("solo:rate")[0]).toMatchObject({
        type: "solo:rate",
        questionId: "q-0",
        rating: "up",
      });
      expect(q.rating.pending).toBe("up");
    });

    it("a second rate before the ack sends nothing; the ack sends it", async () => {
      const q = await atReveal();
      q.rate("up");
      q.rate("down");
      expect(frames("solo:rate")).toHaveLength(1);
      ack(q, "q-0", true);
      const sent = frames("solo:rate");
      expect(sent).toHaveLength(2);
      expect(sent[1]).toMatchObject({ questionId: "q-0", rating: "down" });
      expect(q.rating.result).toMatchObject({ rating: "up", ok: true });
    });

    it("an ack for another question is ignored", async () => {
      const q = await atReveal();
      q.rate("up");
      ack(q, "q-other", true);
      expect(q.rating.pending).toBe("up");
      expect(q.rating.result).toBeNull();
    });

    it("a disabled ack sets ratingDisabled, drops the queue, shows no ✗, survives the next question", async () => {
      const q = await atReveal();
      q.rate("up");
      q.rate("down");
      q._handleServerMessage(
        JSON.stringify({
          type: "solo:rate-ack",
          questionId: "q-0",
          ok: false,
          reason: "disabled",
        }),
      );
      expect(q.ratingDisabled).toBe(true);
      expect(q.rating.pending).toBeNull();
      expect(q.rating.queued).toBeNull();
      expect(q.rating.result).toBeNull();
      expect(frames("solo:rate")).toHaveLength(1);
      serverMsg(q, {
        type: "solo:question",
        question: { ...baseQuestion, id: "q-1" } as never,
        questionIndex: 1,
        totalQuestions: 3,
        timeRemaining: 30,
        serverTs: 2000,
      });
      expect(q.ratingDisabled).toBe(true);
    });

    it("a new question resets rating to the new id", async () => {
      const q = await atReveal();
      q.rate("up");
      serverMsg(q, {
        type: "solo:question",
        question: { ...baseQuestion, id: "q-1" } as never,
        questionIndex: 1,
        totalQuestions: 3,
        timeRemaining: 30,
        serverTs: 2000,
      });
      expect(q.rating).toEqual({
        questionId: "q-1",
        pending: null,
        queued: null,
        result: null,
      });
    });

    function keyEvent(target: EventTarget | null) {
      const e = new KeyboardEvent("keydown", {
        key: "Enter",
        cancelable: true,
      });
      Object.defineProperty(e, "target", { value: target });
      return e;
    }

    it("Enter on a rating thumb does not advance", async () => {
      const q = await atReveal();
      const wrap = document.createElement("div");
      wrap.innerHTML = "<button data-rating-thumb><svg></svg></button>";
      const thumb = wrap.querySelector("button")!;
      const e = keyEvent(thumb);
      q.handleKeyDown(e);
      expect(frames("solo:next")).toHaveLength(0);
      expect(q.showingAnswer).toBe(true);
      expect(e.defaultPrevented).toBe(false);
    });

    it("Enter on another target still advances", async () => {
      const q = await atReveal();
      q.handleKeyDown(keyEvent(document.createElement("button")));
      expect(frames("solo:next")).toHaveLength(1);
    });
  });
});
