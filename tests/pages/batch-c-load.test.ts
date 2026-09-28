import { describe, expect, it, vi } from "vitest";
import { load as adminLayoutLoad } from "../../src/routes/(app)/admin/+layout.js";
import { load as adminSettingsLoad } from "../../src/routes/(app)/admin/settings/+page.js";
import { load as adminUsersLoad } from "../../src/routes/(app)/admin/users/+page.js";
import { load as historyLoad } from "../../src/routes/(app)/history/+page.js";
import { load as historyGameLoad } from "../../src/routes/(app)/history/game/[id]/+page.js";
import { load as historySoloLoad } from "../../src/routes/(app)/history/solo/[id]/+page.js";
import { load as soloLayoutLoad } from "../../src/routes/(app)/solo/+layout.js";
import { load as soloLeaderboardLoad } from "../../src/routes/(app)/solo/leaderboard/+page.js";
import { load as displayLoad } from "../../src/routes/(display)/curator/display/+page.js";

type Answer = { status?: number; body: unknown };

/** A fetch keyed by API path; every load under test calls exactly one. */
function apiFetch(answers: Record<string, Answer>) {
  const calls: { url: URL; method: string }[] = [];
  const fetchFn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const href =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const url = new URL(href, "http://localhost");
      calls.push({ url, method: init?.method ?? "GET" });
      const answer = answers[url.pathname];
      if (!answer) throw new Error(`unexpected fetch ${url.pathname}`);
      return Response.json(answer.body, { status: answer.status ?? 200 });
    },
  ) as unknown as typeof fetch;
  return { fetchFn, calls };
}

describe("admin/+layout load", () => {
  it("reads admin from the parent's user, no fetch", async () => {
    const parent = async () => ({ user: { role: "admin" } });
    await expect(adminLayoutLoad({ parent } as never)).resolves.toBeUndefined();
  });

  it("redirects a non-admin to /", async () => {
    const parent = async () => ({ user: { role: "curator" } });
    await expect(adminLayoutLoad({ parent } as never)).rejects.toMatchObject({
      status: 303,
      location: "/",
    });
  });
});

describe("admin/settings load", () => {
  it("calls /api/pages/admin/settings once and returns its body", async () => {
    const payload = { freeHostGames: 3 };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/admin/settings": { body: payload },
    });
    await expect(
      adminSettingsLoad({ fetch: fetchFn } as never),
    ).resolves.toEqual(payload);
    expect(calls[0].url.pathname).toBe("/api/pages/admin/settings");
  });
});

describe("admin/users load", () => {
  it("calls /api/pages/admin/users once and returns its body", async () => {
    const payload = {
      initial: { users: [], total: 0, page: 1, limit: 20, totalPages: 0 },
      roles: ["member"],
      currentUserId: "u1",
      allPowers: [],
      pendingRequests: [],
    };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/admin/users": { body: payload },
    });
    await expect(adminUsersLoad({ fetch: fetchFn } as never)).resolves.toEqual(
      payload,
    );
    expect(calls[0].url.pathname).toBe("/api/pages/admin/users");
  });
});

/** A full HistoryPageSchema body, `range` overridden per test. */
function historyPayload(range: "all" | "30d" | "7d") {
  return {
    range,
    runs: [],
    trendRuns: [],
    latestRunAt: null,
    latestGameAt: null,
    stats: {
      runs: 0,
      best_score: 0,
      best_streak: 0,
      total_answered: 0,
      total_correct: 0,
    },
    badgeTally: {},
    categoryName: {},
    attemptStats: { attempts: 0, focusRate: 0, fastestCorrectMs: null },
    dayStreak: 0,
    mastery: { strongest: null, weakest: null },
    gameStats: { games: 0, wins: 0, podiums: 0, best_rank: null },
    games: [],
    runsNextCursor: null,
    gamesNextCursor: null,
  };
}

describe("/history load", () => {
  it("passes the range through as a query param", async () => {
    const payload = historyPayload("30d");
    const { fetchFn, calls } = apiFetch({
      "/api/pages/history": { body: payload },
    });
    const url = new URL("http://localhost/history?range=30d");
    await expect(
      historyLoad({ fetch: fetchFn, url } as never),
    ).resolves.toEqual(payload);
    expect(calls[0].url.searchParams.get("range")).toBe("30d");
  });

  it("falls back to all for an unknown range", async () => {
    const payload = historyPayload("all");
    const { fetchFn, calls } = apiFetch({
      "/api/pages/history": { body: payload },
    });
    const url = new URL("http://localhost/history?range=60d");
    await historyLoad({ fetch: fetchFn, url } as never);
    expect(calls[0].url.searchParams.get("range")).toBe("all");
  });
});

