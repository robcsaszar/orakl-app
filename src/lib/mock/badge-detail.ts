import type { BadgeId } from "@orakl/shared";

/**
 * Representative per-run detail lines for the mimic BADGES override — the real
 * UI always shows a dynamic detail alongside a badge (see computeBadges), so a
 * forced badge needs a plausible stand-in rather than rendering bare.
 */
export const MOCK_BADGE_DETAIL: Record<BadgeId, string> = {
  victor: "first among 6",
  podium: "finished #2",
  flawless: "every answer correct",
  sharpshooter: "96% accuracy",
  unstoppable: "12 in a row",
  "on-a-roll": "7 in a row",
  survivor: "22 answered, 18 correct",
  "giant-slayer": "92% on hard",
  pantheon: "3 categories aced",
  specialist: "aced science",
  polymath: "strong across all difficulties",
  phoenix: "rallied to 6 in a row",
  "strong-finish": "6 to close it out",
  "master-of-none": "4 categories spanned",
  "faster-than-most": "beat 82% of solvers",
  clutch: "4 down to the wire",
  "quick-draw": "2.1s average",
  decisive: "78% before halfway",
  "sure-handed": "no answer ever changed",
  "unbroken-focus": "never left the trial",
  devotee: "4 days running",
};
