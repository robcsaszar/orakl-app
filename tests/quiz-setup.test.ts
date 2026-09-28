import { describe, expect, it } from "vitest";
import {
  calculateMaxGameTime,
  calculateTotalQuestionPool,
  radioOptionClass,
  validateQuizSetup,
} from "../src/lib/quiz-setup";

const categories = [
  { id: "sci", count: 20 },
  { id: "hist", count: 15 },
  { id: "geo", count: 5 },
];

describe("calculateTotalQuestionPool", () => {
  it("returns — for empty selection", () => {
    expect(calculateTotalQuestionPool([], categories)).toBe("—");
  });

  it("sums counts for selected ids", () => {
    expect(calculateTotalQuestionPool(["sci", "hist"], categories)).toBe(
      "35 questions",
    );
  });

  it("singular for count of 1", () => {
    expect(calculateTotalQuestionPool(["geo"], [{ id: "geo", count: 1 }])).toBe(
      "1 question",
    );
  });

  it("ignores ids not in categories", () => {
    expect(calculateTotalQuestionPool(["unknown"], categories)).toBe(
      "0 questions",
    );
  });

  it("counts only selected categories", () => {
    expect(calculateTotalQuestionPool(["sci"], categories)).toBe(
      "20 questions",
    );
  });
});

describe("calculateMaxGameTime", () => {
  it("returns ∞ for manual advance mode", () => {
    expect(calculateMaxGameTime(10, 30, "manual")).toBe("∞");
  });

  it("computes seconds-only duration (no advance mode)", () => {
    // 5 * 10 = 50 seconds, no overhead
    expect(calculateMaxGameTime(5, 10)).toBe("50 seconds");
  });

  it("singular second", () => {
    expect(calculateMaxGameTime(1, 1)).toBe("1 second");
  });

  it("computes minutes + seconds", () => {
    // 10 * 30 = 300s = 5 minutes 0 seconds
    expect(calculateMaxGameTime(10, 30)).toBe("5 minutes 0 seconds");
  });

  it("includes advance time for auto_5", () => {
    // 10 * (30 + 5) + 5 = 355s = 5 minutes 55 seconds
    expect(calculateMaxGameTime(10, 30, "auto_5")).toBe("5 minutes 55 seconds");
  });

  it("includes advance time for auto_10", () => {
    // 10 * (30 + 10) + 5 = 405s = 6 minutes 45 seconds
    expect(calculateMaxGameTime(10, 30, "auto_10")).toBe(
      "6 minutes 45 seconds",
    );
  });

  it("computes hours + minutes for long games", () => {
    // 100 * 60 = 6000s = 1 hour 40 minutes
    expect(calculateMaxGameTime(100, 60)).toBe("1 hour 40 minutes");
  });
});

describe("validateQuizSetup", () => {
  const valid = {
    selectedCategories: ["sci"],
    timer: 30,
    questionsPerRound: 10,
    difficulty: "all",
  };

  it("returns empty array for valid state", () => {
    expect(validateQuizSetup(valid)).toEqual([]);
  });

  it("error when no categories selected", () => {
    expect(validateQuizSetup({ ...valid, selectedCategories: [] })).toContain(
      "Select at least one category",
    );
  });

  it("error for invalid timer", () => {
    expect(validateQuizSetup({ ...valid, timer: 99 })).toContain(
      "Invalid timer",
    );
  });

  it("error for invalid questionsPerRound", () => {
    expect(validateQuizSetup({ ...valid, questionsPerRound: 7 })).toContain(
      "Invalid questions per round",
    );
  });

  it("error for invalid difficulty", () => {
    expect(validateQuizSetup({ ...valid, difficulty: "extreme" })).toContain(
      "Invalid difficulty",
    );
  });

  it("returns all errors for fully invalid state", () => {
    const errors = validateQuizSetup({
      selectedCategories: [],
      timer: 99,
      questionsPerRound: 7,
      difficulty: "extreme",
    });
    expect(errors).toHaveLength(4);
  });
});

describe("radioOptionClass", () => {
  it("is a non-empty string", () => {
    expect(typeof radioOptionClass).toBe("string");
    expect(radioOptionClass.length).toBeGreaterThan(0);
  });
});
