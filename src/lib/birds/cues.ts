import { current } from "./current.svelte";
import type { SkyCue } from "./engine";

/**
 * The quiz nudging the sky: a reveal moves a murmuration if one is up, the
 * lobby's head count sets how many gulls gather if gulls are up. A no-op
 * without a mounted sky, so pages call it freely.
 */
export function skyCue(cue: SkyCue): void {
  current.runner?.cue(cue);
}
