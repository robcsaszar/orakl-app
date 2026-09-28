import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  CuratorPlayer,
  CuratorQuestion,
} from "../src/lib/svelte/curatorStore.store.js";
import {
  createCuratorStore,
  curatorStore,
  markPlayerAnswered,
  resetAnswers,
  setPlayers,
  setQuestion,
  setRoundResult,
  setView,
  updatePlayerScores,
  updateTimer,
} from "../src/lib/svelte/curatorStore.store.js";

function makePlayer(overrides: Partial<CuratorPlayer> = {}): CuratorPlayer {
  return {
    id: "p1",
    nickname: "Alice",
    avatar: "",
    score: 0,
    status: "active" as const,
    role: "player",
    hasAnswered: false,
    ...overrides,
  };
}

function makeQuestion(
  overrides: Partial<CuratorQuestion> = {},
): CuratorQuestion {
  return {
    questionIndex: 0,
    totalQuestions: 3,
    text: "What is 2+2?",
    categoryId: "math",
    answers: [
      { id: "a1", text: "4" },
      { id: "a2", text: "5" },
    ],
    ...overrides,
  };
}

describe("createCuratorStore", () => {
  it("returns initial state", () => {
    const s = createCuratorStore();
    expect(s.players).toEqual([]);
    expect(s.answeredPlayerIds.size).toBe(0);
    expect(s.currentView).toBe("lobby");
    expect(s.currentQuestion).toBeNull();
    expect(s.timeRemaining).toBe(0);
    expect(s.timerDuration).toBe(30);
    expect(s.correctAnswerId).toBe("");
    expect(s.playerAnswerMap).toEqual({});
  });
});

describe("setPlayers", () => {
  it("populates player list", () => {
    const s = setPlayers(createCuratorStore(), [makePlayer()]);
    expect(s.players).toHaveLength(1);
    expect(s.players[0].nickname).toBe("Alice");
  });

  it("defaults hasAnswered to false", () => {
    const s = setPlayers(createCuratorStore(), [
      makePlayer({ hasAnswered: undefined }),
    ]);
    expect(s.players[0].hasAnswered).toBe(false);
  });

  it("defaults score to 0 when missing", () => {
    const s = setPlayers(createCuratorStore(), [
      makePlayer({ score: undefined as unknown as number }),
    ]);
    expect(s.players[0].score).toBe(0);
  });

  it("does not mutate original state", () => {
    const orig = createCuratorStore();
    setPlayers(orig, [makePlayer()]);
    expect(orig.players).toHaveLength(0);
  });
});

describe("setQuestion", () => {
  it("sets current question and timer", () => {
    const q = makeQuestion();
    const s = setQuestion(createCuratorStore(), q, 20);
    expect(s.currentQuestion).toBe(q);
    expect(s.timeRemaining).toBe(20);
    expect(s.timerDuration).toBe(20);
  });

  it("clears correctAnswerId and playerAnswerMap", () => {
    let s = createCuratorStore();
    s = { ...s, correctAnswerId: "old", playerAnswerMap: { p1: "a1" } };
    s = setQuestion(s, makeQuestion(), 30);
    expect(s.correctAnswerId).toBe("");
    expect(s.playerAnswerMap).toEqual({});
  });

  it("clears answeredPlayerIds", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    s = markPlayerAnswered(s, "p1");
    expect(s.answeredPlayerIds.has("p1")).toBe(true);
    s = setQuestion(s, makeQuestion(), 30);
    expect(s.answeredPlayerIds.size).toBe(0);
  });

  it("resets hasAnswered on all players", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [
      makePlayer({ id: "p1" }),
      makePlayer({ id: "p2", nickname: "Bob" }),
    ]);
    s = markPlayerAnswered(s, "p1");
    s = setQuestion(s, makeQuestion(), 30);
    expect(s.players.every((p) => p.hasAnswered === false)).toBe(true);
  });

  it("does not mutate original state", () => {
    const orig = createCuratorStore();
    setQuestion(orig, makeQuestion(), 30);
    expect(orig.currentQuestion).toBeNull();
  });
});

describe("updateTimer", () => {
  it("sets timeRemaining directly", () => {
    const s = updateTimer(createCuratorStore(), 15);
    expect(s.timeRemaining).toBe(15);
  });

  it("adjusts for server lag when serverTs provided", () => {
    const serverTs = Date.now() - 2000; // 2s lag
    const s = updateTimer(createCuratorStore(), 20, serverTs);
    expect(s.timeRemaining).toBe(18);
  });

  it("floors lag — 1.5s lag subtracts 1s not 2s", () => {
    const s = updateTimer(createCuratorStore(), 20, Date.now() - 1500);
    expect(s.timeRemaining).toBe(19);
  });

  it("does not mutate original state", () => {
    const orig = createCuratorStore();
    updateTimer(orig, 10);
    expect(orig.timeRemaining).toBe(0);
  });
});

