import { describe, expect, it } from "vitest";
import {
  EMOTE_SPRITES,
  emoteStyle,
  pickRandomEmotes,
  SELECTABLE_EMOTE_IDS,
} from "../src/lib/emotes.js";

describe("EMOTE_SPRITES", () => {
  it("has 29 entries (blank placeholder excluded)", () => {
    expect(Object.keys(EMOTE_SPRITES)).toHaveLength(29);
  });

  it("all coordinates are multiples of 16 within the 80×96 sheet", () => {
    for (const [id, { x, y }] of Object.entries(EMOTE_SPRITES)) {
      expect(x % 16, `${id}.x`).toBe(0);
      expect(y % 16, `${id}.y`).toBe(0);
      expect(x, `${id}.x in range`).toBeLessThanOrEqual(64);
      expect(y, `${id}.y in range`).toBeLessThanOrEqual(80);
    }
  });
});

describe("SELECTABLE_EMOTE_IDS", () => {
  it("matches the keys of EMOTE_SPRITES", () => {
    expect(SELECTABLE_EMOTE_IDS).toEqual(Object.keys(EMOTE_SPRITES));
  });

  it("does not include the blank placeholder", () => {
    expect(SELECTABLE_EMOTE_IDS).not.toContain("emote__");
  });

  it("includes known emotes", () => {
    expect(SELECTABLE_EMOTE_IDS).toContain("heart");
    expect(SELECTABLE_EMOTE_IDS).toContain("star");
    expect(SELECTABLE_EMOTE_IDS).toContain("question");
  });
});

describe("emoteStyle", () => {
  it("returns empty string for unknown emoteId", () => {
    expect(emoteStyle("unknown_emote")).toBe("");
  });

  it("returns a CSS string for a known emoteId", () => {
    const style = emoteStyle("heart", 32);
    expect(style).toContain("width:32px");
    expect(style).toContain("height:32px");
    expect(style).toContain("image-rendering:pixelated");
    expect(style).toContain("background-image:url('/images/emotes.png')");
  });

  it("scales background-size proportionally to size", () => {
    // At size=16 (1×): sheet is 80×96px; at size=32 (2×): 160×192px
    expect(emoteStyle("heart", 16)).toContain("background-size:80px 96px");
    expect(emoteStyle("heart", 32)).toContain("background-size:160px 192px");
  });

  it("negates background-position for sprite offset", () => {
    // heart is at { x: 16, y: 80 }; at size=32 scale=2: position = -32px -160px
    const style = emoteStyle("heart", 32);
    expect(style).toContain("background-position:-32px -160px");
  });

  it("defaults to size 32 when omitted", () => {
    expect(emoteStyle("star")).toContain("width:32px");
  });
});

describe("pickRandomEmotes", () => {
  it("returns exactly n emotes when n ≤ pool size", () => {
    expect(pickRandomEmotes(5)).toHaveLength(5);
    expect(pickRandomEmotes(1)).toHaveLength(1);
    expect(pickRandomEmotes(0)).toHaveLength(0);
  });

  it("returns at most pool-size emotes when n > pool", () => {
    const all = pickRandomEmotes(999);
    expect(all.length).toBe(SELECTABLE_EMOTE_IDS.length);
  });

  it("returns no duplicates", () => {
    const picked = pickRandomEmotes(10);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it("all returned IDs are valid selectable emote IDs", () => {
    const pool = new Set(SELECTABLE_EMOTE_IDS);
    for (const id of pickRandomEmotes(15)) {
      expect(pool.has(id)).toBe(true);
    }
  });

  it("is non-deterministic across calls (statistically)", () => {
    // Very unlikely to pick the same 5 twice from 29
    const a = pickRandomEmotes(5).join(",");
    const b = pickRandomEmotes(5).join(",");
    const c = pickRandomEmotes(5).join(",");
    expect([a, b, c].every((x) => x === a)).toBe(false);
  });
});
