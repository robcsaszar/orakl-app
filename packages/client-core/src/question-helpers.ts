/**
 * Shared question rendering, validation, and styling helpers.
 * Framework-neutral — no DOM. The DOM-drawing match-line helpers
 * (`drawMatchLines`, `drawPendingLine`, `drawHoverLine`) stay in the web
 * app's `src/lib/question-helpers.ts`, which imports the pure pieces below
 * back from this package.
 */

import type { QuestionType } from "@orakl/protocol";
import type { AnswerStyleState, MatchStyleState } from "./answer-variants.ts";
import { isTrueAnswerText, splitMatchPair } from "./answer-variants.ts";

export type { AnswerStyleState, MatchStyleState };

// --- True/false button styling ---

export interface TrueFalseStyleState {
  correctAnswerId: string;
  selectedAnswerId: string | null;
  answered: boolean;
  answers: { id: string; text: string }[];
}

/** True/false button classes (player-facing). Used by joinQuiz + soloMode. */
export function getTrueFalseButtonClass(
  answerId: string,
  state: TrueFalseStyleState,
): string {
  const answer = state.answers.find((a) => a.id === answerId);
  const isTrue = answer ? isTrueAnswerText(answer.text) : false;
  const base = [
    "flex-1",
    "rounded-xl",
    "border-2",
    "py-8",
    "text-center",
    "text-2xl",
    "font-black",
    "uppercase",
    "tracking-wider",
    "transition-all",
    "duration-200",
    "relative",
    "focus-visible:outline-hidden",
    "focus-visible:ring-2",
    "focus-visible:ring-violet-500",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background",
  ];

  if (state.correctAnswerId) {
    if (answerId === state.correctAnswerId) {
      base.push(
        "border-green-400",
        "bg-green-950/80",
        "text-green-300",
        "shadow-[0_0_20px_rgba(74,222,128,0.15)]",
      );
    } else if (answerId === state.selectedAnswerId) {
      base.push("border-red-400", "bg-red-950/80", "text-red-300");
    } else {
      base.push("border-gray-700", "text-gray-600", "opacity-50");
    }
  } else if (answerId === state.selectedAnswerId) {
    base.push(
      "border-violet-400",
      "bg-violet-950/80",
      "text-violet-200",
      "shadow-[0_0_20px_rgba(129,140,248,0.15)]",
    );
  } else if (!state.answered) {
    if (isTrue) {
      base.push(
        "border-emerald-800/60",
        "bg-emerald-950/20",
        "text-emerald-400",
        "hover:border-emerald-600",
        "hover:bg-emerald-950/40",
        "hover:shadow-[0_0_24px_rgba(52,211,153,0.1)]",
        "active:scale-95",
      );
    } else {
      base.push(
        "border-rose-800/60",
        "bg-rose-950/20",
        "text-rose-400",
        "hover:border-rose-600",
        "hover:bg-rose-950/40",
        "hover:shadow-[0_0_24px_rgba(251,113,133,0.1)]",
        "active:scale-95",
      );
    }
  } else {
    base.push("border-gray-700", "text-gray-500");
  }

  return base.join(" ");
}

// --- Data helpers ---

/** Format correct answer for display. Image matching: pipe → arrow; else: lookup text. */
export function formatCorrectAnswer(
  answerId: string,
  questionType: QuestionType,
  answers: { id: string; text: string }[],
): string {
  if (questionType === "image_matching") {
    return answerId.replace("|", " \u2192 ");
  }
  return answers.find((a) => a.id === answerId)?.text ?? "";
}

/** Check if answer matches correct answer. */
export function isAnswerCorrect(
  answerId: string,
  correctAnswerId: string,
): boolean {
  return answerId === correctAnswerId;
}

// --- Match item selection ---

export interface MatchSelectionState {
  selectedLeftItem: string | null;
  selectedRightItem: string | null;
}

export interface MatchSelectionResult {
  selectedLeftItem: string | null;
  selectedRightItem: string | null;
  /** Non-null pipe-delimited pair when both sides selected (auto-submit). */
  answerId: string | null;
}

/** Toggle match item, return updated state + answerId if both selected. */
export function selectMatchItem(
  state: MatchSelectionState,
  column: "left" | "right",
  item: string,
): MatchSelectionResult {
  let left = state.selectedLeftItem;
  let right = state.selectedRightItem;

  if (column === "left") {
    left = left === item ? null : item;
  } else {
    right = right === item ? null : item;
  }

  return {
    selectedLeftItem: left,
    selectedRightItem: right,
    answerId: left && right ? `${left}|${right}` : null,
  };
}

// --- Player-facing styling ---

/** Answer button classes (player-facing). Used by joinQuiz + soloMode. */
export function getAnswerButtonClass(
  answerId: string,
  state: AnswerStyleState,
): string {
  const base =
    "group w-full flex gap-4 items-center rounded-xl border-2 px-3 py-2 text-left text-base transition relative focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if (state.correctAnswerId) {
    if (isAnswerCorrect(answerId, state.correctAnswerId)) {
      return `${base} border-green-500 bg-green-950 text-green-200`;
    }
    if (answerId === state.selectedAnswerId) {
      return `${base} border-red-500 bg-red-950 text-red-200`;
    }
    return `${base} border-gray-800`;
  }
  if (answerId === state.selectedAnswerId) {
    return `${base} border-violet-500 bg-violet-950`;
  }
  if (!state.answered) {
    return `${base} border-gray-700 hover:border-gray-500 hover:bg-gray-800`;
  }
  return `${base} border-gray-700`;
}

/** Match item classes (player-facing). Used by joinQuiz + soloMode. */
export function getMatchItemClass(
  column: "left" | "right",
  item: string,
  state: MatchStyleState,
): string {
  const base =
    "w-full rounded-xl border-2 px-4 py-3 text-sm font-medium transition text-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const selected =
    column === "left" ? state.selectedLeftItem : state.selectedRightItem;

  if (state.correctAnswerId) {
    const [correctLeft, correctRight] = splitMatchPair(state.correctAnswerId);
    // "" right half means no separator (see splitMatchPair's JSDoc) — never a match.
    const isCorrectItem =
      (column === "left" && item === correctLeft) ||
      (column === "right" && correctRight !== "" && item === correctRight);
    if (isCorrectItem) return `${base} border-green-500 bg-green-950`;
    if (item === selected) return `${base} border-red-500 bg-red-950`;
    return `${base} border-gray-800`;
  }
  if (item === selected) return `${base} border-violet-500 bg-violet-950`;
  if (!state.answered)
    return `${base} border-gray-700 hover:border-gray-500 hover:bg-gray-800`;
  return `${base} border-gray-700`;
}
