import { UP_Y, UP_Z } from "./event";

/**
 * Heading-based flight in the flight plane (the plane normal to flight up):
 * axis e1 = +x, axis e2 = (0, UP_Z, -UP_Y). A bird keeps an airspeed and a
 * heading; steering only changes the heading at a bounded turn rate, so the
 * motion is always continuous and the bank follows the real turn.
 */
export const E2_Y = UP_Z;
export const E2_Z = -UP_Y;

/** Plane coordinate along e2 for a world point. */
export function planeW(y: number, z: number): number {
  return y * E2_Y + z * E2_Z;
}

/** Wraps an angle difference into (-π, π]. */
export function wrapAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  else if (r <= -Math.PI) r += Math.PI * 2;
  return r;
}

/**
 * Heading that orbits a centre at radius R turning in direction `s` (±1):
 * tangent when on the ring, inward when outside it, outward when inside.
 */
export function orbitHeading(
  u: number,
  w: number,
  cu: number,
  cw: number,
  radius: number,
  s: number,
): number {
  const du = cu - u;
  const dw = cw - w;
  const dist = Math.hypot(du, dw) || 1e-6;
  const toCentre = Math.atan2(dw, du);
  // 90° off the centre line on the ring, less outside it, more inside.
  const off = (Math.PI / 2) * Math.min(1.4, radius / dist);
  return toCentre + s * off;
}

/** Heading straight at a point. */
export function seekHeading(
  u: number,
  w: number,
  tu: number,
  tw: number,
): number {
  return Math.atan2(tw - w, tu - u);
}

/**
 * Advances a heading toward a desired one with a smoothed, bounded turn rate.
 * Returns the new turn rate (rad/s); the caller keeps it between steps.
 */
export function steer(
  heading: number,
  desired: number,
  turn: number,
  maxTurn: number,
  dt: number,
): number {
  const want = Math.max(
    -maxTurn,
    Math.min(maxTurn, wrapAngle(desired - heading) * 1.5),
  );
  return turn + (want - turn) * Math.min(1, 2.5 * dt);
}
