/** Dev-only mock helper (ADR 0010) for the mimic toolbar's player roster: rows are
 * added/removed one at a time (nickname + role), capped at CAST_MAX, and kept in
 * the `cast` URL search param so the roster survives navigation and reload. */
import { MOCK_NAMES } from "./fixtures.js";

export const CAST_MAX = 20;

export type CastRow = { nickname: string; role: "player" | "observer" };

/** Parses `?cast=` (comma-separated `nickname:role`, nickname URL-component-encoded)
 * into rows. Malformed or empty input returns null so callers fall back to defaultCast. */
export function parseCast(raw: string | null): CastRow[] | null {
  if (!raw) return null;
  const rows: CastRow[] = [];
  for (const part of raw.split(",")) {
    const i = part.indexOf(":");
    if (i < 0) return null;
    // An empty nickname is a row mid-edit in the toolbar, not a broken param.
    const nickname = decodeURIComponent(part.slice(0, i));
    const roleRaw = part.slice(i + 1);
    const role: CastRow["role"] =
      roleRaw === "observer" ? "observer" : "player";
    rows.push({ nickname, role });
  }
  return rows.length > 0 ? rows.slice(0, CAST_MAX) : null;
}

/** Serializes rows back into the `cast` param format `parseCast` reads. */
export function serializeCast(rows: CastRow[]): string {
  return rows
    .map((r) => `${encodeURIComponent(r.nickname)}:${r.role}`)
    .join(",");
}

/** First `count` MOCK_NAMES as players — the roster a URL with no `cast`
 * param renders (same names and order as `fixturePlayers(count)`). */
export function defaultCast(count = 4): CastRow[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    nickname: MOCK_NAMES[i % MOCK_NAMES.length],
    role: "player" as const,
  }));
}

/** A random unused MOCK_NAMES entry (falls back to "Player N" once exhausted),
 * role player 3:1 over observer. */
export function randomCastRow(existing: CastRow[]): CastRow {
  const used = new Set(existing.map((r) => r.nickname));
  const available = MOCK_NAMES.filter((n) => !used.has(n));
  const nickname =
    available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : `Player ${existing.length + 1}`;
  const role: CastRow["role"] = Math.random() < 0.75 ? "player" : "observer";
  return { nickname, role };
}
