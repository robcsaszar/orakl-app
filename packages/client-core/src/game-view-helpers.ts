/**
 * Shared helpers for game view components (curatorPlay, displayReceiver).
 * Extracts duplicated SSE-to-state mapping and computed display logic.
 */
import type { QuestionType } from "@orakl/protocol";

export type TimerState =
  | "correct"
  | "incorrect"
  | "low"
  | "timeout"
  | "counting"
  /** The last between-question countdown: the ring drains, the centre shows the wreath. */
  | "final";

export interface QuestionDisplayContext {
  questionType: QuestionType;
  answers: { id: string; text: string }[];
  matchItems: { left: string[]; right: string[] } | null;
  currentQuestionIndex: number;
  totalQuestions: number;
}

/** Apply question fields shared between curatorPlay and displayReceiver. */
export function applyQuestionDisplay(
  ctx: QuestionDisplayContext,
  msg: {
    questionType?: QuestionType;
    answers: { id: string; text: string }[];
    matchItems?: { left: string[]; right: string[] };
    questionIndex: number;
    totalQuestions: number;
  },
) {
  ctx.questionType = msg.questionType ?? "text_choice";
  ctx.answers = msg.answers;
  ctx.matchItems = msg.matchItems ?? null;
  ctx.currentQuestionIndex = msg.questionIndex;
  ctx.totalQuestions = msg.totalQuestions;
}

/** Sort players descending by score. */
export function sortPlayersByScore<T extends { score: number }>(
  players: T[],
): T[] {
  return [...players].sort((a, b) => b.score - a.score);
}

/** Server-lag-compensated time remaining: subtracts whole seconds elapsed
 *  since serverTs, clamps at 0. Single source for all three actors' timers. */
export function compensateForLag(
  timeRemaining: number,
  serverTs: number,
  now: number = Date.now(),
): number {
  const lagSeconds = Math.floor((now - serverTs) / 1000);
  return Math.max(
    0,
    timeRemaining - (Number.isNaN(lagSeconds) ? 0 : lagSeconds),
  );
}

/** Timer ring SVG offset from timerState, fraction, and radius. */
export function computeTimerRingOffset(
  timerState: TimerState,
  timerFraction: number,
  radius: number,
): number {
  const circumference = 2 * Math.PI * radius;
  if (timerState === "timeout") return circumference;
  return circumference * (1 - timerFraction);
}