describe("markPlayerAnswered", () => {
  it("adds playerId to answeredPlayerIds", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    s = markPlayerAnswered(s, "p1");
    expect(s.answeredPlayerIds.has("p1")).toBe(true);
  });

  it("sets hasAnswered on matching player", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    s = markPlayerAnswered(s, "p1");
    expect(s.players.find((p) => p.id === "p1")?.hasAnswered).toBe(true);
  });

  it("only affects target player", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [
      makePlayer({ id: "p1" }),
      makePlayer({ id: "p2", nickname: "Bob" }),
    ]);
    s = markPlayerAnswered(s, "p1");
    expect(s.players.find((p) => p.id === "p2")?.hasAnswered).toBe(false);
  });

  it("does not mutate original answeredPlayerIds set", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    const orig = s;
    s = markPlayerAnswered(s, "p1");
    expect(orig.answeredPlayerIds.has("p1")).toBe(false);
  });
});

describe("updatePlayerScores", () => {
  it("updates matching player scores", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [
      makePlayer({ id: "p1", score: 0 }),
      makePlayer({ id: "p2", nickname: "Bob", score: 0 }),
    ]);
    s = updatePlayerScores(s, [{ playerId: "p1", score: 5 }]);
    expect(s.players.find((p) => p.id === "p1")?.score).toBe(5);
    expect(s.players.find((p) => p.id === "p2")?.score).toBe(0);
  });

  it("does not mutate original state", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    updatePlayerScores(s, [{ playerId: "p1", score: 10 }]);
    expect(s.players[0].score).toBe(0);
  });
});

describe("setRoundResult", () => {
  it("sets correctAnswerId and playerAnswerMap", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    s = setRoundResult(s, "a1", { p1: "a1" }, [
      makePlayer({ id: "p1", score: 1 }),
    ]);
    expect(s.correctAnswerId).toBe("a1");
    expect(s.playerAnswerMap).toEqual({ p1: "a1" });
  });

  it("updates players from round result", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1", score: 0 })]);
    s = setRoundResult(s, "a1", {}, [makePlayer({ id: "p1", score: 3 })]);
    expect(s.players.find((p) => p.id === "p1")?.score).toBe(3);
  });

  it("does not mutate original state", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    setRoundResult(s, "a1", {}, [makePlayer({ id: "p1", score: 1 })]);
    expect(s.correctAnswerId).toBe("");
  });
});

describe("setView", () => {
  it("updates currentView", () => {
    const s = setView(createCuratorStore(), "question");
    expect(s.currentView).toBe("question");
  });

  it("does not mutate original state", () => {
    const orig = createCuratorStore();
    setView(orig, "final-results");
    expect(orig.currentView).toBe("lobby");
  });
});

describe("resetAnswers", () => {
  it("clears answeredPlayerIds", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    s = markPlayerAnswered(s, "p1");
    s = resetAnswers(s);
    expect(s.answeredPlayerIds.size).toBe(0);
  });

  it("resets hasAnswered on all players", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [
      makePlayer({ id: "p1" }),
      makePlayer({ id: "p2", nickname: "Bob" }),
    ]);
    s = markPlayerAnswered(s, "p1");
    s = markPlayerAnswered(s, "p2");
    s = resetAnswers(s);
    expect(s.players.every((p) => p.hasAnswered === false)).toBe(true);
  });

  it("does not mutate original state", () => {
    let s = createCuratorStore();
    s = setPlayers(s, [makePlayer({ id: "p1" })]);
    s = markPlayerAnswered(s, "p1");
    resetAnswers(s);
    expect(s.answeredPlayerIds.has("p1")).toBe(true);
  });
});

describe("curatorStore writable singleton", () => {
  beforeEach(() => {
    curatorStore.set(createCuratorStore());
  });

  it("initially holds createCuratorStore() state", () => {
    const s = get(curatorStore);
    expect(s.players).toEqual([]);
    expect(s.currentView).toBe("lobby");
  });

  it("can be updated with setPlayers", () => {
    curatorStore.update((s) => setPlayers(s, [makePlayer()]));
    expect(get(curatorStore).players).toHaveLength(1);
  });

  it("can be updated with setView", () => {
    curatorStore.update((s) => setView(s, "question"));
    expect(get(curatorStore).currentView).toBe("question");
  });

  it("answeredPlayerIds clears on setQuestion", () => {
    curatorStore.update((s) => setPlayers(s, [makePlayer({ id: "p1" })]));
    curatorStore.update((s) => markPlayerAnswered(s, "p1"));
    curatorStore.update((s) => setQuestion(s, makeQuestion(), 30));
    expect(get(curatorStore).answeredPlayerIds.size).toBe(0);
  });
});
