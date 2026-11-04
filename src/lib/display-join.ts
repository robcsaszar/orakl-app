/** Roster shape for the display's pre-game join view. */
import type { Player } from "@orakl/protocol";

export interface JoinRoster {
  /** First `cap` approved players, in received order. */
  shown: Player[];
  /** Approved players past `cap`. */
  overflow: number;
  /** Total approved players (pending excluded). */
  joined: number;
}

/** Most players the join view ever shows. */
export const JOIN_ROSTER_MAX = 10;

/** Filters out pending players, then caps the roster for the join view at `cap` (max `JOIN_ROSTER_MAX`). */
export function joinRoster(
  players: Player[],
  cap = JOIN_ROSTER_MAX,
): JoinRoster {
  const approved = players.filter((p) => p.status !== "pending");
  const shownCap = Math.max(0, Math.min(JOIN_ROSTER_MAX, cap));
  return {
    shown: approved.slice(0, shownCap),
    overflow: Math.max(0, approved.length - shownCap),
    joined: approved.length,
  };
}

/**
 * Rewrites the module stroke of a `qrcode` SVG string to `currentColor` so the
 * host element's text colour paints the code. Expects a transparent light
 * colour, which drops the background path.
 */
export function qrSvgCurrentColor(svg: string): string {
  return svg.replace(/stroke="#[0-9a-fA-F]{3,8}"/, 'stroke="currentColor"');
}
