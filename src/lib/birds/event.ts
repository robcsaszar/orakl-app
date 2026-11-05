import type { SkyPhase } from "@orakl/shared";
import type { Flock } from "./flock";
import type { ModifierId } from "./modifiers";
import type { PhaseTune } from "./phases";
import { halfWidthAt, type View, worldYAt, Z_NEAR } from "./view";

export type EventKind = "skein" | "murmuration" | "soar" | "raptor";

/**
 * One self-contained happening in the sky: a group of birds that enters,
 * does its thing and leaves. The engine steps it until `done`, or until
 * `maxLife` seconds as a safety net against a path that never exits.
 */
export interface SkyEvent {
  readonly kind: EventKind;
  /** The event's main group. */
  readonly flock: Flock;
  /** Every group the event draws (a hunt has prey as well). */
  readonly flocks: readonly Flock[];
  readonly maxLife: number;
  /** Modifiers applied to this event. */
  readonly mods: readonly ModifierId[];
  /** On-screen caption, e.g. "Skein · tailwind". */
  readonly label: string;
  done: boolean;
  update(dt: number): void;
  /** Asks the event to wind down and fly out of view on its own. */
  retire(): void;
}

/** What an event is built from. */
export interface EventOptions {
  count: number;
  depth: [number, number];
  phase: SkyPhase;
  tune: PhaseTune;
  mods: readonly ModifierId[];
  /** Direction along x for crossings; random when omitted. */
  dir?: number;
  /** Mill about this world point instead of crossing (a hunted flock). */
  station?: [number, number, number];
  /** The sky's wind, metres per second along x and z. */
  wind: [number, number];
}

/** Margin, metres, past the frustum edge inside which a bird still counts as in view. */
const VIEW_MARGIN = 3;

/** True while any bird of the event is inside the frustum (plus a small margin). */
export function anyVisible(e: SkyEvent, view: View): boolean {
  for (const f of e.flocks) {
    for (let i = 0; i < f.n; i++) {
      const z = f.pz[i];
      if (z < Z_NEAR) continue;
      const hw = halfWidthAt(view, z) + VIEW_MARGIN;
      if (Math.abs(f.px[i]) > hw) continue;
      const hh = worldYAt(view, z, 0) + VIEW_MARGIN;
      if (Math.abs(f.py[i]) > hh) continue;
      return true;
    }
  }
  return false;
}

/** One entry in a phase's event table. */
export interface EventSpec {
  kind: EventKind;
  /** Relative pick probability within the phase. */
  weight: number;
  /** Bird count range; raptors ignore it. */
  count?: [number, number];
  /** Depth range, metres from the viewer. */
  depth?: [number, number];
  /** Use `count` as given, without the small-viewport scaling. */
  exact?: boolean;
  /** Force these modifiers; rolled from the phase table when omitted. */
  mods?: ModifierId[];
}

/**
 * Flight "up". The camera looks level, so a bird crossing at eye height would
 * show only its profile; tilting the flight plane toward the viewer shows the
 * underside and spread wings, as if looking up at the sky.
 */
const TILT = (40 * Math.PI) / 180;
export const UP_X = 0;
export const UP_Y = Math.cos(TILT);
export const UP_Z = -Math.sin(TILT);

/**
 * Writes an orthonormal flight basis for velocity (vx, vy, vz) into `out`:
 * forward at 0..2, right at 3..5, up at 6..8. Falls back to +x when stationary.
 */
export function basis(
  vx: number,
  vy: number,
  vz: number,
  out: Float32Array,
): void {
  let len = Math.hypot(vx, vy, vz);
  let fx: number;
  let fy: number;
  let fz: number;
  if (len < 1e-6) {
    fx = 1;
    fy = 0;
    fz = 0;
  } else {
    fx = vx / len;
    fy = vy / len;
    fz = vz / len;
  }
  // right = forward × up
  let rx = fy * UP_Z - fz * UP_Y;
  let ry = fz * UP_X - fx * UP_Z;
  let rz = fx * UP_Y - fy * UP_X;
  len = Math.hypot(rx, ry, rz);
  if (len < 1e-6) {
    rx = 0;
    ry = 0;
    rz = 1;
  } else {
    rx /= len;
    ry /= len;
    rz /= len;
  }
  // up = right × forward
  out[0] = fx;
  out[1] = fy;
  out[2] = fz;
  out[3] = rx;
  out[4] = ry;
  out[5] = rz;
  out[6] = ry * fz - rz * fy;
  out[7] = rz * fx - rx * fz;
  out[8] = rx * fy - ry * fx;
}
