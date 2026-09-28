import { storage } from "./storage.js";

export interface DismissQuizState {
  showConfirm: boolean;
  hasQuiz: boolean;
  confirmTimeout: ReturnType<typeof setTimeout> | null;
}

export interface DismissQuizDeps {
  fetch?: typeof globalThis.fetch;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
}

export async function confirmDismiss(
  onDone: () => void,
  deps: DismissQuizDeps = {},
): Promise<void> {
  const _fetch = deps.fetch ?? globalThis.fetch;
  try {
    await _fetch("/api/lobby", { method: "DELETE" });
  } catch {}
  storage.removeQuizConfig();
  onDone();
}

export async function dismissQuiz(
  state: DismissQuizState,
  deps: DismissQuizDeps = {},
): Promise<void> {
  const _fetch = deps.fetch ?? globalThis.fetch;
  const _setTimeout = deps.setTimeout ?? globalThis.setTimeout;
  const _clearTimeout = deps.clearTimeout ?? globalThis.clearTimeout;

  if (!state.showConfirm) {
    state.showConfirm = true;
    if (state.confirmTimeout) _clearTimeout(state.confirmTimeout);
    state.confirmTimeout = _setTimeout(() => {
      state.showConfirm = false;
    }, 3000);
    return;
  }

  if (state.confirmTimeout) _clearTimeout(state.confirmTimeout);
  state.showConfirm = false;
  try {
    await _fetch("/api/lobby", { method: "DELETE" });
  } catch {}
  storage.removeQuizConfig();
  state.hasQuiz = false;
}
