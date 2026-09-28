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
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    FakeWS.lastInstance = this;
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.onclose?.();
  }

  static lastInstance: FakeWS | null = null;
  static reset() {
    FakeWS.lastInstance = null;
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
});
