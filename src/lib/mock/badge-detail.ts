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
  "faster-than-most": "outran most on 3 questions",
  clutch: "4 down to the wire",
  "quick-draw": "2.1s average",
  decisive: "78% before halfway",
  "sure-handed": "84% right before halfway",
  "unbroken-focus": "never left the trial",
  devotee: "4 days running",
  herculean: "5 hard, all correct",
  undaunted: "3 misses, never two in a row",
  measured: "88% accuracy, unhurried",
  "strong-start": "5 to open",
  "new-heights": "new best score",
  "far-horizons": "10 categories answered right",
  cassandra: "3 rounds against the field",
  "lone-torch": "only one right",
  ascendant: "climbed 3 places",
  undisputed: "first every round",
};
