import type { SkyPhase } from "@orakl/shared";

/** Stop offsets: 0%, 22%, 50%, 79%, 88%, 100% (dusk's natural positions).
 *  Other phases are interpolated to these same offsets. */
export const PHASE_STOPS: Record<SkyPhase, readonly string[]> = {
  night: ["#07080f", "#07080f", "#07080f", "#07080f", "#07080f", "#07080f"],
  dawn: ["#0d1b2a", "#1c2b4a", "#554366", "#ac6f62", "#cb8569", "#f4b393"],
  morning: ["#c9d6e3", "#d1dde8", "#dbe6ef", "#ebd5c5", "#f0ceb5", "#f7c59f"],
  noon: ["#1a80c4", "#2f90cc", "#4aa4d6", "#6dbce2", "#78c4e6", "#87ceeb"],
  evening: ["#4a7fa5", "#5d92b3", "#76abc5", "#beb896", "#d7bc83", "#f9c06a"],
  sunset: ["#6b2d2d", "#a1352c", "#d35e22", "#f4a632", "#f7bd79", "#fadbd8"],
  dusk: ["#1a2240", "#1f2a4d", "#2c3e6b", "#8e5a7e", "#936081", "#c9a0a0"],
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
