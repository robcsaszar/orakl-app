import { describe, expect, it } from "vitest";
import {
  isInWindow,
  nextOpening,
  occurrenceBounds,
  occurrenceOf,
  type SeasonWindow,
} from "../src/lib/season-window.js";

const at = (iso: string) => new Date(iso);

const christmas: SeasonWindow = {
  repeats_yearly: true,
  window_start: "12-20",
  window_end: "01-06",
};
const halloween: SeasonWindow = {
  repeats_yearly: true,
  window_start: "10-15",
  window_end: "11-01",
};
const october: SeasonWindow = {
  repeats_yearly: false,
  window_start: "2026-10-01",
  window_end: "2026-10-31",
};

describe("isInWindow, yearly", () => {
  it("wraps the year end: in on 25 Dec and 6 Jan, out on 7 Jan", () => {
    expect(isInWindow(christmas, at("2026-12-25T12:00:00Z"))).toBe(true);
    expect(isInWindow(christmas, at("2027-01-06T12:00:00Z"))).toBe(true);
    expect(isInWindow(christmas, at("2027-01-07T00:00:00Z"))).toBe(false);
    expect(isInWindow(christmas, at("2026-12-19T23:59:59Z"))).toBe(false);
    expect(isInWindow(christmas, at("2026-07-01T00:00:00Z"))).toBe(false);
  });

  it("holds inside a plain window, both ends inclusive, in any year", () => {
    expect(isInWindow(halloween, at("2026-10-15T00:00:00Z"))).toBe(true);
    expect(isInWindow(halloween, at("2026-10-24T09:00:00Z"))).toBe(true);
    expect(isInWindow(halloween, at("2031-11-01T23:59:59Z"))).toBe(true);
    expect(isInWindow(halloween, at("2026-10-14T23:59:59Z"))).toBe(false);
    expect(isInWindow(halloween, at("2026-11-02T00:00:00Z"))).toBe(false);
  });

  it("reads the day in UTC", () => {
    expect(isInWindow(halloween, at("2026-10-14T23:30:00Z"))).toBe(false);
    expect(isInWindow(halloween, at("2026-10-15T00:30:00Z"))).toBe(true);
  });
});

describe("isInWindow, dated", () => {
  it("is in on both end days, out after, and out in the next year", () => {
    expect(isInWindow(october, at("2026-10-01T00:00:00Z"))).toBe(true);
    expect(isInWindow(october, at("2026-10-31T23:59:59Z"))).toBe(true);
    expect(isInWindow(october, at("2026-09-30T23:59:59Z"))).toBe(false);
    expect(isInWindow(october, at("2026-11-01T00:00:00Z"))).toBe(false);
    expect(isInWindow(october, at("2027-10-15T12:00:00Z"))).toBe(false);
  });
});

describe("nextOpening", () => {
  it("opens a yearly 02-29 start on 1 March when the next year has no leap day", () => {
    const leapDay: SeasonWindow = {
      repeats_yearly: true,
      window_start: "02-29",
      window_end: "03-05",
    };
    expect(nextOpening(leapDay, at("2026-03-01T12:00:00Z"))).toBe("2027-03-01");
  });

  it("gives this year's start before a yearly window, next year's after", () => {
    expect(nextOpening(halloween, at("2026-06-01T12:00:00Z"))).toBe(
      "2026-10-15",
    );
    expect(nextOpening(halloween, at("2026-10-15T12:00:00Z"))).toBe(
      "2027-10-15",
    );
    expect(nextOpening(halloween, at("2026-11-05T12:00:00Z"))).toBe(
      "2027-10-15",
    );
  });

  it("gives a dated window's start before it and null once it began", () => {
    expect(nextOpening(october, at("2026-09-20T12:00:00Z"))).toBe("2026-10-01");
    expect(nextOpening(october, at("2026-11-02T12:00:00Z"))).toBeNull();
  });
});

describe("nextOpening on a 02-29 start", () => {
  it("opens on 1 March in a non-leap year when the window reaches it", () => {
    const w = {
      repeats_yearly: true,
      window_start: "02-29",
      window_end: "03-05",
    };
    expect(nextOpening(w, new Date("2026-10-18T12:00:00Z"))).toBe("2027-03-01");
  });
  it("waits for the next leap year when the window is the day itself", () => {
    const w = {
      repeats_yearly: true,
      window_start: "02-29",
      window_end: "02-29",
    };
    expect(nextOpening(w, new Date("2026-10-18T12:00:00Z"))).toBe("2028-02-29");
  });
});

describe("occurrenceOf", () => {
  it("names the opening day of the wrapping window containing the day", () => {
    expect(occurrenceOf(christmas, at("2027-01-03T12:00:00Z"))).toBe(
      "2026-12-20",
    );
    expect(occurrenceOf(christmas, at("2026-12-25T12:00:00Z"))).toBe(
      "2026-12-20",
    );
  });

  it("is null outside every occurrence", () => {
    expect(occurrenceOf(christmas, at("2026-07-01T12:00:00Z"))).toBeNull();
    expect(occurrenceOf(october, at("2026-11-01T00:00:00Z"))).toBeNull();
  });

  it("gives a non-wrapping yearly window this year's start", () => {
    expect(occurrenceOf(halloween, at("2025-10-20T12:00:00Z"))).toBe(
      "2025-10-15",
    );
  });

  it("gives a dated window its start", () => {
    expect(occurrenceOf(october, at("2026-10-12T12:00:00Z"))).toBe(
      "2026-10-01",
    );
  });
});

describe("occurrenceBounds", () => {
  it("ends a wrapping window in the next year", () => {
    expect(occurrenceBounds(christmas, "2026-12-20")).toEqual({
      start: Date.parse("2026-12-20T00:00:00.000Z"),
      end: Date.parse("2027-01-06T23:59:59.999Z"),
    });
  });

  it("ends a non-wrapping window in the opening's year", () => {
    expect(occurrenceBounds(halloween, "2026-10-15")).toEqual({
      start: Date.parse("2026-10-15T00:00:00.000Z"),
      end: Date.parse("2026-11-01T23:59:59.999Z"),
    });
  });

  it("ends a dated window on its end day", () => {
    expect(occurrenceBounds(october, "2026-10-01").end).toBe(
      Date.parse("2026-10-31T23:59:59.999Z"),
    );
  });

  it("ends a 02-29 window on 02-28 in a common year", () => {
    const leapDay: SeasonWindow = {
      repeats_yearly: true,
      window_start: "12-01",
      window_end: "02-29",
    };
    expect(occurrenceBounds(leapDay, "2026-12-01").end).toBe(
      Date.parse("2027-02-28T23:59:59.999Z"),
    );
    expect(occurrenceBounds(leapDay, "2027-12-01").end).toBe(
      Date.parse("2028-02-29T23:59:59.999Z"),
    );
  });
});
