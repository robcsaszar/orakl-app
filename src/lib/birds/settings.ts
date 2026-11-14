import type { SkyPhase } from "@orakl/shared";
import type { EventKind } from "./event";
import { type ModifierId, ONE_CHANCE, TWO_CHANCE } from "./modifiers";
import { PALETTES, SCENARIOS, type Scenario } from "./phases";
import type { Palette } from "./render";
import { KIND_SEASONS } from "./season";

/** The widest each kind may ever be: bird count after tunes and twists, and distance in metres (a near murmuration swallows the camera, a lone goose is no skein). */
export const RANGES: Record<EventKind, KindLimits> = {
  skein: { count: [15, 80], depth: [16, 260] },
  murmuration: { count: [100, 2500], depth: [30, 120] },
  soar: { count: [2, 60], depth: [20, 160] },
  raptor: { count: [1, 6], depth: [30, 120] },
};

/** Each kind's bounds as the code has them. A hawk's own number is its story's: one, a pair, or a kettle. */
export const LIMITS: Record<EventKind, KindLimits> = {
  skein: { count: [15, 40], depth: [60, 120] },
  murmuration: { count: [200, 2500], depth: [35, 110] },
  soar: { count: [3, 9], depth: [20, 160] },
  raptor: { count: [1, 6], depth: [30, 120] },
};

/** The fewest and most birds a kind's flock may hold, and the nearest and farthest it may fly, metres. */
export interface KindLimits {
  count: [number, number];
  depth: [number, number];
}

/** Everything about the flocks that can be set from outside the code's own tables. */
export interface BirdSettings {
  /** Per phase: how often flocks come, which kinds, and how each kind behaves. */
  scenarios: Record<SkyPhase, Scenario>;
  /** Per phase: bird colour, the haze far birds fade into, and how lit they are. */
  palettes: Record<SkyPhase, Palette>;
  /** Per kind: the share of its flocks that carry a twist, 0 to 1. */
  twistShare: Record<EventKind, number>;
  /** The share of flocks that carry two twists, where the kind has two that fit together. */
  twoTwists: number;
  /** Multiplier on a twist's pick weight; 0 never picks it. A twist left out is 1. */
  twists: Partial<Record<ModifierId, number>>;
  /** Per kind: a multiplier on how often it is picked in each month, January first. */
  seasons: Record<EventKind, number[]>;
  /** Per kind, at every time of day: how many birds a flock holds and how far it flies. Inside `RANGES`. */
  limits: Record<EventKind, KindLimits>;
  /** Multiplier on every bird's size. */
  scale: number;
}

/** The flocks as the code's own tables have them. */
export function defaultBirdSettings(): BirdSettings {
  return {
    scenarios: structuredClone(SCENARIOS),
    palettes: structuredClone(PALETTES),
    twistShare: {
      skein: ONE_CHANCE,
      murmuration: ONE_CHANCE,
      soar: ONE_CHANCE,
      raptor: ONE_CHANCE,
    },
    twoTwists: TWO_CHANCE,
    twists: {},
    seasons: structuredClone(KIND_SEASONS),
    limits: structuredClone(LIMITS),
    scale: 1,
  };
}

/** Bird settings as saved: any part may be missing, and the waits and the one twist chance of an earlier shape may stand in for the rates. */
export type SavedBirdSettings = Partial<Omit<BirdSettings, "scenarios">> & {
  scenarios?: Partial<
    Record<SkyPhase, Partial<Scenario> & { interval?: [number, number] }>
  >;
  oneTwist?: number;
};

/**
 * Saved bird settings made whole: what is missing is as the code has it. A
 * time of day saved with a shortest and longest wait gets the flocks per hour
 * that wait comes to; one twist chance for all kinds becomes each kind's share.
 */
export function readBirdSettings(saved: SavedBirdSettings): BirdSettings {
  const base = defaultBirdSettings();
  const { scenarios, oneTwist, ...rest } = saved;
  const out: BirdSettings = { ...base, ...rest };
  for (const phase of Object.keys(base.scenarios) as SkyPhase[]) {
    const { interval, ...kept } = scenarios?.[phase] ?? {};
    const scenario = { ...base.scenarios[phase], ...kept };
    // A kind's size and distance are its own, not a time of day's: a save that held them per time of day lets them go.
    scenario.events = scenario.events.map(({ kind, weight }) => ({
      kind,
      weight,
    }));
    if (kept.perHour === undefined && interval) {
      const wait = (interval[0] + interval[1]) / 2;
      scenario.perHour = wait >= 1 ? Math.round(3600 / wait) : 0;
    }
    out.scenarios[phase] = scenario;
  }
  if (!saved.twistShare && typeof oneTwist === "number")
    for (const kind of Object.keys(out.twistShare) as EventKind[])
      out.twistShare[kind] = oneTwist;
  out.twistShare = { ...base.twistShare, ...out.twistShare };
  out.seasons = { ...base.seasons, ...out.seasons };
  out.limits = { ...base.limits, ...out.limits };
  return out;
}
