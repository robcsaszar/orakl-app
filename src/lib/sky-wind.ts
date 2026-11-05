import type { SkyPhase } from "@orakl/shared";
import { SKY_PHASES } from "@orakl/shared";
import { mulberry32 } from "@/lib/birds/rng";
import { mix } from "@/lib/birds/seed";

/** The day's wind for a phase: metres per second along x (across the view) and z (depth). */
export interface SkyWind {
  x: number;
  z: number;
}

/** Phases with calmer air. */
const CALM: Partial<Record<SkyPhase, number>> = {
  dawn: 0.5,
  dusk: 0.6,
  night: 0.5,
};

/**
 * One wind for the whole sky in a phase, the same for everyone on the day:
 * clouds drift on it, skeins crab in it, gulls hang in it.
 */
export function windFor(seed: number, phase: SkyPhase): SkyWind {
  const rng = mulberry32(mix(seed, SKY_PHASES.indexOf(phase) + 1, 0x51ed));
  const speed = rng.range(0.2, 3) * (CALM[phase] ?? 1);
  const a = rng.range(-0.5, 0.5);
  const dir = rng.sign();
  return { x: dir * speed * Math.cos(a), z: speed * Math.sin(a) };
}
