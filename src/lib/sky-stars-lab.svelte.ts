import { createHistory } from "@/lib/sky-history.svelte";
import {
  STAR_SETTINGS,
  type StarEventKind,
  type StarSettings,
} from "@/lib/sky-stars";

/**
 * What the star controls (`?stars`) hold over the stars. The sky reads it
 * only while `active`, so a visitor without the panel gets the code's stars.
 */
export const starLab = $state<{
  /** True while the panel is mounted. */
  active: boolean;
  /** Holds the sky still: no turn, no drift, no new events. */
  paused: boolean;
  settings: StarSettings;
}>({
  active: false,
  paused: false,
  settings: structuredClone(STAR_SETTINGS),
});

/** The stars' settings: the controls' while they are open, else the code's. */
export const starSettings = (): StarSettings =>
  starLab.active ? starLab.settings : STAR_SETTINGS;

/** What the mounted sky lets the controls do to it. */
export const starStage: {
  /** Starts an event now. */
  send: (kind: StarEventKind) => void;
  /** Ends every event in progress. */
  clear: () => void;
} = { send: () => {}, clear: () => {} };

/** The one id the star settings' changes are kept under. */
export const STARS = 0;

/** Undo history of the star settings as a whole. */
export const starHistory = createHistory(
  "orakl-star-lab-history",
  () => JSON.stringify(starLab.settings),
  (_id, state) => {
    starLab.settings = JSON.parse(state);
  },
);

/** Reads a value out of star settings by its path of keys. */
export function starValue(settings: StarSettings, path: (string | number)[]) {
  let at: unknown = settings;
  for (const key of path) at = (at as Record<string | number, unknown>)?.[key];
  return at;
}

/** Sets a value in the lab's settings by its path of keys, and records it under `label`. */
export function setStarValue(
  path: (string | number)[],
  label: string,
  value: unknown,
) {
  const before = starHistory.snapshot(STARS);
  let at = starLab.settings as unknown as Record<string | number, unknown>;
  for (const key of path.slice(0, -1))
    at = at[key] as Record<string | number, unknown>;
  at[path[path.length - 1] as string | number] = value;
  starHistory.log(STARS, label, before);
}

/** Reads saved star settings in over the code's own; throws when the data is not star settings. */
export function loadStarSettings(data: Partial<StarSettings>) {
  if (typeof data.count !== "number") throw new Error("not saved stars");
  const base = structuredClone(STAR_SETTINGS);
  starLab.settings = {
    ...base,
    ...data,
    shooting: { ...base.shooting, ...data.shooting },
    shower: { ...base.shower, ...data.shower },
    satellite: { ...base.satellite, ...data.satellite },
    comet: { ...base.comet, ...data.comet },
    aurora: { ...base.aurora, ...data.aurora },
    constellations: { ...base.constellations, ...data.constellations },
  };
}
