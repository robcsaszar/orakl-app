import type {
  PlayerGamePlacement,
  PlayerGameStats,
  SoloHistoryEntry,
} from "@orakl/protocol";
import type { BadgeTally } from "@orakl/shared";
import type { PageLoad } from "./$types";

// Unified tally (solo + multiplayer) so the badge row previews both kinds.
const BADGE_TALLY: BadgeTally = {
  victor: { count: 1, bestRarity: "legendary" },
  podium: { count: 2, bestRarity: "rare" },
  "on-a-roll": { count: 2, bestRarity: "rare" },
  decisive: { count: 3, bestRarity: "legendary" },
  "unbroken-focus": { count: 1, bestRarity: "common" },
  survivor: { count: 1, bestRarity: "exotic" },
};

// Fixture history so the real page renders in mimic without a DB.
const RUNS: SoloHistoryEntry[] = [
  {
    id: "r1",
    total_score: 480,
    total_answered: 10,
    correct_count: 9,
    time_to_answer_avg_ms: 2600,
    max_streak: 9,
    mode: "normal",
    difficulty: "all",
    category_ids: '["science","history"]',
    completed_at: 1_717_000_000_000,
  },
  {
    id: "r2",
    total_score: 310,
    total_answered: 10,
    correct_count: 7,
    time_to_answer_avg_ms: 3400,
    max_streak: 4,
    mode: "normal",
    difficulty: "hard",
    category_ids: '["science"]',
    completed_at: 1_716_500_000_000,
  },
  {
    id: "r3",
    total_score: 0,
    total_answered: 22,
    correct_count: 18,
    time_to_answer_avg_ms: 2900,
    max_streak: 6,
    mode: "endless",
    difficulty: "all",
    category_ids: '["history"]',
    completed_at: 1_716_000_000_000,
  },
];

const GAME_STATS: PlayerGameStats = {
  games: 4,
  wins: 1,
  podiums: 3,
  best_rank: 1,
};

const GAMES: PlayerGamePlacement[] = [
  {
    id: "g1",
    quiz_name: "Friday night myths",
    started_at: "2024-05-30 19:00:00",
    final_score: 720,
    rank: 1,
    player_count: 8,
    badges: ["victor", "quick-draw"],
  },
  {
    id: "g2",
    quiz_name: "Office trivia",
    started_at: "2024-05-22 18:30:00",
    final_score: 540,
    rank: 3,
    player_count: 6,
    badges: ["podium"],
  },
  {
    id: "g3",
    quiz_name: "Pub quiz",
    started_at: "2024-05-10 20:00:00",
    final_score: 380,
    rank: 5,
    player_count: 9,
    badges: [],
  },
];

export const load: PageLoad = () => ({
  // The real page's data type includes the (app) layout's flag.
  isLoggedIn: true,
  range: "all" as const,
  runs: RUNS,
  trendRuns: RUNS,
  latestRunAt: RUNS[0].completed_at,
  latestGameAt: GAMES[0].started_at,
  stats: {
    runs: 3,
    best_score: 480,
    best_streak: 9,
    total_answered: 42,
    total_correct: 34,
  },
  badgeTally: BADGE_TALLY,
  categoryName: { science: "Science", history: "History" },
  // Fixture lifetime telemetry so the new stat tiles render in preview.
  attemptStats: { attempts: 42, focusRate: 0.93, fastestCorrectMs: 1400 },
  dayStreak: 4,
  mastery: {
    strongest: { categoryId: "science", correct: 28, total: 30 },
    weakest: { categoryId: "history", correct: 6, total: 12 },
  },
  gameStats: GAME_STATS,
  games: GAMES,
  runsNextCursor: null,
  gamesNextCursor: null,
});
