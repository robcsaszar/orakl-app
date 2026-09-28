import type {
  AdvanceMode,
  DifficultyFilter,
  QuestionsPerRound,
  TimerDuration,
} from "../../data/game.settings.js";
import { GAME } from "../../data/game.settings.js";

export { radioOptionClass } from "./form-variants.js";

type CategoryData = { id: string; count: number };

export function calculateTotalQuestionPool(
  selectedIds: string[],
  categories: CategoryData[],
): string {
  if (selectedIds.length === 0) return "—";
  // O(n+m) via Map lookup instead of O(n×m) from categories.find per selected id
  const catById = new Map(categories.map((c) => [c.id, c]));
  const total = selectedIds.reduce(
    (sum, id) => sum + (catById.get(id)?.count ?? 0),
    0,
  );
  return `${total} ${total === 1 ? "question" : "questions"}`;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)
    return `${hours} ${hours !== 1 ? "hours" : "hour"} ${minutes} ${minutes !== 1 ? "minutes" : "minute"}`;
  if (minutes > 0)
    return `${minutes} ${minutes !== 1 ? "minutes" : "minute"} ${seconds} ${seconds !== 1 ? "seconds" : "second"}`;
  return `${seconds} ${seconds !== 1 ? "seconds" : "second"}`;
}

export function calculateMaxGameTime(
  questionsPerRound: number,
  timer: number,
  advanceMode?: AdvanceMode,
): string {
  if (advanceMode === "manual") return "∞";
  const advanceSeconds =
    advanceMode === "auto_10" ? 10 : advanceMode === "auto_5" ? 5 : 0;
  const overhead = advanceMode ? 5 : 0;
  const totalSeconds = questionsPerRound * (timer + advanceSeconds) + overhead;
  return formatDuration(totalSeconds);
}

export function validateQuizSetup(state: {
  selectedCategories: string[];
  timer: number;
  questionsPerRound?: number;
  difficulty: string;
}): string[] {
  const errors: string[] = [];
  if (state.selectedCategories.length === 0)
    errors.push("Select at least one category");
  if (!GAME.roundConfig.timerOptions.includes(state.timer as TimerDuration))
    errors.push("Invalid timer");
  if (
    state.questionsPerRound !== undefined &&
    !GAME.roundConfig.questionCounts.includes(
      state.questionsPerRound as QuestionsPerRound,
    )
  )
    errors.push("Invalid questions per round");
  if (
    !GAME.roundConfig.difficultyOptions.includes(
      state.difficulty as DifficultyFilter,
    )
  )
    errors.push("Invalid difficulty");
  return errors;
}
