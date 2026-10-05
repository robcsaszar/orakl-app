import type { QuestionRating } from "@orakl/protocol";

/** Per-reveal rating state for one question: what is in flight, what waits, and the last ack. */
export interface RatingState {
  /** Bank question id the state belongs to; acks for any other id are ignored. */
  questionId: string | null;
  /** Rating sent and not yet acked. */
  pending: QuestionRating | null;
  /** Newest tap made while one was in flight; sent when the ack arrives. */
  queued: QuestionRating | null;
  /** Last ack; `seq` bumps on every ack so a repeat of the same outcome is a new event. */
  result: { rating: QuestionRating; ok: boolean; seq: number } | null;
}

/** How long a failed rating shows ✗ before the thumb returns (ms). */
export const RATING_ERROR_MS = 2000;

/** Fresh state for a newly shown question. */
export function ratingFor(questionId: string): RatingState {
  return { questionId, pending: null, queued: null, result: null };
}

/**
 * Applies a thumb tap. Idle → send it and go pending; in flight → queue the
 * newest tap, send nothing; the thumb already showing ✓ → no-op.
 */
export function tapRating(
  state: RatingState,
  rating: QuestionRating,
): { state: RatingState; send: QuestionRating | null } {
  if (state.pending) {
    return { state: { ...state, queued: rating }, send: null };
  }
  if (state.result?.ok && state.result.rating === rating) {
    return { state, send: null };
  }
  return { state: { ...state, pending: rating }, send: rating };
}

/** Drops the in-flight and queued ratings without recording a result. */
export function clearRating(state: RatingState): RatingState {
  return { ...state, pending: null, queued: null };
}

/**
 * Applies a server ack. Ignored for another question or with nothing in
 * flight. Records the result; a queued tap becomes the next send unless this
 * ack was ok for that same rating.
 */
export function ackRating(
  state: RatingState,
  questionId: string,
  ok: boolean,
): { state: RatingState; send: QuestionRating | null } {
  if (questionId !== state.questionId || !state.pending) {
    return { state, send: null };
  }
  const result = {
    rating: state.pending,
    ok,
    seq: (state.result?.seq ?? 0) + 1,
  };
  const queued = state.queued;
  if (queued && !(ok && queued === result.rating)) {
    return {
      state: { ...state, pending: queued, queued: null, result },
      send: queued,
    };
  }
  return {
    state: { ...state, pending: null, queued: null, result },
    send: null,
  };
}