describe("/history/game/[id] load", () => {
  it("calls the endpoint with the route's id", async () => {
    const payload = {
      game: {
        id: "g1",
        quizName: "Trivia night",
        startedAt: "2024-01-01T00:00:00.000Z",
        finalScore: 100,
        rank: 1,
        playerCount: 4,
      },
      standings: [],
      badges: [],
      breakdown: null,
      categoryName: {},
      stats: { answered: 0, correct: 0, accuracy: null, avgTimeMs: null },
      alreadyFlaggedIds: [],
    };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/history/game/g1": { body: payload },
    });
    await expect(
      historyGameLoad({ fetch: fetchFn, params: { id: "g1" } } as never),
    ).resolves.toEqual(payload);
    expect(calls[0].url.pathname).toBe("/api/pages/history/game/g1");
  });

  it("maps a 404 message to a Kit error", async () => {
    const { fetchFn } = apiFetch({
      "/api/pages/history/game/missing": {
        status: 404,
        body: { message: "That night isn't in your history." },
      },
    });
    await expect(
      historyGameLoad({
        fetch: fetchFn,
        params: { id: "missing" },
      } as never),
    ).rejects.toMatchObject({
      status: 404,
      body: { message: "That night isn't in your history." },
    });
  });

  it("refuses a body that does not match its schema", async () => {
    const { fetchFn } = apiFetch({
      "/api/pages/history/game/g1": { body: { game: { id: "g1" } } },
    });
    await expect(
      historyGameLoad({ fetch: fetchFn, params: { id: "g1" } } as never),
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe("/history/solo/[id] load", () => {
  it("calls the endpoint with the route's id", async () => {
    const payload = {
      run: {
        id: "r1",
        totalScore: 100,
        totalAnswered: 10,
        correctCount: 8,
        timeToAnswerAvgMs: 4000,
        maxStreak: 5,
        mode: "fixed",
        difficulty: "medium",
        completedAt: 1700000000000,
        categories: [],
      },
      badges: [],
      categoryStats: [],
      review: [],
      alreadyFlaggedIds: [],
    };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/history/solo/r1": { body: payload },
    });
    await expect(
      historySoloLoad({ fetch: fetchFn, params: { id: "r1" } } as never),
    ).resolves.toEqual(payload);
    expect(calls[0].url.pathname).toBe("/api/pages/history/solo/r1");
  });
});

describe("solo/+layout load", () => {
  it("calls /api/pages/solo/layout once and returns its body", async () => {
    const payload = {
      isLoggedIn: false,
      isGuest: true,
      userId: "anon",
      nickname: "",
      profileAvatarSrc: "",
      categoryDataJson: "[]",
    };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/solo/layout": { body: payload },
    });
    await expect(soloLayoutLoad({ fetch: fetchFn } as never)).resolves.toEqual(
      payload,
    );
    expect(calls[0].url.pathname).toBe("/api/pages/solo/layout");
  });
});

describe("solo/leaderboard load", () => {
  it("passes scope, board, difficulty, categoryId, and around through as query params", async () => {
    const payload = {
      entries: [],
      board: "streak",
      scope: "weekly",
      categoryId: "cat-1",
      difficulty: "hard",
      categories: [],
      userRank: null,
      eligibleCount: 0,
      percentile: null,
      around: true,
      viewerId: null,
    };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/solo/leaderboard": { body: payload },
    });
    const url = new URL(
      "http://localhost/solo/leaderboard?scope=weekly&board=streak&difficulty=hard&categoryId=cat-1&around=1",
    );
    await expect(
      soloLeaderboardLoad({ fetch: fetchFn, url } as never),
    ).resolves.toEqual(payload);
    const q = calls[0].url.searchParams;
    expect(q.get("scope")).toBe("weekly");
    expect(q.get("board")).toBe("streak");
    expect(q.get("difficulty")).toBe("hard");
    expect(q.get("categoryId")).toBe("cat-1");
    expect(q.get("around")).toBe("1");
  });

  it("maps a 400 message to a Kit error", async () => {
    const { fetchFn } = apiFetch({
      "/api/pages/solo/leaderboard": {
        status: 400,
        body: { message: 'Unknown leaderboard scope "yearly".' },
      },
    });
    const url = new URL("http://localhost/solo/leaderboard?scope=yearly");
    await expect(
      soloLeaderboardLoad({ fetch: fetchFn, url } as never),
    ).rejects.toMatchObject({
      status: 400,
      body: { message: 'Unknown leaderboard scope "yearly".' },
    });
  });

  it("refuses a body that does not match its schema", async () => {
    const { fetchFn } = apiFetch({
      "/api/pages/solo/leaderboard": { body: { board: 5 } },
    });
    const url = new URL("http://localhost/solo/leaderboard");
    await expect(
      soloLeaderboardLoad({ fetch: fetchFn, url } as never),
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe("(display)/curator/display load", () => {
  it("forwards the t query param and returns the display token", async () => {
    const payload = { displayToken: "tok" };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/display": { body: payload },
    });
    const url = new URL("http://localhost/curator/display?t=tok");
    await expect(
      displayLoad({ fetch: fetchFn, url } as never),
    ).resolves.toEqual(payload);
    expect(calls[0].url.searchParams.get("t")).toBe("tok");
  });

  it("maps a 403 redirect body to a Kit redirect", async () => {
    const { fetchFn } = apiFetch({
      "/api/pages/display": {
        status: 403,
        body: { error: "redirect", route: "/" },
      },
    });
    const url = new URL("http://localhost/curator/display");
    await expect(
      displayLoad({ fetch: fetchFn, url } as never),
    ).rejects.toMatchObject({ status: 303, location: "/" });
  });
});
