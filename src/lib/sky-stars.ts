import type { SkyPhase } from "@orakl/shared";
import { mulberry32, type Rng } from "@/lib/birds/rng";
import { mix } from "@/lib/birds/seed";

/** A star of a constellation: its place in the figure's own unit box, and its size from 0 (faint) to 1 (brightest). */
type FigureStar = [x: number, y: number, size: number];

/** A constellation as a figure: its stars, and the lines between them by index. */
export interface Constellation {
  name: string;
  stars: FigureStar[];
  lines: [number, number][];
}

/**
 * Well-known constellations, drawn by hand after their real patterns: each
 * star's place in a unit box (y down) and its relative brightness.
 */
export const CONSTELLATIONS: Record<string, Constellation> = {
  orion: {
    name: "Orion",
    stars: [
      [0.28, 0.12, 0.95], // Betelgeuse
      [0.72, 0.16, 0.7], // Bellatrix
      [0.42, 0.48, 0.65], // Alnitak
      [0.5, 0.45, 0.7], // Alnilam
      [0.58, 0.42, 0.6], // Mintaka
      [0.34, 0.88, 0.6], // Saiph
      [0.76, 0.84, 1], // Rigel
      [0.5, 0.02, 0.35], // Meissa
    ],
    lines: [
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
      [0, 7],
      [1, 7],
    ],
  },
  "ursa-major": {
    name: "Big Dipper",
    stars: [
      [0.02, 0.3, 0.7], // Alkaid
      [0.2, 0.2, 0.75], // Mizar
      [0.36, 0.26, 0.8], // Alioth
      [0.52, 0.36, 0.5], // Megrez
      [0.6, 0.6, 0.65], // Phecda
      [0.92, 0.62, 0.7], // Merak
      [0.98, 0.34, 0.8], // Dubhe
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  cassiopeia: {
    name: "Cassiopeia",
    stars: [
      [0.02, 0.3, 0.6],
      [0.26, 0.72, 0.7],
      [0.5, 0.36, 0.8],
      [0.74, 0.78, 0.65],
      [0.98, 0.26, 0.55],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  scorpius: {
    name: "Scorpius",
    stars: [
      [0.9, 0.04, 0.55],
      [0.96, 0.16, 0.6],
      [0.92, 0.3, 0.5],
      [0.7, 0.26, 1], // Antares
      [0.6, 0.42, 0.5],
      [0.52, 0.6, 0.55],
      [0.48, 0.78, 0.5],
      [0.36, 0.92, 0.55],
      [0.2, 0.94, 0.6],
      [0.08, 0.84, 0.65],
      [0.12, 0.7, 0.7], // Shaula
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
    ],
  },
  cygnus: {
    name: "Cygnus",
    stars: [
      [0.5, 0.04, 0.95], // Deneb
      [0.5, 0.36, 0.7], // Sadr
      [0.5, 0.96, 0.6], // Albireo
      [0.08, 0.5, 0.6],
      [0.94, 0.3, 0.6],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [3, 1],
      [1, 4],
    ],
  },
  leo: {
    name: "Leo",
    stars: [
      [0.84, 0.74, 1], // Regulus
      [0.8, 0.5, 0.55],
      [0.72, 0.32, 0.65], // Algieba
      [0.82, 0.16, 0.5],
      [0.96, 0.12, 0.5],
      [0.36, 0.36, 0.6],
      [0.3, 0.6, 0.55],
      [0.04, 0.5, 0.8], // Denebola
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 5],
      [5, 7],
      [7, 6],
      [6, 0],
    ],
  },
  lyra: {
    name: "Lyra",
    stars: [
      [0.3, 0.06, 1], // Vega
      [0.56, 0.24, 0.45],
      [0.4, 0.4, 0.45],
      [0.74, 0.76, 0.55],
      [0.58, 0.94, 0.6],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 2],
      [1, 3],
      [2, 4],
      [3, 4],
    ],
  },
  gemini: {
    name: "Gemini",
    stars: [
      [0.2, 0.06, 0.8], // Castor
      [0.42, 0.1, 0.9], // Pollux
      [0.3, 0.36, 0.5],
      [0.56, 0.4, 0.5],
      [0.44, 0.66, 0.5],
      [0.74, 0.7, 0.5],
      [0.6, 0.94, 0.7], // Alhena
      [0.9, 0.9, 0.5],
    ],
    lines: [
      [0, 2],
      [2, 4],
      [4, 6],
      [1, 3],
      [3, 5],
      [5, 7],
      [0, 1],
    ],
  },
  taurus: {
    name: "Taurus",
    stars: [
      [0.58, 0.56, 1], // Aldebaran
      [0.68, 0.5, 0.45],
      [0.72, 0.6, 0.45],
      [0.66, 0.66, 0.45],
      [0.82, 0.7, 0.5],
      [0.24, 0.08, 0.7], // Elnath
      [0.14, 0.4, 0.55],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [2, 4],
      [1, 5],
      [0, 6],
    ],
  },
  crux: {
    name: "Southern Cross",
    stars: [
      [0.5, 0.96, 1], // Acrux
      [0.5, 0.04, 0.75], // Gacrux
      [0.1, 0.42, 0.9], // Mimosa
      [0.9, 0.34, 0.6],
      [0.72, 0.64, 0.35],
    ],
    lines: [
      [0, 1],
      [2, 3],
    ],
  },
  "canis-major": {
    name: "Canis Major",
    stars: [
      [0.56, 0.08, 1], // Sirius
      [0.82, 0.22, 0.6],
      [0.5, 0.42, 0.45],
      [0.36, 0.7, 0.7], // Wezen
      [0.5, 0.88, 0.75], // Adhara
      [0.14, 0.94, 0.6],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [2, 3],
      [3, 4],
      [3, 5],
    ],
  },
  "ursa-minor": {
    name: "Little Dipper",
    stars: [
      [0.04, 0.06, 0.85], // Polaris
      [0.24, 0.2, 0.4],
      [0.44, 0.38, 0.4],
      [0.62, 0.56, 0.45],
      [0.9, 0.5, 0.7], // Kochab
      [0.96, 0.78, 0.55],
      [0.7, 0.84, 0.4],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
};

/** The events the star sky can send. */
export type StarEventKind =
  | "shooting"
  | "fireball"
  | "shower"
  | "satellite"
  | "train"
  | "comet"
  | "aurora";

/** Everything about the stars that can be set from outside the code. */
export interface StarSettings {
  /** How many stars. */
  count: number;
  /** Radius of the largest star, px. */
  size: number;
  /** Multiplier on every star's brightness. */
  brightness: number;
  /** How far the stars lean toward faint: 0 is an even mix, 1 is few bright among many faint. */
  faint: number;
  /** How much stars flicker, 0 to 1; more near the foot of the sky. */
  twinkle: number;
  /** Multiplier on the flicker's speed. */
  twinkleSpeed: number;
  /**
   * How much the stars shimmer, 0 to 1: each star's brightness jumps a little
   * at random from frame to frame, and it flashes a pale colour now and then.
   */
  shimmer: number;
  /** Star colours: 0 all white, 1 the blue-white to orange of real stars. */
  colour: number;
  /** Per time of day: a multiplier on how often every timed event comes (shooting stars, showers, satellites, aurora). A time left out is 1. */
  eventRates: Partial<Record<SkyPhase, number>>;
  /** Multiplier on how fast the sky turns; below 0 turns it the other way. */
  turn: number;
  /** The point the sky turns about, as fractions of the sky's width and height; it may sit outside. */
  pivot: [number, number];
  /** Multiplier on the slow sideways drift. */
  drift: number;
  shooting: {
    /** Seconds between shooting stars, [shortest, longest]. */
    every: [number, number];
    /** Multipliers on speed, tail length and brightness. */
    speed: number;
    tail: number;
    brightness: number;
    /** How far a path may lean from the common direction, radians. */
    spread: number;
    /** Share of shooting stars that are fireballs, 0 to 1. */
    fireball: number;
  };
  shower: {
    /** Showers an hour; 0 sends none. */
    perHour: number;
    /** Seconds one lasts. */
    length: number;
    /** Meteors a second at its height. */
    rate: number;
    /** The point they seem to come from, as fractions of the sky. */
    radiant: [number, number];
  };
  satellite: {
    /** Passes an hour; 0 sends none. */
    perHour: number;
    /** Multipliers on how fast one crosses and how bright it is. */
    speed: number;
    brightness: number;
    /** Share of passes that flare: a glint of sunlight off the craft, 0 to 1. */
    flare: number;
    /** Share of passes that are a train: a line of dots one after another, 0 to 1. */
    train: number;
  };
  comet: {
    /** Chance a night has comets, 0 to 1; on such a night one crosses the sky every little while. */
    chance: number;
    /** Multiplier on how fast one crosses the sky. */
    speed: number;
    /** Multipliers on the head's size and the tails' length. */
    size: number;
    tail: number;
  };
  aurora: {
    /** Displays an hour; 0 sends none. */
    perHour: number;
    /** Seconds one lasts. */
    length: number;
    /** How strongly it glows, 0 to 1. */
    strength: number;
  };
  constellations: {
    /** Keys of `CONSTELLATIONS` set among the stars. */
    shown: string[];
    /** Draws the lines between a figure's stars. */
    lines: boolean;
    /** Writes each figure's name by it. */
    names: boolean;
  };
}

/** The stars as the code has them. */
export const STAR_SETTINGS: StarSettings = {
  count: 600,
  size: 1.5,
  brightness: 1,
  faint: 0,
  twinkle: 0.4,
  twinkleSpeed: 3,
  shimmer: 0.2,
  colour: 1,
  eventRates: { dusk: 0.25 },
  turn: 1,
  pivot: [0.5, -0.3],
  drift: 1,
  shooting: {
    every: [10, 300],
    speed: 1.3,
    tail: 1.15,
    brightness: 1,
    spread: 0.4,
    fireball: 0.05,
  },
  shower: { perHour: 0.25, length: 120, rate: 1.5, radiant: [0.6, 0.15] },
  satellite: { perHour: 0, speed: 1, brightness: 1, flare: 1, train: 0.05 },
  comet: { chance: 0, speed: 1, size: 1, tail: 1 },
  aurora: { perHour: 0.25, length: 90, strength: 0.6 },
  constellations: {
    shown: [
      "orion",
      "cygnus",
      "leo",
      "ursa-major",
      "cassiopeia",
      "scorpius",
      "lyra",
      "gemini",
      "ursa-minor",
      "canis-major",
      "crux",
      "taurus",
    ],
    lines: false,
    names: false,
  },
};

/** Radians the sky turns per 60 Hz step at a turn of 1. */
const TURN_STEP = 0.00004;
/** Pixels the sky drifts per 60 Hz step at a drift of 1. */
const DRIFT_STEP: [number, number] = [-0.04, 0.02];
/** The smallest star radius, px. */
const SMALLEST = 0.2;
/** Real star tints, hot to cool; most stars sit in the middle. */
/** How much of a star's brightness follows its size; the rest is its own draw. */
const SIZE_LIGHT = 0.75;
/** How far a shimmering star's brightness may jump either way, as a share of its own, at full shimmer. */
const SHIMMER_JUMP = 0.45;
/** Pale colours a shimmering star flashes: reds to yellows and cyans to violets, no green or pink. */
const SHIMMER_HUES = Array.from({ length: 32 }, (_, i) => {
  const hue = (i / 32) * 160;
  return `hsl(${Math.round(hue > 60 ? hue + 110 : hue)},100%,85%)`;
});
/** Random values a shimmering star steps through, one a frame. */
const SHIMMER_TABLE = (() => {
  const rng = mulberry32(0x51a2);
  return Float32Array.from({ length: 1024 }, () => rng.next());
})();
const TINTS = [
  "#9bb0ff",
  "#cad7ff",
  "#ffffff",
  "#fff0d8",
  "#ffd2a1",
  "#ffb07a",
];
/** How wide a constellation is, as a share of the sky's shorter side. */
const FIGURE_SPAN = 0.2;
/** The aurora's own small canvas, px; stretched over the whole sky. */
const AURORA_W = 128;
const AURORA_H = 64;
/** Rays along the near curtain; the far one takes half. */
const AURORA_RAYS = 220;
/** How much light one ray adds; rays overlap, so it is small. */
const AURORA_RAY_ALPHA = 0.2;
/** The strength from which a pink fringe shows under the curtain's foot. */
const PINK_FROM = 0.7;
/** How hard a comet pulls across the sky at first, px per step per step; it starts from rest. */
const COMET_PULL = 1 / 8 / 60;
/** How fast that pull eases off: the divisor under it grows by this much a step. */
const COMET_EASE = 0.003 / 8;
/** A comet's steady climb or fall, px a step, [slowest, fastest]. */
const COMET_RISE: [number, number] = [10 / 60, 29 / 60];
/** Tail length and head radius, per px-a-second of the comet's speed: both grow as it gathers speed. */
const COMET_TAIL = 0.7;
const COMET_HEAD = 0.02;
/** Half the tail's opening where it leaves the head, radians. */
const COMET_FAN = (2 * Math.PI) / 180;
/** How much bigger a comet is drawn at the end of its pass than at the start: it comes toward the eye. */
const COMET_NEAR = 1.3;
/** Seconds between one comet leaving and the next coming, [shortest, longest], on a night with comets. */
const COMET_WAIT: [number, number] = [15, 50];
/** Half the width of a fireball's glow at its brightest, px. */
const FIREBALL_GLOW = 18;
/** Pixels between the craft of a satellite train. */
const TRAIN_GAP = 16;
/** At the height of a flare: how much the dot's radius grows, how wide its glow is (px), and how strong that glow is. */
const FLARE_GROW = 0.6;
const FLARE_GLOW = 13;
const FLARE_GLOW_ALPHA = 0.45;
/** How much of a pass a satellite's flare takes, as a share of the pass. */
const FLARE_SPAN = 0.035;
/** The same for one craft of a train: shorter, so the flare is seen to run down the line. */
const TRAIN_FLARE_SPAN = 0.018;
/** Spots a new constellation draws to pick the roomiest from. */
const FIGURE_TRIES = 12;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const KIND_ID: Record<string, number> = {
  shooting: 1,
  shower: 2,
  satellite: 3,
  aurora: 4,
  comet: 5,
};

/**
 * When events of one kind start inside a bucket of time, as ms from the
 * bucket's start, in order. Drawn from the seed, the kind and the bucket's
 * index alone, so everyone on the same day's seed gets the same times.
 * `perBucket` may be a fraction: 0.25 is one event in every fourth bucket on
 * average.
 */
export function eventTimes(
  seed: number,
  kind: string,
  bucket: number,
  perBucket: number,
  bucketMs: number,
): number[] {
  if (perBucket <= 0) return [];
  const rng = mulberry32(mix(seed, KIND_ID[kind] ?? 0, bucket));
  const whole = Math.floor(perBucket);
  const n = whole + (rng.next() < perBucket - whole ? 1 : 0);
  const times: number[] = [];
  for (let i = 0; i < n; i++) times.push(rng.next() * bucketMs);
  return times.sort((a, b) => a - b);
}

/** Whether the day's night has a comet: one draw from the seed against the chance. */
export function cometTonight(seed: number, chance: number): boolean {
  return (
    chance > 0 && mulberry32(mix(seed, KIND_ID.comet ?? 0)).next() < chance
  );
}

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  /** Index into the tints. */
  tint: number;
  /** Where in its flicker it starts, and how fast it runs. */
  phase: number;
  rate: number;
  /** Its place in the order stars are made in: a lower count keeps the first ones. */
  n: number;
  /** Its own draws for size and brightness, 0 to 1, before the settings shape them. */
  ur: number;
  ua: number;
}

/** A constellation set in the sky: it turns and drifts as one body about its middle. */
interface Figure {
  key: string;
  x: number;
  y: number;
  angle: number;
  span: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ux: number;
  uy: number;
  life: number;
  maxLife: number;
  length: number;
  brightness: number;
  fireball: boolean;
}

interface Satellite {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  /** How many craft fly in line: 1, or a train of several. */
  craft: number;
  /** Where in its pass it flares, as a share of the pass; below 0 for never. */
  flareAt: number;
  /** A tumbling craft blinks: seconds for one turn, or 0 for a steady one. */
  tumble: number;
}

/**
 * A comet on one pass: it comes in at a side of the sky from rest, gathers
 * speed across it, and leaves at the far side.
 */
interface Comet {
  x: number;
  y: number;
  /** Speed, px a step: across gathers, up or down holds. */
  vx: number;
  vy: number;
  /** 1 heads right, -1 heads left. */
  dir: number;
  /** The divisor under the pull; it grows, so the pull eases off. */
  ease: number;
  /** Steps since it came in, for the tail's shimmer. */
  age: number;
}

type Ctx = CanvasRenderingContext2D;

/**
 * The night sky on one 2D canvas: a seeded field of stars that turns about a
 * point and drifts, constellations set among them, and events (shooting
 * stars, fireballs, meteor showers, satellites, comets, aurora) that start at
 * times drawn from the
 * day's seed, so a lobby sees the same sky.
 */
export class StarField {
  private w = 1;
  private h = 1;
  private settings: StarSettings = STAR_SETTINGS;
  private stars: Star[] = [];
  private figures: Figure[] = [];
  /** Frames drawn while the stars shimmer. */
  private frame = 0;
  private colours: string[] = TINTS;
  private meteors: Meteor[] = [];
  private satellites: Satellite[] = [];
  /** A shower in progress: when it ends, ms. */
  private showerUntil = 0;
  private showerDue = 0;
  /** An aurora in progress: when it began and ends, ms. */
  private auroraFrom = 0;
  private auroraUntil = 0;
  private comet: Comet | null = null;
  /** The moment the next comet comes on a night with comets, ms; 0 for at once. */
  private cometDue = 0;
  private passes = 0;
  /** The last moment events were looked for, ms; 0 before the first frame. */
  private checked = 0;
  /** A multiplier on how often timed events come, for the time of day in the sky. */
  rate = 1;
  private clock = 0;
  private glow: HTMLCanvasElement | null = null;
  private curtain: HTMLCanvasElement | null = null;
  private ray: HTMLCanvasElement | null = null;

  constructor(
    private readonly ctx: Ctx,
    private readonly seed: number,
  ) {}

  /** True while something that needs every frame is up. */
  get busy(): boolean {
    return (
      this.meteors.length > 0 ||
      this.satellites.length > 0 ||
      this.comet !== null ||
      this.auroraUntil > 0
    );
  }

  /** True when the still sky changes from frame to frame (flicker), so it cannot rest between steps. */
  get lively(): boolean {
    return this.settings.twinkle > 0;
  }

  resize(w: number, h: number): void {
    const sx = w / this.w;
    const sy = h / this.h;
    this.w = w;
    this.h = h;
    if (this.stars.length === 0) this.build();
    else {
      for (const s of this.stars) {
        s.x *= sx;
        s.y *= sy;
      }
      for (const f of this.figures) {
        f.x *= sx;
        f.y *= sy;
        f.span = FIGURE_SPAN * Math.min(w, h);
      }
    }
  }

  /**
   * Takes new settings. Nothing in the sky jumps: stars keep their places
   * and only change size or number, a constellation is added or taken out
   * without moving the others, and the comet changes only with its chance.
   */
  setSettings(next: StarSettings): void {
    const was = this.settings;
    this.settings = next;
    if (this.stars.length === 0) return;
    if (was.count !== next.count) this.populate();
    if (
      was.count !== next.count ||
      was.size !== next.size ||
      was.faint !== next.faint
    )
      this.shape();
    if (was.constellations.shown.join() !== next.constellations.shown.join())
      this.place();
    // A night that loses its comets lets go of the one in the sky; one that gains them gets the first at once.
    if (was.comet.chance !== next.comet.chance) {
      if (!cometTonight(this.seed, next.comet.chance)) this.comet = null;
      this.cometDue = 0;
    }
    this.tint();
  }

  private tint(): void {
    const k = this.settings.colour;
    this.colours = TINTS.map((hex) => {
      const c = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
      return `rgb(${c.map((v) => Math.round(255 + (v - 255) * k)).join(",")})`;
    });
  }

  /** Lays the whole sky out; only for a sky that has none yet. */
  private build(): void {
    this.stars = [];
    this.figures = [];
    this.populate();
    this.shape();
    this.place();
    this.comet = null;
    this.tint();
  }

  /** Brings the stars to the settings' count: the last made go first, new ones come in at their own seeded places. */
  private populate(): void {
    const { count } = this.settings;
    this.stars = this.stars.filter((st) => st.n < count);
    const have = new Set(this.stars.map((st) => st.n));
    for (let n = 0; n < count; n++) {
      if (have.has(n)) continue;
      // Each star is drawn from the seed and its own number, so it is the same star whenever it is made.
      const rng = mulberry32(mix(this.seed, 0x57a2, n));
      // Hot and cool stars are rare; most are near white.
      const t = rng.next();
      this.stars.push({
        x: rng.next() * this.w,
        y: rng.next() * this.h,
        radius: 0,
        alpha: 0,
        tint:
          t < 0.06
            ? 0
            : t < 0.2
              ? 1
              : t < 0.6
                ? 2
                : t < 0.8
                  ? 3
                  : t < 0.94
                    ? 4
                    : 5,
        phase: rng.next() * Math.PI * 2,
        rate: 0.6 + rng.next() * 1.6,
        n,
        ur: rng.next(),
        ua: rng.next(),
      });
    }
    // One fill colour at a time: the draw changes colour six times a frame, not once a star.
    this.stars.sort((a, b) => a.tint - b.tint);
  }

  /** Gives every star its size and brightness from its own draws and the settings. */
  private shape(): void {
    const s = this.settings;
    const lean = 1 + 3 * s.faint;
    for (const st of this.stars) {
      st.radius = SMALLEST + st.ur ** lean * (s.size - SMALLEST);
      // A larger star is a brighter one, give or take a little of its own.
      st.alpha =
        0.1 + (st.ur * SIZE_LIGHT + st.ua * (1 - SIZE_LIGHT)) ** lean * 0.9;
    }
  }

  /** A comet at rest at one side of the upper sky, about to cross to the other. */
  private newComet(rng: Rng): Comet {
    const dir = rng.next() < 0.5 ? 1 : -1;
    const rise = COMET_RISE[0] + rng.next() * (COMET_RISE[1] - COMET_RISE[0]);
    // It starts in the upper half and heads for the middle, so the pass stays in the sky.
    const y = (0.05 + rng.next() * 0.45) * this.h;
    return {
      x: dir > 0 ? 0 : this.w,
      y,
      vx: 0,
      vy: (y < this.h * 0.25 ? 1 : rng.next() < 0.5 ? 1 : -1) * rise * 0.5,
      dir,
      ease: 1,
      age: 0,
    };
  }

  /**
   * Brings the constellations in the sky to the ones shown: those taken out
   * go, those already up stay where they are, and each new one is set in the
   * upper sky at the spot farthest from the others, out of a few it draws.
   */
  private place(): void {
    const shown = this.settings.constellations.shown.filter(
      (key) => CONSTELLATIONS[key],
    );
    const span = FIGURE_SPAN * Math.min(this.w, this.h);
    this.figures = this.figures.filter((f) => shown.includes(f.key));
    for (const key of shown) {
      if (this.figures.some((f) => f.key === key)) continue;
      const rng = mulberry32(
        mix(this.seed, 0xf16, Object.keys(CONSTELLATIONS).indexOf(key)),
      );
      let best = { x: 0, y: 0, room: -1 };
      for (let i = 0; i < FIGURE_TRIES; i++) {
        const x = (0.1 + rng.next() * 0.8) * this.w;
        // The foot of the sky fades out, so figures keep to the upper part.
        const y = (0.1 + rng.next() * 0.45) * this.h;
        const room = Math.min(
          ...this.figures.map((f) => Math.hypot(f.x - x, f.y - y)),
          Number.MAX_VALUE,
        );
        if (room > best.room) best = { x, y, room };
      }
      this.figures.push({
        key,
        x: best.x,
        y: best.y,
        angle: (rng.next() - 0.5) * 0.9,
        span,
      });
    }
  }

  private pivotPx(): [number, number] {
    return [this.settings.pivot[0] * this.w, this.settings.pivot[1] * this.h];
  }

  /** Moves the sky on by `dt` 60 Hz steps and starts the events that fell due by `now` (wall clock, ms). */
  step(dt: number, now: number): void {
    const s = this.settings;
    this.clock += dt;
    const a = TURN_STEP * s.turn * dt;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const dx = DRIFT_STEP[0] * s.drift * dt;
    const dy = DRIFT_STEP[1] * s.drift * dt;
    const [px, py] = this.pivotPx();
    for (const st of this.stars) {
      const x = st.x - px;
      const y = st.y - py;
      st.x = px + x * cos - y * sin + dx;
      st.y = py + x * sin + y * cos + dy;
      if (st.x > this.w + st.radius) st.x = -st.radius;
      else if (st.x < -st.radius) st.x = this.w + st.radius;
      if (st.y > this.h + st.radius) st.y = -st.radius;
      else if (st.y < -st.radius) st.y = this.h + st.radius;
    }
    for (const f of this.figures) {
      const x = f.x - px;
      const y = f.y - py;
      f.x = px + x * cos - y * sin + dx;
      f.y = py + x * sin + y * cos + dy;
      f.angle += a;
      // A figure crosses the edge whole, then comes in on the far side.
      if (f.x > this.w + f.span) f.x = -f.span;
      else if (f.x < -f.span) f.x = this.w + f.span;
      if (f.y > this.h + f.span) f.y = -f.span;
      else if (f.y < -f.span) f.y = this.h + f.span;
    }
    this.stepComet(dt, now);

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i] as Meteor;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life += dt;
      if (m.life >= m.maxLife) this.meteors.splice(i, 1);
    }
    for (let i = this.satellites.length - 1; i >= 0; i--) {
      const sat = this.satellites[i] as Satellite;
      sat.x += sat.vx * dt;
      sat.y += sat.vy * dt;
      sat.life += dt;
      if (sat.life >= sat.maxLife) this.satellites.splice(i, 1);
    }
    this.schedule(now);
  }

  /** Moves the comet on, and brings the next one on a night with comets. */
  private stepComet(dt: number, now: number): void {
    const s = this.settings.comet;
    const pace = Math.max(0.3, Math.min(3, s.speed));
    const comet = this.comet;
    if (!comet) {
      if (cometTonight(this.seed, s.chance) && now >= this.cometDue)
        this.comet = this.newComet(
          mulberry32(mix(this.seed, 0xc03e, this.passes++)),
        );
      return;
    }
    comet.age += dt;
    // The pull across eases off as the comet goes, so it gathers speed fast, then holds it.
    comet.vx += ((comet.dir * COMET_PULL) / comet.ease) * pace * pace * dt;
    comet.ease += COMET_EASE * dt;
    comet.x += comet.vx * dt;
    comet.y += comet.vy * pace * dt;
    // Gone once the whole tail has left the sky; the next comes after a wait.
    const reach = Math.abs(comet.vx) * 60 * COMET_TAIL * s.tail * COMET_NEAR;
    if (
      comet.x < -reach ||
      comet.x > this.w + reach ||
      comet.y < -reach ||
      comet.y > this.h + reach
    ) {
      this.comet = null;
      this.cometDue =
        now +
        (COMET_WAIT[0] + Math.random() * (COMET_WAIT[1] - COMET_WAIT[0])) *
          1000;
    }
  }

  /** Starts every event whose seeded time fell between the last look and `now`. */
  private schedule(now: number): void {
    const from = this.checked || now;
    this.checked = now;
    const s = this.settings;
    // A long gap (a tab that slept) is not caught up on: only the last few seconds count.
    const since = Math.max(from, now - 5000);
    const fell = (
      kind: string,
      perBucket: number,
      bucketMs: number,
      each: (rng: Rng) => void,
    ) => {
      for (
        let b = Math.floor(since / bucketMs);
        b <= Math.floor(now / bucketMs);
        b++
      ) {
        const times = eventTimes(this.seed, kind, b, perBucket, bucketMs);
        for (let i = 0; i < times.length; i++) {
          const at = b * bucketMs + (times[i] as number);
          if (at > since && at <= now)
            each(mulberry32(mix(this.seed, KIND_ID[kind] ?? 0, b, i + 1)));
        }
      }
    };
    const every = (s.shooting.every[0] + s.shooting.every[1]) / 2;
    const rate = Math.max(0, this.rate);
    fell("shooting", every > 0 ? (60 / every) * rate : 0, MINUTE_MS, (rng) =>
      this.meteor(rng, rng.next() < s.shooting.fireball),
    );
    fell("shower", s.shower.perHour * rate, HOUR_MS, () =>
      this.send("shower", now),
    );
    fell("satellite", s.satellite.perHour * rate, HOUR_MS, (rng) =>
      this.satellite(rng, rng.next() < s.satellite.train),
    );
    fell("aurora", s.aurora.perHour * rate, HOUR_MS, () =>
      this.send("aurora", now),
    );

    if (this.showerUntil > now) {
      // Meteors of a shower come thick in its middle and thin at both ends.
      const span = s.shower.length * 1000;
      const mid =
        1 - Math.abs(1 - (2 * (span - (this.showerUntil - now))) / span);
      while (this.showerDue <= now) {
        const rng = mulberry32(
          mix(this.seed, 0x5403, Math.floor(this.showerDue)),
        );
        this.meteor(rng, false, true);
        this.showerDue +=
          (1000 / Math.max(0.05, s.shower.rate * (0.25 + 0.75 * mid))) *
          (0.5 + rng.next());
      }
    } else this.showerUntil = 0;
    if (this.auroraUntil && this.auroraUntil <= now) this.auroraUntil = 0;
  }

  /** Starts an event now, outside the seeded times. */
  send(kind: StarEventKind, now = Date.now()): void {
    const rng = mulberry32(mix(this.seed, Math.floor(now)));
    if (kind === "shooting" || kind === "fireball")
      this.meteor(rng, kind === "fireball");
    else if (kind === "satellite" || kind === "train")
      this.satellite(rng, kind === "train");
    else if (kind === "comet") this.comet = this.newComet(rng);
    else if (kind === "shower") {
      this.showerUntil = now + this.settings.shower.length * 1000;
      this.showerDue = now;
    } else {
      this.auroraFrom = now;
      this.auroraUntil = now + this.settings.aurora.length * 1000;
    }
  }

  /** Ends every event in progress. */
  clear(): void {
    this.meteors = [];
    this.satellites = [];
    this.showerUntil = 0;
    this.auroraUntil = 0;
  }

  private meteor(rng: Rng, fireball: boolean, shower = false): void {
    const s = this.settings.shooting;
    let x: number;
    let y: number;
    let angle: number;
    if (shower) {
      // A shower's meteors fly outward from one point, starting a little way off it.
      const [rx, ry] = this.settings.shower.radiant;
      angle = rng.next() * Math.PI * 2;
      const off = (0.08 + rng.next() * 0.3) * Math.min(this.w, this.h);
      x = rx * this.w + Math.cos(angle) * off;
      y = ry * this.h + Math.sin(angle) * off;
    } else {
      angle =
        Math.atan2(DRIFT_STEP[1], DRIFT_STEP[0]) +
        (rng.next() * 2 - 1) * s.spread;
      x = rng.next() * this.w * 0.7 + this.w * 0.2;
      y = rng.next() * this.h * 0.4;
    }
    const speed = (6 + rng.next() * 6) * s.speed * (fireball ? 0.7 : 1);
    const length =
      (80 + rng.next() * 80) * s.tail * (fireball ? 1.6 : shower ? 0.8 : 1);
    let life = (40 + rng.next() * 30) * (fireball ? 1.8 : 1);
    if (fireball) {
      // A fireball crosses the whole sky: from out of sight, through the place drawn above, until its tail is out of sight too.
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      /** How far along (ux, uy) from (x, y) the sky's edge is, with `pad` px to spare. */
      const toEdge = (dx: number, dy: number, pad: number) =>
        Math.min(
          dx > 0
            ? (this.w + pad - x) / dx
            : dx < 0
              ? (-pad - x) / dx
              : Number.POSITIVE_INFINITY,
          dy > 0
            ? (this.h + pad - y) / dy
            : dy < 0
              ? (-pad - y) / dy
              : Number.POSITIVE_INFINITY,
        );
      const back = toEdge(-ux, -uy, FIREBALL_GLOW);
      const on = toEdge(ux, uy, FIREBALL_GLOW + length);
      x -= ux * back;
      y -= uy * back;
      life = (back + on) / speed;
    }
    this.meteors.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ux: Math.cos(angle),
      uy: Math.sin(angle),
      life: 0,
      maxLife: life,
      length,
      brightness: Math.min(1, (0.6 + rng.next() * 0.4) * s.brightness),
      fireball,
    });
  }

  private satellite(rng: Rng, train: boolean): void {
    const s = this.settings.satellite;
    // A point of light on a straight path, slow enough to follow with the eye.
    const fromLeft = rng.next() < 0.5;
    const y = (0.08 + rng.next() * 0.4) * this.h;
    const speed = (0.45 + rng.next() * 0.3) * s.speed;
    const slope = (rng.next() - 0.5) * 0.5;
    const craft = train ? 5 + Math.floor(rng.next() * 6) : 1;
    this.satellites.push({
      x: fromLeft ? -4 : this.w + 4,
      y,
      vx: (fromLeft ? 1 : -1) * speed,
      vy: slope * speed,
      life: 0,
      // It crosses the whole sky, until its last craft is out at the far side.
      maxLife: (this.w + 8 + craft * TRAIN_GAP) / speed,
      craft,
      // A flare is at a place in the sky: a lone craft flares there, and the craft of a train one after another as each comes to it.
      flareAt: rng.next() < s.flare ? 0.25 + rng.next() * 0.4 : -1,
      // One lone craft in five tumbles, and blinks as it turns.
      tumble: !train && rng.next() < 0.2 ? 1.5 + rng.next() * 3 : 0,
    });
  }

  /** A soft round glow, drawn once and stamped for fireballs and the comet. */
  private glowSprite(): HTMLCanvasElement {
    if (this.glow) return this.glow;
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d") as Ctx;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(220,235,255,0.5)");
    grad.addColorStop(1, "rgba(200,220,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this.glow = c;
    return c;
  }

  /** Draws the sky as it stands. */
  draw(now = Date.now()): void {
    const { ctx, w, h } = this;
    const s = this.settings;
    ctx.clearRect(0, 0, w, h);
    if (this.auroraUntil > now) this.drawAurora(now);

    const t = this.clock * 0.05 * s.twinkleSpeed;
    // The shimmer steps on with each drawn frame; a calm sky draws every second one, which suits it.
    const frame = s.shimmer > 0 ? ++this.frame : 0;
    let tint = -1;
    for (const st of this.stars) {
      let alpha = st.alpha * s.brightness;
      if (s.shimmer > 0) {
        // Each star walks the table from its own place, so no two flicker alike.
        const at = (st.n * 37 + frame) & 1023;
        const roll = SHIMMER_TABLE[at];
        alpha *= 1 + (roll - 0.5) * 2 * SHIMMER_JUMP * s.shimmer;
        // Some stars flash colour often, some hardly ever: each has its own bar to clear.
        const bar = 1 - s.shimmer * SHIMMER_TABLE[(st.n * 101) & 1023];
        const flash =
          SHIMMER_TABLE[(at + 511) & 1023] > bar
            ? 6 + ((st.n + ((frame * 13) & 1023)) & 31)
            : st.tint;
        if (flash !== tint) {
          tint = flash;
          ctx.fillStyle = (
            flash < 6 ? this.colours[flash] : SHIMMER_HUES[flash - 6]
          ) as string;
        }
      } else if (st.tint !== tint) {
        tint = st.tint;
        ctx.fillStyle = this.colours[tint] as string;
      }
      // Air is thickest near the foot of the sky, so stars flicker most there.
      if (s.twinkle > 0)
        alpha *=
          1 -
          s.twinkle *
            (0.35 + 0.65 * (st.y / h)) *
            (0.5 + 0.5 * Math.sin(st.phase + t * st.rate));
      ctx.globalAlpha = alpha > 1 ? 1 : alpha;
      // A star under a pixel across is a square to the eye, and a rect is cheaper than an arc.
      if (st.radius < 0.8)
        ctx.fillRect(
          st.x - st.radius,
          st.y - st.radius,
          st.radius * 2,
          st.radius * 2,
        );
      else {
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.drawFigures();
    if (this.comet) this.drawComet();
    this.drawSatellites();
    this.drawMeteors();
    ctx.globalAlpha = 1;
  }

  private drawFigures(): void {
    const { ctx } = this;
    const { lines, names } = this.settings.constellations;
    for (const f of this.figures) {
      const figure = CONSTELLATIONS[f.key];
      if (!figure) continue;
      const cos = Math.cos(f.angle) * f.span;
      const sin = Math.sin(f.angle) * f.span;
      const at = (i: number): [number, number] => {
        const [x, y] = figure.stars[i] as FigureStar;
        return [
          f.x + (x - 0.5) * cos - (y - 0.5) * sin,
          f.y + (x - 0.5) * sin + (y - 0.5) * cos,
        ];
      };
      if (lines) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        for (const [a, b] of figure.lines) {
          const [x1, y1] = at(a);
          const [x2, y2] = at(b);
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < figure.stars.length; i++) {
        const [x, y] = at(i);
        const size = (figure.stars[i] as FigureStar)[2];
        ctx.globalAlpha = Math.min(
          1,
          (0.55 + 0.45 * size) * this.settings.brightness,
        );
        ctx.beginPath();
        ctx.arc(x, y, 0.7 + size * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (names) {
        ctx.globalAlpha = 0.45;
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(figure.name, f.x, f.y + f.span * 0.62);
      }
    }
  }

  /**
   * The comet. Its tail's length and its head's size follow its speed, and
   * the whole of it is drawn larger the farther along its pass it is, so it
   * comes in as a faint speck and leaves long and bright. The tail is a narrow
   * fan that tapers to nothing, with a thin blue streak down its middle; its
   * end sways a little, so it never sits
   * still.
   */
  private drawComet(): void {
    const { ctx, comet } = this;
    if (!comet) return;
    const s = this.settings.comet;
    const bright = Math.min(1, this.settings.brightness);
    const speed = Math.hypot(comet.vx, comet.vy);
    if (speed < 0.01) return;
    // Back along the way it came.
    const bx = -comet.vx / speed;
    const by = -comet.vy / speed;
    // How far across the sky it has come, 0 to 1: far and small at first, near and large at the end.
    const along = Math.max(
      0,
      Math.min(1, comet.dir > 0 ? comet.x / this.w : 1 - comet.x / this.w),
    );
    const near = 1 + (COMET_NEAR - 1) * along;
    const perSecond = speed * 60;
    const reach = perSecond * COMET_TAIL * s.tail * near;
    const head = Math.max(0.6, perSecond * COMET_HEAD * s.size * near);
    // It fades in over its first moments, so it does not pop into the sky.
    const fade = Math.min(1, comet.age / 90) * bright;
    // The tail's end sways slowly from side to side.
    const sway =
      Math.sin(comet.age * 0.06) * 0.012 + Math.sin(comet.age * 0.023) * 0.008;
    const ex = comet.x + (bx * Math.cos(sway) - by * Math.sin(sway)) * reach;
    const ey = comet.y + (bx * Math.sin(sway) + by * Math.cos(sway)) * reach;
    const half = Math.tan(COMET_FAN) * reach * 0.5 + head;

    // The tail: widest just behind the head, drawn out to a point.
    const tail = ctx.createLinearGradient(comet.x, comet.y, ex, ey);
    tail.addColorStop(0, "rgba(255,255,255,0.85)");
    tail.addColorStop(0.25, "rgba(235,242,255,0.4)");
    tail.addColorStop(1, "rgba(220,235,255,0)");
    ctx.fillStyle = tail;
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.moveTo(comet.x - by * head, comet.y + bx * head);
    ctx.quadraticCurveTo(
      comet.x + bx * reach * 0.35 - by * half,
      comet.y + by * reach * 0.35 + bx * half,
      ex,
      ey,
    );
    ctx.quadraticCurveTo(
      comet.x + bx * reach * 0.35 + by * half,
      comet.y + by * reach * 0.35 - bx * half,
      comet.x + by * head,
      comet.y - bx * head,
    );
    ctx.closePath();
    ctx.fill();

    // A thin blue streak of gas down the middle, a little longer than the dust.
    const gx = comet.x + bx * reach * 1.2;
    const gy = comet.y + by * reach * 1.2;
    const gas = ctx.createLinearGradient(comet.x, comet.y, gx, gy);
    gas.addColorStop(0, "rgba(170,205,255,0.7)");
    gas.addColorStop(1, "rgba(170,205,255,0)");
    ctx.strokeStyle = gas;
    ctx.globalAlpha = 0.6 * fade;
    ctx.lineWidth = Math.max(0.5, head * 0.35);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(comet.x, comet.y);
    ctx.lineTo(gx, gy);
    ctx.stroke();
    ctx.lineCap = "butt";

    // The head: a bright middle in a soft glow that breathes a little.
    const glow = head * (7 + Math.sin(comet.age * 0.11));
    ctx.globalAlpha = 0.5 * fade;
    ctx.drawImage(
      this.glowSprite(),
      comet.x - glow / 2,
      comet.y - glow / 2,
      glow,
      glow,
    );
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, head, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSatellites(): void {
    const { ctx } = this;
    const s = this.settings.satellite;
    ctx.fillStyle = "#ffffff";
    for (const sat of this.satellites) {
      const speed = Math.hypot(sat.vx, sat.vy) || 1;
      // Px of the pass that one share of it is.
      const pass = speed * sat.maxLife;
      const span = sat.craft > 1 ? TRAIN_FLARE_SPAN : FLARE_SPAN;
      // A tumbling craft catches the sun once a turn.
      const blink = sat.tumble
        ? 0.35 +
          0.65 *
            Math.max(0, Math.sin((sat.life / 60 / sat.tumble) * Math.PI * 2)) **
              2
        : 1;
      for (let i = 0; i < sat.craft; i++) {
        // A flare: for a moment a flat side throws the sun straight at the eye. Each craft of a train is that much behind the first.
        const p = (speed * sat.life - i * TRAIN_GAP) / pass;
        const flare =
          sat.flareAt >= 0 ? Math.exp(-(((p - sat.flareAt) / span) ** 2)) : 0;
        const x = sat.x - (sat.vx / speed) * i * TRAIN_GAP;
        const y = sat.y - (sat.vy / speed) * i * TRAIN_GAP;
        if (x < -4 || x > this.w + 4) continue;
        ctx.globalAlpha = Math.min(1, 0.6 * s.brightness * blink + flare);
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          (sat.craft > 1 ? 0.8 : 1) + flare * FLARE_GROW,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        if (flare > 0.15) {
          const glow = FLARE_GLOW * flare;
          ctx.globalAlpha = FLARE_GLOW_ALPHA * flare;
          ctx.drawImage(
            this.glowSprite(),
            x - glow / 2,
            y - glow / 2,
            glow,
            glow,
          );
        }
      }
    }
  }

  private drawMeteors(): void {
    const { ctx } = this;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    const segments = 5;
    for (const m of this.meteors) {
      // A shooting star burns out; a fireball holds its light the whole way across.
      const opacity = m.fireball
        ? m.brightness
        : Math.max(0, (1 - m.life / m.maxLife) * m.brightness);
      const tailX = m.x - m.ux * m.length;
      const tailY = m.y - m.uy * m.length;
      const wide = m.fireball ? 2.2 : 1;
      if (m.fireball) {
        // A fireball flares toward the middle of its flight.
        const flare =
          14 +
          (FIREBALL_GLOW * 2 - 14) *
            Math.sin(Math.PI * Math.min(1, m.life / m.maxLife));
        ctx.globalAlpha = opacity;
        ctx.drawImage(
          this.glowSprite(),
          m.x - flare / 2,
          m.y - flare / 2,
          flare,
          flare,
        );
      }
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(m.x, m.y, (1 + m.brightness * 0.5) * wide, 0, Math.PI * 2);
      ctx.fill();
      for (let j = 0; j < segments; j++) {
        const t1 = j / segments;
        const t2 = (j + 1) / segments;
        ctx.globalAlpha = opacity * (0.2 + t2 * 0.8);
        ctx.lineWidth = (0.3 + t2 * 0.9) * m.brightness * wide;
        ctx.beginPath();
        ctx.moveTo(tailX + (m.x - tailX) * t1, tailY + (m.y - tailY) * t1);
        ctx.lineTo(tailX + (m.x - tailX) * t2, tailY + (m.y - tailY) * t2);
        ctx.stroke();
      }
    }
  }

  /**
   * A curtain of light across the upper sky, built the way a real one is
   * seen: rays stand along a footprint that folds back on itself, and their
   * light adds up, so the curtain is brightest where a fold is seen edge-on.
   * Each ray is green with a sharp foot, fading to red above; a strong display
   * adds a pink fringe below the foot. Kinks of brightness run along the
   * curtain. A second, fainter curtain hangs higher behind. All of it is drawn
   * on a small canvas and stretched over the sky, which gives the glow.
   */
  private drawAurora(now: number): void {
    const s = this.settings.aurora;
    const span = this.auroraUntil - this.auroraFrom;
    const p = (now - this.auroraFrom) / span;
    // In over the first sixth, out over the last.
    const fade = Math.min(1, p / 0.16, (1 - p) / 0.16);
    const t = now / 1000;
    if (!this.curtain || !this.ray) {
      this.curtain = document.createElement("canvas");
      this.curtain.width = AURORA_W;
      this.curtain.height = AURORA_H;
      // One ray, foot at the bottom: oxygen red high up, green below, a hard bright edge at the foot.
      this.ray = document.createElement("canvas");
      this.ray.width = 1;
      this.ray.height = 48;
      const r = this.ray.getContext("2d") as Ctx;
      const grad = r.createLinearGradient(0, 0, 0, 48);
      grad.addColorStop(0, "rgba(255,70,90,0)");
      grad.addColorStop(0.22, "rgba(255,80,110,0.28)");
      grad.addColorStop(0.5, "rgba(120,230,150,0.5)");
      grad.addColorStop(0.82, "rgba(70,255,150,0.95)");
      grad.addColorStop(0.95, "rgba(170,255,200,1)");
      grad.addColorStop(1, "rgba(70,255,150,0)");
      r.fillStyle = grad;
      r.fillRect(0, 0, 1, 48);
    }
    const g = this.curtain.getContext("2d") as Ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, AURORA_W, AURORA_H);
    // Light adds: where rays crowd at a fold, the curtain burns brighter.
    g.globalCompositeOperation = "lighter";
    const TAU = Math.PI * 2;
    // Far curtain first: higher, fainter, fewer rays, on its own slow sway.
    for (const [lift, strength, shift, rays] of [
      [0.14, 0.4, 1.9, AURORA_RAYS / 2],
      [0, 1, 0, AURORA_RAYS],
    ] as const) {
      for (let i = 0; i < rays; i++) {
        const along = i / rays;
        const u = along + shift;
        // The footprint: across the sky, folding back on itself as the folds drift along it.
        const x =
          (-0.08 +
            1.16 * along +
            0.07 * Math.sin(TAU * 2.6 * u + t * 0.16) +
            0.03 * Math.sin(TAU * 6.1 * u - t * 0.11)) *
          AURORA_W;
        // A fold swings the curtain toward and away from the eye: nearer hangs lower and stands taller.
        const near = Math.cos(TAU * 2.6 * u + t * 0.16);
        const foot =
          (0.52 -
            lift +
            0.07 * Math.sin(TAU * 1.2 * u + t * 0.07) +
            0.05 * near) *
          AURORA_H;
        const tall =
          (0.36 + 0.07 * near + 0.05 * Math.sin(TAU * 3.7 * u + t * 0.09)) *
          AURORA_H;
        // Kinks of brightness run along the curtain; it thins toward both ends.
        const kink =
          0.55 +
          0.45 *
            Math.sin(
              TAU * 15 * u - t * 0.9 + 1.5 * Math.sin(TAU * 4 * u + t * 0.3),
            );
        const ends = Math.min(1, along / 0.1, (1 - along) / 0.1);
        // Rays lean with the field: a little off upright, more toward the sides.
        const lean = 0.12 + 0.2 * (along - 0.5);
        g.setTransform(1, 0, -lean, 1, x + lean * foot, 0);
        g.globalAlpha = AURORA_RAY_ALPHA * strength * kink * ends;
        g.drawImage(this.ray, 0, foot - tall, 1.3, tall);
        // A strong display reaches lower air, which glows pink under the foot.
        if (s.strength > PINK_FROM) {
          g.globalAlpha =
            AURORA_RAY_ALPHA *
            strength *
            kink *
            ends *
            ((s.strength - PINK_FROM) / (1 - PINK_FROM));
          g.fillStyle = "#ff7ac8";
          g.fillRect(0, foot - 0.5, 1.3, AURORA_H * 0.035);
        }
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalAlpha = Math.min(1, 0.75 * s.strength * fade);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
    this.ctx.drawImage(this.curtain, 0, 0, this.w, this.h);
  }
}
