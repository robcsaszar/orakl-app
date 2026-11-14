import { createHistory } from "@/lib/sky-history.svelte";
import { type BirdSettings, defaultBirdSettings } from "./settings";

/**
 * What the bird controls (`?birds`) hold over the flocks. The sky reads it
 * only while `active`, so a visitor without the panel gets the code's own
 * tables.
 */
export const birdLab = $state<{
  /** True while the panel is mounted. */
  active: boolean;
  settings: BirdSettings;
}>({
  active: false,
  settings: defaultBirdSettings(),
});

/** The one id the bird settings' changes are kept under. */
export const BIRDS = 0;

/** Undo history of the bird settings as a whole. */
export const birdHistory = createHistory(
  "orakl-bird-lab-history",
  () => JSON.stringify(birdLab.settings),
  (_id, state) => {
    birdLab.settings = JSON.parse(state);
  },
);

/** Reads a value out of the settings by its path of keys. */
export function birdValue(settings: BirdSettings, path: (string | number)[]) {
  let at: unknown = settings;
  for (const key of path) at = (at as Record<string | number, unknown>)?.[key];
  return at;
}

/** Sets a value in the lab's settings by its path of keys, and records it under `label`. */
export function setBirdValue(
  path: (string | number)[],
  label: string,
  value: unknown,
) {
  const before = birdHistory.snapshot(BIRDS);
  let at = birdLab.settings as unknown as Record<string | number, unknown>;
  for (const key of path.slice(0, -1))
    at = at[key] as Record<string | number, unknown>;
  at[path[path.length - 1] as string | number] = value;
  birdHistory.log(BIRDS, label, before);
}
