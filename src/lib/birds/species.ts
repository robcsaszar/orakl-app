/**
 * Bird models. Each species has a body and two wings. The body is drawn as
 * a lofted ring mesh up close (`body` stations) and as a "cross-card" (a
 * horizontal plan plus a vertical profile) at mid distance; each wing is one
 * outline that bends at the shoulder and the wrist.
 *
 * Local frame: +x forward (beak), +y up, +z right wing. Body coordinates are
 * fractions of body `length`; wing z is a fraction of half-span, wing x a
 * fraction of body length. `model.ts` poses and scales them.
 */
export type SpeciesId = "goose" | "starling" | "gull" | "raptor" | "crow";

/** One cross-section of the body: position along x, half-width, half-height, centre height. */
export type Station = [x: number, w: number, h: number, y: number];

export interface Species {
  id: SpeciesId;
  /** Body length, metres. */
  length: number;
  /** Wingspan, metres. */
  span: number;
  /** Cruise speed, metres per second. */
  speed: number;
  /** Wingbeat frequency, Hz. */
  flapHz: number;
  /** Flap amplitude [inner arm, outer hand], radians. */
  flapAmp: [number, number];
  /** Gliding pose [arm, hand], radians (gull arch, raptor dihedral). */
  glidePose: [number, number];
  /** How far the hand sweeps back on the upstroke, in body lengths. */
  fold: number;
  /** Hand twist about the span on the mid-stroke, radians. */
  twist: number;
  /** Holds the wings still through banked turns (large birds). */
  glideInTurns: boolean;
  /** Projected wingspan, px, from which the bird is a full model; below it a sprite. */
  modelFrom: number;
  /** Body cross-sections, beak first, tail last; lofted into the close-range mesh. */
  body: Station[];
  /** Right half of the body outline seen from above, beak first, tail last: [x, z, …]. */
  plan: number[];
  /** Body outline seen from the side, closed polygon: [x, y, …]. */
  profile: number[];
  /** Body points at or behind this x are tail feathers and fan out in a turn. */
  tailStart: number;
  /** How wide the tail fans at full bank, as a multiple of its width. */
  tailFan: number;
  /** Right wing outline, closed: leading edge shoulder→tip, then trailing edge tip→armpit: [x, z, …]. */
  wing: number[];
  /** Span fraction of the wrist; the hand (beyond it) bends and folds. */
  wrist: number;
}

