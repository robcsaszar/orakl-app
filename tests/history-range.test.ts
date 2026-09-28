import { describe, expect, it } from "vitest";
import {
  parseHistoryRange,
  rangeFloor,
} from "../src/routes/(app)/history/range.js";

describe("parseHistoryRange", () => {
  it("accepts the known values", () => {
    expect(parseHistoryRange("all")).toBe("all");
    expect(parseHistoryRange("30d")).toBe("30d");
    expect(parseHistoryRange("7d")).toBe("7d");
  });

  it("falls back to all for missing or invalid input", () => {
    expect(parseHistoryRange(null)).toBe("all");
    expect(parseHistoryRange("60d")).toBe("all");
    expect(parseHistoryRange("")).toBe("all");
  });
});

describe("rangeFloor", () => {
  const NOW = new Date("2024-06-15T12:00:00Z").getTime();

  it("has no floor for all", () => {
    expect(rangeFloor("all", NOW)).toEqual({});
  });

  it("floors 30 days back for both date shapes", () => {
    expect(rangeFloor("30d", NOW)).toEqual({
      gamesSince: "2024-05-16 12:00:00",
      soloSince: NOW - 30 * 24 * 60 * 60 * 1000,
    });
  });

  it("floors 7 days back for both date shapes", () => {
    expect(rangeFloor("7d", NOW)).toEqual({
      gamesSince: "2024-06-08 12:00:00",
      soloSince: NOW - 7 * 24 * 60 * 60 * 1000,
    });
  });
});
