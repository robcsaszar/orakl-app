import { getContext, setContext } from "svelte";
import type { SoloModeStore } from "../soloMode.store.js";

const KEY = Symbol("solo-session");

export function setSoloSession(session: SoloModeStore): void {
  setContext(KEY, session);
}

export function getSoloSession(): SoloModeStore {
  const session = getContext<SoloModeStore | undefined>(KEY);
  if (!session) {
    throw new Error("getSoloSession() called outside the (app)/solo layout");
  }
  return session;
}
