import { describe, expect, it } from "vitest";
import {
  CAST_MAX,
  type CastRow,
  defaultCast,
  parseCast,
  randomCastRow,
  serializeCast,
} from "../src/lib/mock/cast.js";
import { fixturePlayers } from "../src/lib/mock/fixtures.js";

describe("parseCast / serializeCast", () => {
  it("round-trips serialize", () => {
    const rows: CastRow[] = [
      { nickname: "Athena", role: "player" },
      { nickname: "Hermes", role: "observer" },
    ];
    expect(parseCast(serializeCast(rows))).toEqual(rows);
  });

  it("truncates to 20 rows", () => {
    const rows: CastRow[] = Array.from({ length: 25 }, (_, i) => ({
      nickname: `P${i}`,
      role: "player" as const,
    }));
    expect(parseCast(serializeCast(rows))).toHaveLength(CAST_MAX);
  });

  it("treats an unknown role as player", () => {
    expect(parseCast("Athena:curator")).toEqual([
      { nickname: "Athena", role: "player" },
    ]);
  });

  it("returns null for empty or malformed input", () => {
    expect(parseCast(null)).toBeNull();
    expect(parseCast("")).toBeNull();
    expect(parseCast("no-colon-here")).toBeNull();
  });

  it("keeps a row whose nickname is being cleared in the toolbar", () => {
    expect(parseCast(":player,Hermes:observer")).toEqual([
      { nickname: "", role: "player" },
      { nickname: "Hermes", role: "observer" },
    ]);
  });
});

describe("defaultCast", () => {
  it("names match fixturePlayers(4)'s nicknames", () => {
    const rows = defaultCast(4);
    const players = fixturePlayers(4);
    expect(rows.map((r) => r.nickname)).toEqual(players.map((p) => p.nickname));
  });
});

describe("randomCastRow", () => {
  it("never repeats a used name while names remain", () => {
    let existing: CastRow[] = [];
    const names = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const row = randomCastRow(existing);
      expect(names.has(row.nickname)).toBe(false);
      names.add(row.nickname);
      existing = [...existing, row];
    }
  });
});
