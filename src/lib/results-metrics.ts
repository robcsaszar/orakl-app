import type { GameAnswerRecord } from "@orakl/protocol";
import { percent } from "@orakl/shared";

/** Standings subtitle lead-in for a stopped game — the completed count only. */
export function stoppedAfterCopy(served: number): string {
  return `Stopped after ${served} ${served === 1 ? "question" : "questions"}.`;
}

/** Derived "Your performance" metrics for a player's answer breakdown. */
export interface PerformanceMetrics {
  answered: number;
  correct: number;
  missed: number;
  bestStreak: number;
  avgTimeText: string;
  accuracyText: string;
}

/** Reduces a player's answer records into the "Your performance" tiles. */
export function performanceFromBreakdown(
  records: GameAnswerRecord[] | null | undefined,
): PerformanceMetrics {
  const list = records ?? [];
  const answered = list.length;
  const correct = list.filter((r) => r.isCorrect).length;
  const missed = answered - correct;

  let bestStreak = 0;
  let streak = 0;
  for (const r of list) {
    streak = r.isCorrect ? streak + 1 : 0;
    if (streak > bestStreak) bestStreak = streak;
  }

  const avgTimeText =
    answered > 0
      ? `${(list.reduce((sum, r) => sum + r.timeToAnswerMs, 0) / answered / 1000).toFixed(1)}s`
      : "—";

  const accuracyText = answered > 0 ? `${percent(correct, answered)}%` : "—";

  return { answered, correct, missed, bestStreak, avgTimeText, accuracyText };
}
