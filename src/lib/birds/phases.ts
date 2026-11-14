import type { SkyPhase } from "@orakl/shared";
import type { EventSpec } from "./event";
import type { Palette } from "./render";

/** What a sky phase lets happen: how often, and what kinds. */
export interface Scenario {
  /** Flocks that start in an hour, on average; 0 for none. The gaps between them vary about the mean. */
  perHour: number;
  /** Share of days that have flocks at this time of day, 0 to 1; on the other days it has none. */
  days: number;
  /** Seconds before the first event after the phase begins, [min, max]. */
  first: [number, number];
  events: EventSpec[];
  tune: PhaseTune;
}

/** How each kind behaves in a phase, on top of its story. */
export interface PhaseTune {
  skein: {
    /** Screen rows the line may fly on, fractions from the top. */
    band: [number, number];
    /** Multiplier on cruise speed. */
    speed: number;
  };
  soar: {
    /** Tight ring radius range once the gulls have closed in, metres. */
    radius: [number, number];
    /** Seconds of gliding between flap bursts. */
    glide: [number, number];
  };
  raptor: {
    /** Screen rows the thermal sits on, fractions from the top. */
    height: [number, number];
  };
  murmuration: {
    /** Multiplier on the cloud's bird count. */
    size: number;
  };
}

const TUNE_DEFAULT: PhaseTune = {
  skein: { band: [0.08, 0.6], speed: 1 },
  soar: { radius: [8, 13], glide: [4, 12] },
  raptor: { height: [0.22, 0.36] },
  murmuration: { size: 1 },
};

/** Dawn: roosts empty — low lines just up, gulls commuting, no thermals yet. */
const TUNE_DAWN: PhaseTune = {
  skein: { band: [0.3, 0.7], speed: 0.95 },
  soar: { radius: [10, 16], glide: [6, 14] },
  raptor: { height: [0.3, 0.45] },
  murmuration: { size: 0.6 },
};
/** Morning: thermals build — raptors low, gulls feeding, lines still passing. */
const TUNE_MORNING: PhaseTune = {
  skein: { band: [0.15, 0.55], speed: 1 },
  soar: { radius: [7, 12], glide: [3, 9] },
  raptor: { height: [0.28, 0.42] },
  murmuration: { size: 0.8 },
};
/** Noon: strongest thermals — raptors highest and laziest, gulls loafing high. */
const TUNE_NOON: PhaseTune = {
  skein: { band: [0.08, 0.3], speed: 1 },
  soar: { radius: [14, 22], glide: [12, 26] },
  raptor: { height: [0.1, 0.2] },
  murmuration: { size: 0.7 },
};
/** Evening: everything heads home — big high fast lines, gulls commuting. */
const TUNE_EVENING: PhaseTune = {
  skein: { band: [0.08, 0.4], speed: 1.2 },
  soar: { radius: [8, 13], glide: [4, 12] },
  raptor: { height: [0.2, 0.32] },
  murmuration: { size: 1 },
};
/** Sunset: murmuration hour — the biggest clouds of the day. */
const TUNE_SUNSET: PhaseTune = {
  skein: { band: [0.1, 0.45], speed: 1.15 },
  soar: { radius: [9, 14], glide: [5, 12] },
  raptor: { height: [0.2, 0.3] },
  murmuration: { size: 1.3 },
};
/** Dusk: stragglers, and the cloud drains into the roost. */
const TUNE_DUSK: PhaseTune = {
  skein: { band: [0.25, 0.65], speed: 0.9 },
  soar: { radius: [9, 14], glide: [6, 14] },
  raptor: { height: [0.3, 0.4] },
  murmuration: { size: 0.9 },
};

/**
 * Per-phase behaviour. Dawn is a few early departures; morning the busiest
 * sky; noon sparse and high; evening the big lines heading to roost;
 * sunset the murmurations; dusk the last stragglers; night nothing.
 */
export const SCENARIOS: Record<SkyPhase, Scenario> = {
  night: {
    perHour: 0,
    days: 1,
    first: [0, 0],
    events: [],
    tune: TUNE_DEFAULT,
  },
  dawn: {
    perHour: 85,
    days: 1,
    first: [3, 10],
    events: [
      { kind: "skein", weight: 3 },
      { kind: "raptor", weight: 1 },
    ],
    tune: TUNE_DAWN,
  },
  morning: {
    perHour: 257,
    days: 1,
    first: [2, 6],
    events: [
      { kind: "skein", weight: 4 },
      { kind: "soar", weight: 3 },
      { kind: "murmuration", weight: 1 },
      { kind: "raptor", weight: 1 },
    ],
    tune: TUNE_MORNING,
  },
  noon: {
    perHour: 111,
    days: 1,
    first: [3, 8],
    events: [
      { kind: "raptor", weight: 3 },
      { kind: "soar", weight: 2 },
      { kind: "skein", weight: 1 },
    ],
    tune: TUNE_NOON,
  },
  evening: {
    perHour: 206,
    days: 1,
    first: [2, 6],
    events: [
      { kind: "skein", weight: 4 },
      { kind: "murmuration", weight: 2 },
      { kind: "soar", weight: 1 },
    ],
    tune: TUNE_EVENING,
  },
  sunset: {
    perHour: 12,
    days: 1,
    first: [3, 8],
    events: [
      { kind: "murmuration", weight: 3 },
      { kind: "skein", weight: 2 },
    ],
    tune: TUNE_SUNSET,
  },
  dusk: {
    perHour: 69,
    days: 1,
    first: [5, 15],
    events: [
      { kind: "skein", weight: 2 },
      { kind: "raptor", weight: 1 },
    ],
    tune: TUNE_DUSK,
  },
};

/** Silhouette, sky-fade colour and shading strength per phase, matched to `PHASE_STOPS`. */
export const PALETTES: Record<SkyPhase, Palette> = {
  night: { body: [11, 26, 42], fog: [7, 8, 15], lit: 0 },
  dawn: { body: [14, 10, 22], fog: [85, 67, 102], lit: 0.05 },
  morning: { body: [59, 58, 68], fog: [219, 230, 239], lit: 0.35 },
  noon: { body: [22, 48, 74], fog: [74, 164, 214], lit: 0.4 },
  evening: { body: [61, 51, 38], fog: [168, 181, 176], lit: 0.3 },
  sunset: { body: [42, 18, 8], fog: [211, 94, 34], lit: 0.08 },
  dusk: { body: [12, 11, 26], fog: [44, 62, 107], lit: 0.02 },
};
