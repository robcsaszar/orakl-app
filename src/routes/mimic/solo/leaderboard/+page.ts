import type {
  LeaderboardBoard,
  LeaderboardDifficulty,
  LeaderboardEntry,
  LeaderboardScope,
} from "@orakl/protocol";
import type { PageLoad } from "./$types";

const BOARDS: LeaderboardBoard[] = [
  "score",
  "streak",
  "accuracy",
  "speed",
  "survival",
];
const SCOPES: LeaderboardScope[] = ["all-time", "daily", "weekly", "monthly"];
const DIFFICULTIES: LeaderboardDifficulty[] = ["easy", "medium", "hard"];

// Fixture leaderboard so the real page renders in mimic without a DB.
const ENTRIES: LeaderboardEntry[] = [
  {
    rank: 1,
    user_id: "u1",
    nickname: "Pythia",
    total_score: 980,
    correct_count: 19,
    total_answered: 20,
    time_to_answer_avg_ms: 2400,
    max_streak: 12,
    completed_at: 0,
  },
  {
    rank: 2,
    user_id: "u2",
    nickname: "Cassandra",
    total_score: 910,
    correct_count: 18,
    total_answered: 20,
    time_to_answer_avg_ms: 2800,
    max_streak: 9,
    completed_at: 0,
  },
  {
    rank: 3,
    user_id: "u3",
    nickname: "Tiresias",
    total_score: 870,
    correct_count: 17,
    total_answered: 20,
    time_to_answer_avg_ms: 3100,
    max_streak: 7,
    completed_at: 0,
  },
  {
    rank: 4,
    user_id: "u4",
    nickname: "Delphi",
    total_score: 760,
    correct_count: 15,
    total_answered: 20,
    time_to_answer_avg_ms: 3600,
    max_streak: 5,
    completed_at: 0,
  },
];

export const load: PageLoad = ({ url }) => {
  const rawBoard = url.searchParams.get("board") ?? "score";
  const board: LeaderboardBoard = BOARDS.includes(rawBoard as LeaderboardBoard)
    ? (rawBoard as LeaderboardBoard)
    : "score";
  const rawScope = url.searchParams.get("scope") ?? "all-time";
  const scope: LeaderboardScope = SCOPES.includes(rawScope as LeaderboardScope)
    ? (rawScope as LeaderboardScope)
    : "all-time";
  const rawDifficulty = url.searchParams.get("difficulty");
  const difficulty: LeaderboardDifficulty | null = DIFFICULTIES.includes(
    rawDifficulty as LeaderboardDifficulty,
  )
    ? (rawDifficulty as LeaderboardDifficulty)
    : null;
  // Survival ignores the category filter, mirroring the production loader.
  const categoryId =
    board === "survival" ? null : url.searchParams.get("categoryId");
  return {
    entries: ENTRIES,
    board,
    scope,
    categoryId,
    difficulty,
    categories: [
      { id: "science", name: "Science" },
      { id: "history", name: "History" },
    ],
    // Fixture viewer standing so the "your rank" card + share render in preview.
    userRank: 2,
    eligibleCount: 4,
    percentile: 50,
    around: url.searchParams.get("around") === "1",
    viewerId: "u2",
  };
};
