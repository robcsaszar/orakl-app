/**
 * Pinhole camera at the origin looking down +z, y up, x right. World units are
 * metres; `f` is the focal length in CSS pixels, so a bird of span `s` metres at
 * depth `z` covers `s * f / z` pixels.
 */
export interface View {
  w: number;
  h: number;
  f: number;
}

/** Nearest depth that still renders; closer birds are culled. */
export const Z_NEAR = 3;

/** Focal length scales with width so narrow screens get a wider field of view. */
export function focalFor(width: number): number {
  return Math.min(960, Math.max(480, width * 0.7));
}

export function makeView(w: number, h: number): View {
  return { w, h, f: focalFor(w) };
}

/** Half the visible width, in metres, at depth z. */
export function halfWidthAt(v: View, z: number): number {
  return (z * v.w) / (2 * v.f);
}

/** World y at depth z for a screen row given as a fraction (0 = top, 1 = bottom). */
export function worldYAt(v: View, z: number, frac: number): number {
  return (z * (0.5 - frac) * v.h) / v.f;
}

/** Projects a world point onto the screen, writing CSS-pixel coordinates to `out`. */
export function project(
  v: View,
  x: number,
  y: number,
  z: number,
  out: Float32Array | number[],
  at = 0,
): void {
  const s = v.f / z;
  out[at] = v.w / 2 + x * s;
  out[at + 1] = v.h / 2 - y * s;
}
