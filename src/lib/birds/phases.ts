import type { SkyPhase } from "@orakl/shared";
import type { EventSpec } from "./event";
import type { Palette } from "./render";

/** What a sky phase lets happen: how often, how many at once, and what kinds. */
export interface Scenario {
  /** Seconds between one event starting and the next, [min, max]. */
  interval: [number, number];
  /** Seconds before the first event after the phase begins, [min, max]. */
  first: [number, number];
  /** Events allowed in the sky at the same time. */
  maxConcurrent: number;
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
    interval: [0, 0],
    first: [0, 0],
    maxConcurrent: 0,
    events: [],
    tune: TUNE_DEFAULT,
  },
  dawn: {
    interval: [25, 60],
    first: [3, 10],
    maxConcurrent: 1,
    events: [
      { kind: "skein", weight: 3, count: [15, 25], depth: [60, 200] },
      { kind: "raptor", weight: 1, depth: [40, 90] },
    ],
    tune: TUNE_DAWN,
  },
  morning: {
    interval: [8, 20],
    first: [2, 6],
    maxConcurrent: 2,
    events: [
      { kind: "skein", weight: 4, count: [15, 35], depth: [18, 160] },
      { kind: "soar", weight: 3, count: [4, 9], depth: [20, 90] },
      { kind: "murmuration", weight: 1, count: [200, 400], depth: [45, 110] },
      { kind: "raptor", weight: 1, depth: [30, 80] },
    ],
    tune: TUNE_MORNING,
  },
  noon: {
    interval: [20, 45],
    first: [3, 8],
    maxConcurrent: 1,
    events: [
      { kind: "raptor", weight: 3, depth: [40, 120] },
      { kind: "soar", weight: 2, count: [3, 6], depth: [60, 160] },
      { kind: "skein", weight: 1, count: [15, 24], depth: [120, 260] },
    ],
    tune: TUNE_NOON,
  },
  evening: {
    interval: [10, 25],
    first: [2, 6],
    maxConcurrent: 2,
    events: [
      { kind: "skein", weight: 4, count: [18, 45], depth: [16, 140] },
      { kind: "murmuration", weight: 2, count: [400, 900], depth: [40, 100] },
      { kind: "soar", weight: 1, count: [4, 8], depth: [25, 90] },
    ],
    tune: TUNE_EVENING,
  },
  sunset: {
    interval: [15, 35],
    first: [3, 8],
    maxConcurrent: 1,
    events: [
      { kind: "murmuration", weight: 3, count: [600, 1400], depth: [35, 90] },
      { kind: "skein", weight: 2, count: [15, 40], depth: [25, 160] },
    ],
    tune: TUNE_SUNSET,
  },
  dusk: {
    interval: [35, 70],
    first: [5, 15],
    maxConcurrent: 1,
    events: [
      { kind: "skein", weight: 2, count: [15, 22], depth: [30, 120] },
      { kind: "raptor", weight: 1, depth: [30, 70] },
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
