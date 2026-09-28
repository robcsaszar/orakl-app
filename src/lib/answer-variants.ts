import {
  type AnswerStyleState,
  isTrueAnswerText,
  type MatchStyleState,
  splitMatchPair,
} from "@orakl/client-core";
import { tv } from "tailwind-variants";

// ── Semantic state ───────────────────────────────────────────────────────────

export type AnswerState =
  | "idle"
  | "selected"
  | "correct"
  | "incorrect"
  | "dimmed"
  | "answered";

export type TrueFalseFlavor = "positive" | "negative" | "none";

// ── Difficulty badge ─────────────────────────────────────────────────────────

export type DifficultyVariant = "easy" | "medium" | "hard" | "all";

export const difficultyBadgeVariants = tv({
  base: "rounded px-1.5 py-0.5 text-[10px] font-bold font-sans uppercase tracking-wider",
  variants: {
    difficulty: {
      easy: "bg-green-900 text-green-300",
      medium: "bg-amber-900 text-amber-300",
      hard: "bg-red-900 text-red-300",
      all: "bg-gray-800 text-gray-400",
    },
  },
  defaultVariants: { difficulty: "all" },
});

export function resolveDifficulty(d?: string): DifficultyVariant {
  if (d === "easy" || d === "medium" || d === "hard") return d;
  return "all";
}

// ── State resolvers ──────────────────────────────────────────────────────────

export function resolveAnswerState(
  answerId: string,
  { correctAnswerId, selectedAnswerId, answered }: AnswerStyleState,
): AnswerState {
  if (correctAnswerId) {
    if (answerId === correctAnswerId) return "correct";
    if (answerId === selectedAnswerId) return "incorrect";
    return "dimmed";
  }
  if (answerId === selectedAnswerId) return "selected";
  return answered ? "answered" : "idle";
}

/** True if answer text is the true/false question's "false" option (case-insensitive). */
export function isFalseAnswerText(text: string): boolean {
  return text.toLowerCase() === "false";
}

export type AnswerInput = "keyboard" | "pointer";

/**
 * Input kind behind an answer activation. A key handler, or a click with no
 * pointer behind it (`detail === 0`: Enter or Space on a focused button,
 * assistive tech), is a keyboard answer.
 */
export function answerInputOf(e: Event): AnswerInput {
  return e.type === "keydown" || (e as MouseEvent).detail === 0
    ? "keyboard"
    : "pointer";
}

export function resolveTrueFalseState(
  answerId: string,
  state: AnswerStyleState,
  answers: { id: string; text: string }[],
): { state: AnswerState; flavor: TrueFalseFlavor } {
  const answer = answers.find((a) => a.id === answerId);
  const flavor: TrueFalseFlavor = answer
    ? isTrueAnswerText(answer.text)
      ? "positive"
      : isFalseAnswerText(answer.text)
        ? "negative"
        : "none"
    : "none";
  return { state: resolveAnswerState(answerId, state), flavor };
}

export function resolveMatchItemState(
  column: "left" | "right",
  item: string,
  {
    correctAnswerId,
    selectedLeftItem,
    selectedRightItem,
    answered,
  }: MatchStyleState,
): AnswerState {
  const selected = column === "left" ? selectedLeftItem : selectedRightItem;
  if (correctAnswerId) {
    const [correctLeft, correctRight] = splitMatchPair(correctAnswerId);
    const isCorrect =
      (column === "left" && item === correctLeft) ||
      (column === "right" && correctRight !== "" && item === correctRight);
    if (isCorrect) return "correct";
    if (item === selected) return "incorrect";
    return "dimmed";
  }
  if (item === selected) return "selected";
  return answered ? "answered" : "idle";
}

// ── Answer tile recipe ───────────────────────────────────────────────────────

export const answerButtonVariants = tv({
  base: [
    "group relative flex select-none items-center justify-center gap-4 rounded-2xl corner-shape-squircle border-2 text-foreground",
    "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ],
  variants: {
    // AnswerState from lib/answer-variants.ts — resolved there, never chosen by hand.
    state: {
      idle: "border-foreground-darker/10 hover:border-foreground-darker hover:bg-foreground-darker/5 active:scale-95",
      selected: "border-secondary bg-secondary-700/20",
      correct: "border-success bg-success text-success-dark font-bold",
      incorrect: "border-danger bg-danger text-danger-dark font-bold",
      dimmed: "border-foreground-darker/20 opacity-50",
      answered: "border-foreground-darker/20 opacity-50",
    },
    questionType: {
      multiple_choice: "w-full px-6 py-3 md:text-lg",
      true_false: "flex-1 py-8 text-center text-3xl font-bold capitalize",
      match: "px-1 py-2 md:px-6 md:py-3 md:text-lg",
    },
    // True/false tiles carry their own hue before the reveal.
    flavor: { positive: "", negative: "", none: "" },
  },
  compoundVariants: [
    {
      state: "idle",
      flavor: "positive",
      class:
        "border-success/40 bg-success/10 text-success-light hover:border-success hover:bg-success/20",
    },
    {
      state: "selected",
      flavor: "positive",
      class: "border-success bg-success/25 text-success-light",
    },
    {
      state: "idle",
      flavor: "negative",
      class:
        "border-danger/40 bg-danger/10 text-danger-light hover:border-danger hover:bg-danger/20",
    },
    {
      state: "selected",
      flavor: "negative",
      class: "border-danger bg-danger/25 text-danger-light",
    },
    {
      state: "dimmed",
      questionType: "true_false",
      class: "text-foreground-darker",
    },
    {
      state: "answered",
      questionType: "true_false",
      class: "text-foreground-darker opacity-100",
    },
  ],
  defaultVariants: {
    state: "idle",
    questionType: "multiple_choice",
    flavor: "none",
  },
});
