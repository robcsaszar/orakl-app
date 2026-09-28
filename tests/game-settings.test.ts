import { describe, expect, it } from "vitest";
import { GAME } from "../data/game.settings";

describe("GAME constants", () => {
  it("timerOptions contains expected values", () => {
    expect(GAME.roundConfig.timerOptions).toEqual([15, 30, 45, 60]);
  });
  it("questionCounts contains expected values", () => {
    expect(GAME.roundConfig.questionCounts).toEqual([10, 20, 50, 100]);
  });
  it("difficultyOptions contains all + difficulties", () => {
    expect(GAME.roundConfig.difficultyOptions).toEqual([
      "all",
      "easy",
      "medium",
      "hard",
    ]);
  });
  it("autoAdvanceMs is 5000", () => {
    expect(GAME.roundConfig.autoAdvanceMs).toBe(5000);
  });
  it("defaultQuestions is 10", () => {
    expect(GAME.roundConfig.defaultQuestions).toBe(10);
  });
  it("roleSelection.durationSeconds is 60", () => {
    expect(GAME.roleSelection.durationSeconds).toBe(60);
  });
  it("player.maxNicknameLength is 20", () => {
    expect(GAME.player.maxNicknameLength).toBe(20);
  });
  it("sse.keepaliveIntervalMs is 15000", () => {
    expect(GAME.sse.keepaliveIntervalMs).toBe(15000);
  });
});
