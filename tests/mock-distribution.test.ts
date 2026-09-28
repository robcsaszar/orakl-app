import { describe, expect, it } from "vitest";
import { defaultCast } from "../src/lib/mock/cast.js";
import {
  assignBotAnswers,
  defaultBotDistribution,
  parseDistParam,
  resolveBotDistribution,
} from "../src/lib/mock/distribution.js";

describe("parseDistParam", () => {
  it("returns null when raw is missing", () => {
    expect(parseDistParam(null, 4)).toBeNull();
    expect(parseDistParam("", 4)).toBeNull();
  });

  it("parses a comma list into counts", () => {
    expect(parseDistParam("3,1,0,0", 4)).toEqual([3, 1, 0, 0]);
  });

  it("pads short lists and truncates long ones to the slot count", () => {
    expect(parseDistParam("3,1", 4)).toEqual([3, 1, 0, 0]);
    expect(parseDistParam("3,1,2,5,9", 4)).toEqual([3, 1, 2, 5]);
  });

  it("clamps negative/garbage entries to 0", () => {
    expect(parseDistParam("-2,abc,4", 3)).toEqual([0, 0, 4]);
  });
});

describe("defaultBotDistribution", () => {
  it("mirrors the historical 60/40 split across slots 0 and 1", () => {
    expect(defaultBotDistribution(4, 5)).toEqual([3, 2, 0, 0]);
    expect(defaultBotDistribution(2, 9)).toEqual([5, 4]);
  });

  it("returns all zeros when there are no bots", () => {
    expect(defaultBotDistribution(4, 0)).toEqual([0, 0, 0, 0]);
  });
});

describe("resolveBotDistribution", () => {
  it("falls back to the default split when dist is absent", () => {
    expect(resolveBotDistribution(null, 4, 5)).toEqual(
      defaultBotDistribution(4, 5),
    );
  });

  it("uses the explicit dist param when present", () => {
    expect(resolveBotDistribution("1,2,0,0", 4, 3)).toEqual([1, 2, 0, 0]);
  });

  it("clamps the running total so it never exceeds botCount", () => {
    expect(resolveBotDistribution("5,5,5,5", 4, 6)).toEqual([5, 1, 0, 0]);
  });
});

describe("resolveBotDistribution — botCount from a cast", () => {
  it("derives botCount as rows.length - 1 and feeds it through", () => {
    const rows = defaultCast(5);
    const botCount = rows.length - 1;
    expect(resolveBotDistribution(null, 2, botCount)).toEqual(
      defaultBotDistribution(2, botCount),
    );
  });
});

describe("assignBotAnswers", () => {
  it("flattens per-slot counts into one answer value per bot, in slot order", () => {
    expect(assignBotAnswers([2, 1, 0], ["a1", "a2", "a3"])).toEqual([
      "a1",
      "a1",
      "a2",
    ]);
  });

  it("returns an empty list when all counts are zero", () => {
    expect(assignBotAnswers([0, 0], ["a1", "a2"])).toEqual([]);
  });
});
