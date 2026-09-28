import { getStorageItem, setStorageItem } from "@/lib/storage.js";
import type { PlayerSessionView } from "@/lib/svelte/player-session-view.js";

/**
 * Bridge from the quiz layout (which owns the live `QuizSession`) up to the
 * `(game)` layout, which renders the desktop toolbox rail as a sibling of
 * `main` — outside the subtree where the session's context lives. The quiz
 * layout sets `session` while its toolbox is shown (curator, not on
 * `/quiz/lobby`) and clears it otherwise; the `(game)` layout renders the
 * rail only while `session` is set. `collapsed` is the rail's slim-edge
 * state, kept for the browser session so it survives route changes.
 */
function readCollapsed(): boolean {
  try {
    return getStorageItem("orakl-toolbox-rail") === "collapsed";
  } catch {
    return false;
  }
}

export const toolboxRail = $state<{
  session: PlayerSessionView | null;
  collapsed: boolean;
}>({
  session: null,
  collapsed: readCollapsed(),
});

/** Register `session` for the rail. Returns a cleanup that clears the slot
 *  only if it still holds this session. */
export function registerToolboxRail(session: PlayerSessionView): () => void {
  toolboxRail.session = session;
  return () => {
    if (toolboxRail.session === session) toolboxRail.session = null;
  };
}

/** Count of players awaiting approval, 0 for no session. */
export function pendingCount(session: PlayerSessionView | null): number {
  if (!session) return 0;
  return session.players.filter((p) => p.status === "pending").length;
}

/** Flip the rail between expanded and the slim edge; persists per session. */
export function toggleToolboxRail(): void {
  toolboxRail.collapsed = !toolboxRail.collapsed;
  setStorageItem(
    "orakl-toolbox-rail",
    toolboxRail.collapsed ? "collapsed" : "expanded",
  );
}