export const SPECIES: Record<SpeciesId, Species> = {
  // Long neck held straight out, straight broad wings with a tapered hand.
  goose: {
    id: "goose",
    length: 0.95,
    span: 1.65,
    speed: 5.2,
    flapHz: 2.3,
    flapAmp: [0.55, 0.7],
    glidePose: [0.12, 0.0],
    fold: 0.1,
    twist: 0.18,
    glideInTurns: true,
    modelFrom: 16,
    body: [
      [0.52, 0.008, 0.01, 0.02],
      [0.44, 0.03, 0.035, 0.025],
      [0.33, 0.022, 0.025, 0.02],
      [0.2, 0.035, 0.04, 0.005],
      [0.08, 0.065, 0.07, -0.01],
      [-0.12, 0.07, 0.07, -0.01],
      [-0.3, 0.05, 0.045, 0.0],
      [-0.42, 0.045, 0.012, 0.01],
      [-0.52, 0.025, 0.004, 0.01],
    ],
    plan: [
      0.52, 0, 0.46, 0.028, 0.4, 0.03, 0.33, 0.02, 0.2, 0.03, 0.12, 0.06, -0.05,
      0.07, -0.28, 0.05, -0.4, 0.04, -0.5, 0.02,
    ],
    profile: [
      0.52, 0.02, 0.44, 0.06, 0.36, 0.05, 0.22, 0.04, 0.05, 0.06, -0.3, 0.045,
      -0.5, 0.01, -0.35, -0.02, -0.05, -0.07, 0.15, -0.06, 0.3, -0.01, 0.44,
      -0.015,
    ],
    tailStart: -0.38,
    tailFan: 0.4,
    wing: [
      0.14, 0.06, 0.16, 0.3, 0.14, 0.5, 0.08, 0.75, -0.02, 0.95, -0.08, 1.0,
      -0.14, 0.95, -0.2, 0.8, -0.24, 0.55, -0.24, 0.3, -0.18, 0.07,
    ],
    wrist: 0.5,
  },
  // Short, pointed triangular wings and a short square tail.
  starling: {
    id: "starling",
    length: 0.21,
    span: 0.38,
    speed: 7,
    flapHz: 6,
    flapAmp: [0.7, 0.8],
    glidePose: [0.05, 0.0],
    fold: 0.25,
    twist: 0.2,
    glideInTurns: false,
    modelFrom: 22,
    body: [
      [0.5, 0.008, 0.008, 0.01],
      [0.42, 0.05, 0.06, 0.02],
      [0.25, 0.085, 0.1, 0.0],
      [0.0, 0.1, 0.11, 0.0],
      [-0.25, 0.08, 0.08, 0.0],
      [-0.42, 0.055, 0.03, 0.005],
      [-0.5, 0.05, 0.006, 0.005],
    ],
    plan: [
      0.5, 0, 0.42, 0.05, 0.3, 0.08, 0.1, 0.1, -0.15, 0.09, -0.38, 0.06, -0.5,
      0.05,
    ],
    profile: [
      0.5, 0.015, 0.4, 0.07, 0.2, 0.1, -0.1, 0.09, -0.5, 0.03, -0.5, -0.01,
      -0.15, -0.06, 0.15, -0.1, 0.35, -0.06, 0.42, -0.02,
    ],
    tailStart: -0.36,
    tailFan: 0.35,
    wing: [
      0.22, 0.1, 0.2, 0.4, 0.05, 0.75, -0.15, 1.0, -0.25, 0.9, -0.3, 0.6, -0.28,
      0.4, -0.3, 0.1,
    ],
    wrist: 0.4,
  },
  // Long slender wings angled forward to the wrist and swept back to the tip.
  crow: {
    id: "crow",
    length: 0.47,
    span: 0.95,
    speed: 7.5,
    flapHz: 3.6,
    flapAmp: [0.7, 0.8],
    glidePose: [0.05, 0.0],
    fold: 0.25,
    twist: 0.2,
    glideInTurns: true,
    modelFrom: 16,
    body: [
      [0.5, 0.008, 0.008, 0.01],
      [0.42, 0.05, 0.06, 0.02],
      [0.25, 0.085, 0.1, 0.0],
      [0.0, 0.1, 0.11, 0.0],
      [-0.25, 0.08, 0.08, 0.0],
      [-0.42, 0.055, 0.03, 0.005],
      [-0.5, 0.05, 0.006, 0.005],
    ],
    plan: [
      0.5, 0, 0.42, 0.05, 0.3, 0.08, 0.1, 0.1, -0.15, 0.09, -0.38, 0.06, -0.5,
      0.05,
    ],
    profile: [
      0.5, 0.015, 0.4, 0.07, 0.2, 0.1, -0.1, 0.09, -0.5, 0.03, -0.5, -0.01,
      -0.15, -0.06, 0.15, -0.1, 0.35, -0.06, 0.42, -0.02,
    ],
    tailStart: -0.36,
    tailFan: 0.35,
    wing: [
      0.22, 0.1, 0.2, 0.4, 0.05, 0.75, -0.15, 1.0, -0.25, 0.9, -0.3, 0.6, -0.28,
      0.4, -0.3, 0.1,
    ],
    wrist: 0.4,
  },
  // Long slender wings angled forward to the wrist and swept back to the tip.
  gull: {
    id: "gull",
    length: 0.58,
    span: 1.4,
    speed: 4.6,
    flapHz: 2.6,
    flapAmp: [0.45, 0.7],
    glidePose: [0.28, -0.38],
    fold: 0.12,
    twist: 0.2,
    glideInTurns: true,
    modelFrom: 16,
    body: [
      [0.52, 0.01, 0.01, 0.01],
      [0.43, 0.035, 0.045, 0.015],
      [0.3, 0.04, 0.045, 0.005],
      [0.12, 0.062, 0.07, -0.005],
      [-0.1, 0.065, 0.065, 0.0],
      [-0.3, 0.045, 0.04, 0.0],
      [-0.42, 0.035, 0.012, 0.005],
      [-0.5, 0.03, 0.004, 0.005],
    ],
    plan: [
      0.52, 0, 0.44, 0.035, 0.3, 0.04, 0.15, 0.06, -0.05, 0.065, -0.3, 0.045,
      -0.5, 0.03,
    ],
    profile: [
      0.52, 0.01, 0.42, 0.055, 0.2, 0.07, -0.15, 0.05, -0.5, 0.015, -0.3, -0.02,
      0.0, -0.065, 0.25, -0.045, 0.42, -0.015,
    ],
    tailStart: -0.32,
    tailFan: 0.6,
    wing: [
      0.14, 0.06, 0.2, 0.25, 0.22, 0.42, 0.05, 0.7, -0.2, 1.0, -0.28, 0.95,
      -0.3, 0.75, -0.12, 0.45, -0.14, 0.25, -0.14, 0.07,
    ],
    wrist: 0.42,
  },
  // Broad plank wings with slotted primary "fingers" and a wide fanned tail.
  raptor: {
    id: "raptor",
    length: 0.56,
    span: 1.3,
    speed: 4.2,
    flapHz: 1.6,
    flapAmp: [0.4, 0.55],
    glidePose: [0.16, 0.12],
    fold: 0.08,
    twist: 0.12,
    glideInTurns: true,
    modelFrom: 16,
    body: [
      [0.5, 0.012, 0.012, 0.01],
      [0.42, 0.045, 0.06, 0.015],
      [0.28, 0.07, 0.08, 0.0],
      [0.05, 0.095, 0.1, -0.005],
      [-0.2, 0.09, 0.08, 0.0],
      [-0.38, 0.08, 0.04, 0.005],
      [-0.5, 0.13, 0.012, 0.01],
      [-0.56, 0.13, 0.004, 0.01],
    ],
    plan: [
      0.5, 0, 0.42, 0.045, 0.28, 0.07, 0.1, 0.095, -0.15, 0.1, -0.35, 0.09,
      -0.4, 0.1, -0.55, 0.14, -0.56, 0.0,
    ],
    profile: [
      0.5, 0.015, 0.4, 0.07, 0.15, 0.085, -0.2, 0.06, -0.56, 0.015, -0.35,
      -0.03, 0.0, -0.085, 0.25, -0.06, 0.4, -0.025,
    ],
    tailStart: -0.39,
    tailFan: 1.0,
    wing: [
      0.2, 0.09, 0.22, 0.3, 0.2, 0.5, 0.15, 0.75, 0.08, 0.95, 0.02, 0.87, -0.02,
      1.0, -0.09, 0.9, -0.13, 0.99, -0.2, 0.9, -0.26, 0.95, -0.32, 0.8, -0.34,
      0.55, -0.3, 0.3, -0.3, 0.1,
    ],
    wrist: 0.5,
  },
};
