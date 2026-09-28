import type { QuizQuestion } from "@orakl/protocol";
import type { PlayerData } from "../svelte/quizSession.svelte.js";
import type { CuratorPlayer, GameQuestion } from "../types/game.types.js";
import type { CastRow } from "./cast.js";

export const CORRECT_ANSWER_ID = "a1";
export const MOCK_PLAYER_ID = "mock-player-1";
export const MOCK_AVATAR_ID = "angel_new";

// 16:9 landscape placeholders — dark/light variants for UI contrast testing
export const PLACEHOLDER_IMG_DARK =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><rect width='16' height='9' fill='%231a1f2e'/><path d='M0 7 Q4 5 8 6 Q12 7 16 5 L16 9 L0 9z' fill='%232d3748'/><circle cx='13' cy='2.5' r='1.5' fill='%234a5568'/></svg>";
export const PLACEHOLDER_IMG_LIGHT =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'><rect width='16' height='9' fill='%23f0f0f0'/><path d='M0 7 Q4 5 8 6 Q12 7 16 5 L16 9 L0 9z' fill='%23e0e0e0'/><circle cx='13' cy='2.5' r='1.5' fill='%23cccccc'/></svg>";

export const MOCK_NAMES = [
  "Athena",
  "Hermes",
  "Odysseus",
  "Calypso",
  "Achilles",
  "Circe",
  "Persephone",
  "Daedalus",
  "Iphigenia",
  "Patroclus",
];
const MOCK_SCORES = [320, 180, 410, 90, 270, 150, 380, 220, 60, 300];
// ~30% of slots are empty (no avatar)
const MOCK_AVATARS = [
  MOCK_AVATAR_ID,
  "adder",
  "",
  "butterfly_1_new",
  "bone_dragon",
  "",
  "butterfly_5",
  "cacodemon",
  "",
  "centaur",
];

export const FIXTURE_TOPICS_JSON = JSON.stringify([
  { id: "science", name: "Science", icon: "🔬", count: 10 },
  { id: "history", name: "History", icon: "📜", count: 10 },
]);

export const FIXTURE_SCORE_ICONS_JSON = JSON.stringify({
  1: "⚡",
  5: "🌟",
  10: "🔥",
});

export function fixtureQuestion(qtype: string): GameQuestion {
  const base = {
    questionId: `mock-${qtype}`,
    questionIndex: 0,
    totalQuestions: 5,
    categoryId: "science",
    difficulty: "medium" as const,
    timeRemaining: 20,
    serverTs: Date.now(),
  };

  if (qtype === "true_false") {
    return {
      ...base,
      text: "The Great Wall of China is visible from space with the naked eye.",
      questionType: "true_false",
      answers: [
        { id: "a1", text: "True" },
        { id: "a2", text: "False" },
      ],
    };
  }

  if (qtype === "image_matching") {
    return {
      ...base,
      text: "Match each city to its country.",
      questionType: "image_matching",
      answers: [
        { id: "a1", text: "Athens|Greece" },
        { id: "a2", text: "Rome|Italy" },
        { id: "a3", text: "Cairo|Egypt" },
      ],
      matchItems: {
        left: ["Athens", "Rome", "Cairo"],
        right: ["Greece", "Italy", "Egypt"],
      },
    };
  }

  return {
    ...base,
    text: "What is the speed of light in a vacuum?",
    questionType: "text_choice",
    answers: [
      { id: "a1", text: "299,792 km/s" },
      { id: "a2", text: "150,000 km/s" },
      { id: "a3", text: "500,000 km/s" },
      { id: "a4", text: "1,080,000 km/h" },
    ],
  };
}

export function fixtureQuizQuestion(qtype: string): QuizQuestion {
  const base = {
    id: "fixture-q1",
    categoryId: "science",
    difficulty: "medium" as const,
  };

  if (qtype === "true_false") {
    return {
      ...base,
      text: "The Great Wall of China is visible from space with the naked eye.",
      type: "true_false" as const,
      answers: [
        { id: "a1", text: "True", isCorrect: false },
        { id: "a2", text: "False", isCorrect: true },
      ],
    };
  }

  if (qtype === "image_matching") {
    return {
      ...base,
      text: "Match each city to its country.",
      type: "image_matching" as const,
      matchItems: {
        left: ["Athens", "Rome", "Cairo"],
        right: ["Greece", "Italy", "Egypt"],
      },
      answers: [
        { id: "a1", text: "Athens|Greece", isCorrect: true },
        { id: "a2", text: "Rome|Italy", isCorrect: true },
        { id: "a3", text: "Cairo|Egypt", isCorrect: true },
      ],
    };
  }

  return {
    ...base,
    text: "What is the speed of light in a vacuum?",
    type: "text_choice" as const,
    answers: [
      { id: "a1", text: "299,792 km/s", isCorrect: true },
      { id: "a2", text: "150,000 km/s", isCorrect: false },
      { id: "a3", text: "500,000 km/s", isCorrect: false },
      { id: "a4", text: "1,080,000 km/h", isCorrect: false },
    ],
  };
}

export function fixturePlayers(count: number): PlayerData[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    id: i === 0 ? MOCK_PLAYER_ID : `mock-player-${i + 1}`,
    nickname: MOCK_NAMES[i % MOCK_NAMES.length],
    avatar: MOCK_AVATARS[i % MOCK_AVATARS.length],
    score: i === 0 ? 250 : (MOCK_SCORES[i - 1] ?? 100),
    status: "active" as const,
    role: "player" as const,
  }));
}

export function fixturePlayersFromCast(rows: CastRow[]): PlayerData[] {
  return rows.map((row, i) => ({
    id: i === 0 ? MOCK_PLAYER_ID : `mock-player-${i + 1}`,
    nickname: row.nickname,
    avatar: MOCK_AVATARS[i % MOCK_AVATARS.length],
    score: i === 0 ? 250 : (MOCK_SCORES[i - 1] ?? 100),
    status: "active" as const,
    role: row.role,
  }));
}

export function fixtureCuratorPlayers(count: number): CuratorPlayer[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    id: `mock-curator-p${i + 1}`,
    nickname: MOCK_NAMES[i % MOCK_NAMES.length],
    avatar: MOCK_AVATARS[i % MOCK_AVATARS.length],
    score: MOCK_SCORES[i % MOCK_SCORES.length],
    status: "active" as const,
    role: "player" as const,
    hasAnswered: false,
  }));
}
