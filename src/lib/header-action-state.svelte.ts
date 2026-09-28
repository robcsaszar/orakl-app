/**
 * Register one or more header action callbacks on a slot. Returns a cleanup
 * that only clears the callbacks it set — safe if a later occupant of the
 * same slot (e.g. a different route reusing `headerActionState`) has
 * already overwritten them by the time this effect tears down.
 */
export function registerHeaderActions<T extends Record<string, unknown>>(
  slot: { actions: T },
  actions: Partial<T>,
): () => void {
  Object.assign(slot.actions, actions);
  return () => {
    for (const key of Object.keys(actions) as (keyof T)[]) {
      if (slot.actions[key] === actions[key])
        slot.actions[key] = null as T[keyof T];
    }
  };
}

/** Every header action any route can wire up (`page-config.ts`'s
 *  `{ type: "action" }` entries reference these by key). */
export type HeaderActionKey =
  | "endLobby"
  | "leaveLobby"
  | "exitQuiz"
  | "endRound";

/**
 * Single bridge from "whichever nested layout owns the live session" up to
 * `AppHeader`, which renders from the outer `(game)`/`(app)` layout — outside
 * the subtree where that session's context lives (Svelte context flows down,
 * not across). `page-config.ts` entries gate on `phase` (`showWhenPhase`)
 * and resolve `action` against this same registry, so a route's header
 * behaviour is declared once, in `PAGE_CONFIG`, instead of each route
 * hand-picking a snippet.
 *
 * `phase` is a plain string so both the quiz journey state (`JourneyState`,
 * `quiz-routes.ts`) and solo's `SoloPhase` can share one slot — routes never
 * overlap, so there's no ambiguity in what a given string means.
 *
 * This is module-level state in a shared server process. Write to it ONLY
 * from `$effect` or client event handlers (never top-level `<script>`,
 * `load`, or `*.server.ts`) — a server-side write would leak one request's
 * header state into another's render.
 */
export const headerActionState = $state({
  phase: null as string | null,
  actions: {
    endLobby: null,
    leaveLobby: null,
    exitQuiz: null,
    endRound: null,
  } as Record<HeaderActionKey, (() => void) | null>,
});
