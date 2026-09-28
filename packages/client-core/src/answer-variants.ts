/**
 * Pure pieces of answer styling that `question-helpers.ts` needs. The full
 * styling module (`src/lib/answer-variants.ts` in the web app) also builds
 * Tailwind class recipes with `tailwind-variants` — a web-only styling
 * dependency — so it stays in the web app and imports these back from here.
 */

export interface AnswerStyleState {
  correctAnswerId: string;
  selectedAnswerId: string | null;
  answered: boolean;
}

export interface MatchStyleState {
  correctAnswerId: string;
  selectedLeftItem: string | null;
  selectedRightItem: string | null;
  answered: boolean;
}

/** True if answer text is the true/false question's "true" option (case-insensitive). */
export function isTrueAnswerText(text: string): boolean {
  return text.toLowerCase() === "true";
}

/** Split a pipe-delimited match-pair answer id/text into its left and right halves.
 *  Only the first "|" matters; a missing separator yields "" for the right half.
 *  The curator's create/edit flow (`buildImageMatchingFields` in
 *  question-bank.ts) always joins left|right, but `QuestionSchema`
 *  (`@orakl/protocol`) stores `correctAnswer` as a plain string with no
 *  "contains |" check, and the bulk importer (import-questions.ts) accepts
 *  any string past that same schema — so a "" right half is reachable from
 *  malformed data, not just a coding error. Callers must treat "" as no match. */
export function splitMatchPair(text: string): [string, string] {
  const [left, right] = text.split("|");
  return [left ?? "", right ?? ""];
}
