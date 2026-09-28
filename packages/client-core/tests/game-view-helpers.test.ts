import { describe, expect, it } from "vitest";
import {
  applyQuestionDisplay,
  compensateForLag,
  computeTimerRingOffset,
  sortPlayersByScore,
} from "../src/index.js";

describe("applyQuestionDisplay", () => {
  it("applies all question fields to context", () => {
    const ctx: any = {};
    const msg = {
      questionType: "true_false",
      answers: [{ id: "a1", text: "True" }],
      matchItems: null,
      questionIndex: 2,
      totalQuestions: 10,
    };
    applyQuestionDisplay(ctx, msg);
    expect(ctx.questionType).toBe("true_false");
    expect(ctx.answers).toEqual(msg.answers);
    expect(ctx.matchItems).toBeNull();
    expect(ctx.currentQuestionIndex).toBe(2);
    expect(ctx.totalQuestions).toBe(10);
  });

  it("defaults questionType to text_choice when missing", () => {
    const ctx: any = {};
    applyQuestionDisplay(ctx, {
      answers: [],
      questionIndex: 0,
      totalQuestions: 5,
    });
    expect(ctx.questionType).toBe("text_choice");
  });

  it("applies matchItems when present", () => {
    const ctx: any = {};
    const matchItems = { left: ["A", "B"], right: ["1", "2"] };
    applyQuestionDisplay(ctx, {
      answers: [],
      questionIndex: 0,
      totalQuestions: 5,
      matchItems,
    });
    expect(ctx.matchItems).toEqual(matchItems);
  });
});

describe("sortPlayersByScore", () => {
  it("sorts descending by score", () => {
    const players = [
      { id: "a", score: 10 },
      { id: "b", score: 30 },
      { id: "c", score: 20 },
    ];
    const sorted = sortPlayersByScore(players);
    expect(sorted.map((p) => p.score)).toEqual([30, 20, 10]);
  });

  it("does not mutate original array", () => {
    const players = [
      { id: "a", score: 5 },
      { id: "b", score: 1 },
    ];
    sortPlayersByScore(players);
    expect(players[0].score).toBe(5);
  });

  it("handles empty array", () => {
    expect(sortPlayersByScore([])).toEqual([]);
  });
});

describe("computeTimerRingOffset", () => {
  it("timeout → full circumference", () => {
    const r = 28;
    const circumference = 2 * Math.PI * r;
    expect(computeTimerRingOffset("timeout", 0.5, r)).toBeCloseTo(
      circumference,
    );
  });

  it("50% fraction → half circumference", () => {
    const r = 28;
    const circumference = 2 * Math.PI * r;
    expect(computeTimerRingOffset("counting", 0.5, r)).toBeCloseTo(
      circumference * 0.5,
    );
  });

  it("full fraction → 0 offset", () => {
    expect(computeTimerRingOffset("counting", 1, 28)).toBeCloseTo(0);
  });
});

describe("compensateForLag", () => {
  it("subtracts whole seconds elapsed since serverTs", () => {
    const now = 10_000;
    const serverTs = now - 2500; // 2.5s ago → floors to 2
    expect(compensateForLag(20, serverTs, now)).toBe(18);
  });

  it("clamps at 0 when lag exceeds timeRemaining", () => {
    const now = 10_000;
    const serverTs = now - 10_000; // 10s ago
    expect(compensateForLag(5, serverTs, now)).toBe(0);
  });

  it("guards against NaN lag (bad serverTs)", () => {
    expect(compensateForLag(15, Number.NaN, 10_000)).toBe(15);
  });

  it("defaults now to Date.now() when omitted", () => {
    const result = compensateForLag(20, Date.now());
    expect(result).toBe(20);
  });
});
