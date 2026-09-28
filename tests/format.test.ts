import { describe, expect, it } from "vitest";
import {
  formatDateShort,
  formatDateTimeDefault,
  formatDateTimeEnGb,
  formatDateTimeLocal,
} from "../src/lib/format.js";

const FIXED = new Date(Date.UTC(2024, 0, 15, 13, 5));

describe("formatDateTimeEnGb", () => {
  it("matches en-GB dateStyle/timeStyle short", () => {
    expect(formatDateTimeEnGb(FIXED)).toBe(
      FIXED.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }),
    );
  });

  it("accepts a string or number input", () => {
    expect(formatDateTimeEnGb(FIXED.toISOString())).toBe(
      formatDateTimeEnGb(FIXED),
    );
    expect(formatDateTimeEnGb(FIXED.getTime())).toBe(formatDateTimeEnGb(FIXED));
  });
});

describe("formatDateShort", () => {
  it("matches the browser-default month/day/year format", () => {
    expect(formatDateShort(FIXED)).toBe(
      FIXED.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  });
});

describe("formatDateTimeLocal", () => {
  it("matches the browser-default medium date / short time format", () => {
    expect(formatDateTimeLocal(FIXED)).toBe(
      FIXED.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    );
  });
});

describe("formatDateTimeDefault", () => {
  it("matches the browser-default toLocaleString with no options", () => {
    expect(formatDateTimeDefault(FIXED)).toBe(FIXED.toLocaleString());
  });
});
