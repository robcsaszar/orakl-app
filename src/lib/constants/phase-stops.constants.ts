import type { SkyPhase } from "@orakl/shared";

/**
 * Sky gradient per phase, top to bottom. `offsets` are each stop's position in
 * percent, ascending; `colors` pair with them by index. Every phase keeps six
 * stops, so a phase change fades stop i into stop i.
 */
export const PHASE_STOPS: Record<
  SkyPhase,
  { readonly offsets: readonly number[]; readonly colors: readonly string[] }
> = {
  night: {
    offsets: [0, 22, 50, 79, 88, 100],
    colors: ["#07080f", "#07080f", "#07080f", "#07080f", "#07080f", "#07080f"],
  },
  dawn: {
    offsets: [0, 4, 33, 79, 92, 100],
    colors: ["#26415e", "#2e3f60", "#637697", "#aa7164", "#c28770", "#dcc1ac"],
  },
  morning: {
    offsets: [0, 22, 50, 79, 92, 100],
    colors: ["#c9d6e3", "#d1dde8", "#dbe6ef", "#ebd5c5", "#f0ceb5", "#e6c798"],
  },
  noon: {
    offsets: [0, 22, 50, 79, 88, 100],
    colors: ["#1a80c4", "#2f90cc", "#4aa4d6", "#6dbce2", "#78c4e6", "#87ceeb"],
  },
  evening: {
    offsets: [0, 34, 50, 79, 92, 100],
    colors: ["#73c1e7", "#67abd5", "#6ab0d2", "#beb896", "#d7bc83", "#ee9268"],
  },
  sunset: {
    offsets: [0, 23, 67, 79, 92, 100],
    colors: ["#c74848", "#ca5d44", "#d87a4b", "#e5a443", "#f2bc7d", "#fadbd8"],
  },
  dusk: {
    offsets: [0, 38, 67, 84, 93, 100],
    colors: ["#12172b", "#1a2856", "#283e77", "#664e79", "#825b8b", "#ba5a5a"],
  },
};

/** Base bird colour per phase (hex). Individual birds get ±20 jitter per channel. */
export const BIRD_COLORS: Record<SkyPhase, string> = {
  night: "#0b1a2a",
  dawn: "#3a2a50",
  morning: "#7a3f3f",
  noon: "#1a3a5c",
  evening: "#695635",
  sunset: "#5c2a0e",
  dusk: "#c8b8d0",
};
