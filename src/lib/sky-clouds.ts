import { SKY_PHASES, type SkyPhase } from "@orakl/shared";
import { mulberry32, type Rng } from "@/lib/birds/rng";
import { mix } from "@/lib/birds/seed";
import { CALM, type SkyWind } from "@/lib/sky-wind";

/** One cloud's place in the sky for the day. Percentages are of the sky's box. */
export interface Cloud {
  top: number;
  width: number;
  /** Tilt in degrees. */
  rot: number;
  /** Multiplier on the layer's base opacity. */
  opacity: number;
  /** -1 mirrors the sprite. */
  flip: number;
  /** Seconds for one crossing in still air: wide clouds hang low and slow, small ones pass quicker. */
  dur: number;
  /** Negative, so the cloud is mid-crossing on first paint. */
  delay: number;
  /** Rise or sink across one crossing, percent of height. */
  lift: number;
  /** Softness in px: the wider (nearer the horizon, farther off) the softer. */
  blur: number;
}

/** What the wind does to every cloud; changes with the phase, the layout does not. */
export interface CloudMotion {
  /** Divides each cloud's still-air crossing. */
  pace: number;
  /** 1 crosses left to right, -1 right to left. */
  dir: 1 | -1;
  /** Horizontal stretch. */
  stretch: number;
  /** Multiplier on opacity: strong wind thins. */
  thin: number;
}

/** The day's clouds, the same for everyone on the day, laid out once so a phase change moves none. */
export function cloudLayout(seed: number, count: number): Cloud[] {
  const rng = mulberry32(mix(seed, 0xc10d));
  const clouds: Cloud[] = [];
  for (let i = 0; i < count; i++) {
    const width = rng.range(30, 64);
    const dur = 140 * (width / 40);
    clouds.push({
      top: rng.range(3, 36),
      width,
      rot: rng.range(-3, 3),
      opacity: rng.range(0.6, 1.1),
      flip: rng.sign(),
      dur,
      delay: -rng.range(0, dur),
      lift: rng.sign() * rng.range(1, 3),
      blur: Math.max(0, (width - 38) * 0.07),
    });
  }
  return clouds;
}

export function cloudMotion(wind: SkyWind): CloudMotion {
  const w = Math.abs(wind.x);
  return {
    pace: 0.35 + w * 0.4,
    dir: wind.x < 0 ? -1 : 1,
    stretch: 1 + w * 0.08,
    thin: 1 - w * 0.05,
  };
}

/** How many of the day's clouds a phase shows: calm phases carry fewer. */
export function cloudsShown(phase: SkyPhase, count: number): number {
  return Math.max(1, Math.round(count * (CALM[phase] ?? 1) * 1.15));
}

/**
 * A crossing's progress carried across a change of pace or direction, so the
 * cloud keeps its place: `at` is the animation's current time in seconds.
 */
export function carryProgress(
  cloud: Cloud,
  at: number,
  from: CloudMotion,
  to: CloudMotion,
): number {
  const oldDur = cloud.dur / from.pace;
  const newDur = cloud.dur / to.pace;
  const active = at - cloud.delay;
  let p = (((active % oldDur) + oldDur) % oldDur) / oldDur;
  if (from.dir !== to.dir) p = 1 - p;
  // The first crossing began part-way (negative delay); a fraction before that
  // point is reached on the next crossing, never before time zero.
  let at2 = cloud.delay + p * newDur;
  while (at2 < 0) at2 += newDur;
  return at2;
}

/** The cloud model's knobs. */
export interface CloudModel {
  /** The cloud's canvas, width over height; low values give towers room to climb. */
  aspect: number;
  /** Broad base puffs along the spine. */
  body: number;
  /** Lobes grown on each body puff. */
  tower: number;
  /** Lobes grown on each lobe, down the depth. */
  detail: number;
  /** Generations of lobes. */
  depth: number;
  /** Scale of the body puffs. */
  size: number;
  /** How much of its parent's size each lobe keeps. */
  lobe: number;
  /** Puff aspect, round to long. */
  stretch: number;
  /** How far lobes climb from their parent. */
  rise: number;
  /** Span of the body puffs across the canvas. */
  spread: number;
  /** Vertical scatter of the body puffs, 0 to 1. */
  scatter: number;
  /** Lean with height; the sign is the direction. */
  shear: number;
  /** Gradient falloff of each puff, crisp at 0 to all falloff at 1. */
  softness: number;
  /** Thin streaks trailing from each outermost lobe. */
  filaments: number;
  /** Flattens and spreads lobes that climb past a ceiling, 0 to 1. */
  anvil: number;
  /** 1 grows lobes upward only, leaving a flat base; 0 grows them all round. */
  flatBase: number;
  /** A body puff's alpha at its centre; lobes run a little denser. */
  peak: number;
  /** Fine Perlin texture, 0 to 1. */
  grain: number;
  /** Lattice cells across the grain tile; more is finer. */
  grainScale: number;
  /** Octaves summed into the grain. */
  grainOctaves: number;
  /** Mid-scale Perlin modulation: dense cores beside dim gaps, 0 to 1. */
  mid: number;
  /** Lattice cells across the cores tile. */
  midScale: number;
  /** Octaves summed into the cores. */
  midOctaves: number;
  /** Share of height where the underside starts to vanish. */
  fade: number;
  /** Share of height the top fades in over. */
  top: number;
  /** Alpha no pixel passes. */
  cap: number;
}

/**
 * Measured from a reference cloud photo: pure white, alpha capped near 0.94
 * and mostly mid-range, a broad body with structure at every scale, fading
 * out over the lower third and the top tenth.
 */
export const CLOUD_MODEL: CloudModel = {
  aspect: 2,
  body: 5,
  tower: 3,
  detail: 3,
  depth: 3,
  size: 1,
  lobe: 1,
  stretch: 1,
  rise: 1,
  spread: 1,
  scatter: 0,
  shear: 0,
  softness: 0.3,
  filaments: 0,
  anvil: 0,
  flatBase: 1,
  peak: 0.5,
  grain: 0.35,
  grainScale: 20,
  grainOctaves: 4,
  mid: 0.45,
  midScale: 5,
  midOctaves: 2,
  fade: 0.62,
  top: 0.08,
  cap: 0.94,
};

/** A genus recipe: the model knobs that differ from `CLOUD_MODEL`, and a width where the genus needs one. */
export interface CloudPreset {
  model: Partial<CloudModel>;
  /** Width in percent of the sky. */
  width?: number;
  /** Cells painted onto the cloud, and how hard the brush was at each. */
  paint?: PaintCells;
  hardness?: PaintHardness;
}

/** Recipes for the common genera. */
export const CLOUD_PRESETS: Record<string, CloudPreset> = {
  cumulus: { model: {} },
  congestus: { model: { body: 4, tower: 4, depth: 4, rise: 1.4, peak: 0.55 } },
  cumulonimbus: {
    model: {
      aspect: 0.9,
      body: 3,
      depth: 4,
      size: 1.4,
      lobe: 1.3,
      spread: 0.2,
      scatter: 1,
      rise: 1.6,
      anvil: 0.7,
      peak: 0.62,
      cap: 0.97,
      softness: 0.25,
    },
    width: 40,
  },
  stratocumulus: {
    model: {
      body: 8,
      tower: 2,
      detail: 2,
      depth: 2,
      stretch: 1.5,
      spread: 1.4,
      scatter: 0.3,
      rise: 0.6,
      mid: 0.55,
    },
  },
  stratus: {
    model: {
      body: 9,
      tower: 1,
      detail: 0,
      depth: 1,
      stretch: 2.6,
      spread: 1.5,
      scatter: 0.15,
      peak: 0.42,
      grain: 0.25,
      mid: 0.3,
      fade: 0.75,
      top: 0.25,
      softness: 0.6,
      rise: 0.4,
    },
  },
  nimbostratus: {
    model: {
      body: 10,
      tower: 1,
      detail: 1,
      depth: 2,
      stretch: 2,
      spread: 1.6,
      scatter: 0.5,
      peak: 0.6,
      cap: 0.98,
      grain: 0.3,
      mid: 0.5,
      size: 1.2,
      fade: 0.85,
      top: 0.3,
      rise: 0.5,
      softness: 0.5,
    },
  },
  altocumulus: {
    model: {
      body: 10,
      tower: 1,
      detail: 1,
      depth: 2,
      size: 0.45,
      stretch: 1.1,
      spread: 1.5,
      scatter: 0.5,
      rise: 0.4,
      peak: 0.45,
      softness: 0.4,
    },
  },
  cirrus: {
    model: {
      body: 3,
      tower: 2,
      detail: 2,
      size: 0.7,
      stretch: 3.5,
      shear: 0.8,
      spread: 1.3,
      scatter: 0.4,
      softness: 0.85,
      filaments: 4,
      peak: 0.4,
      cap: 0.8,
      grain: 0.5,
      grainScale: 30,
      mid: 0.35,
      fade: 0.9,
      top: 0.15,
      flatBase: 0,
      rise: 0.5,
    },
  },
  cirrostratus: {
    model: {
      body: 10,
      tower: 0,
      depth: 0,
      size: 1.2,
      stretch: 4,
      spread: 1.6,
      scatter: 0.6,
      softness: 0.95,
      peak: 0.2,
      cap: 0.6,
      grain: 0.3,
      flatBase: 0,
      fade: 0.95,
      top: 0.3,
    },
  },
  lenticular: {
    model: {
      body: 1,
      tower: 0,
      depth: 0,
      size: 1.3,
      stretch: 2.8,
      softness: 0.15,
      peak: 0.8,
      cap: 0.97,
      grain: 0.05,
      mid: 0.1,
      fade: 0.8,
      top: 0.2,
    },
  },
};

/**
 * The knobs one cloud must hold as its own to look like a template, whatever
 * the model every cloud shares is: each knob where the template's cloud and
 * the shared one differ. A cloud that held only the template's own knobs
 * would take the rest from the shared model, and come out as a mix of the two.
 */
export function templateOver(
  preset: CloudPreset,
  shared: Partial<CloudModel>,
): Partial<CloudModel> {
  const want = { ...CLOUD_MODEL, ...preset.model };
  const base = { ...CLOUD_MODEL, ...shared };
  const own: Partial<CloudModel> = {};
  for (const key of Object.keys(CLOUD_MODEL) as (keyof CloudModel)[])
    if (want[key] !== base[key]) own[key] = want[key];
  return own;
}

/** How the live clouds are drawn. */
export const CLOUD_LIVE = {
  /** Backing width in px of each cloud's canvas. */
  width: 800,
  /** Mini-variations: how far each puff drifts from its seat and how much a lobe swells and thins, 0 to 1. */
  variation: 0.25,
  /** Seconds per slow variation cycle. */
  variationPeriod: 240,
  /** Milliseconds between one cloud's repaints; clouds take turns. */
  interval: 400,
  /** Seconds the tint takes to follow a phase change. */
  tintEase: 2,
};

export interface Puff {
  x: number;
  y: number;
  rx: number;
  ry: number;
  a: number;
}

const VIEW_W = 400;
/** Columns of the paint grid. */
export const PAINT_COLS = 60;
/** Rows of the paint grid for a model: cells stay the same shape at any aspect. */
export const paintRows = (m: CloudModel) =>
  Math.max(6, Math.round(40 / m.aspect));

/**
 * Cells painted onto a cloud by hand, keyed `"column,row"` in canvas space.
 * Positive pools cloud in (0.5 a mist, 1 full); negative erodes (-0.5 thins,
 * -1 erodes, -2 clears outright).
 */
export type PaintCells = Record<string, number>;

/**
 * How hard the brush was at each painted cell, by the same keys: 0 soaks far
 * into its neighbours, 1 keeps a crisp edge. A cell left out is `PAINT_HARDNESS`.
 */
export type PaintHardness = Record<string, number>;
export const PAINT_HARDNESS = 0.5;

/**
 * A cloud as translucent puffs at time `t`: body puffs along a spine, each
 * growing lobes, each lobe growing smaller, denser lobes in turn, so the mass
 * is a cluster of clusters at every scale. Each puff seeds from its path in
 * the tree, so a knob that adds lobes leaves the others where they are;
 * `wobble` is how far each sways from its seat, and how much a lobe swells and
 * thins, as `t` runs. The set is fitted inside the canvas, so no cloud
 * overflows it. `erodeAt` samples the erosion field (0 to 1) at a point in
 * canvas fractions: small puffs in it go, larger ones thin.
 */
export function cloudPuffs(
  seed: number,
  m: CloudModel = CLOUD_MODEL,
  t = 0,
  wobble = 0,
  erodeAt?: (u: number, v: number) => number,
): Puff[] {
  const W = VIEW_W;
  const H = W / m.aspect;
  const puffs: Puff[] = [];
  const r0 = mulberry32(mix(seed, 1));
  const cx = W / 2 + r0.range(-25, 25);
  const cy = H * 0.64;
  const span = W * r0.range(0.28, 0.36) * m.spread;
  const sway = (r: Rng, base: number, amp: number, depth: number) => {
    const f = r.range(0.6, 1.4);
    const ph = r.range(0, Math.PI * 2);
    return base + amp * (0.6 + 0.4 * depth) * Math.sin(t * f + ph);
  };
  // The anvil: lobes that climb past the ceiling spread sideways and flatten.
  const ceiling = cy * (1 - 0.55 * m.anvil);
  const anvil = (q: Puff, r: Rng) => {
    if (m.anvil <= 0) return;
    const rise = cy - q.y;
    if (rise <= ceiling) return;
    q.y = cy - ceiling + r.range(-3, 3);
    q.x += (rise - ceiling) * r.range(0.6, 1.2) * r.sign();
    q.rx *= 1 + m.anvil * 0.5;
    q.ry *= 0.8;
  };
  // Filaments: thin streaks trailing from a lobe, the way ice falls out of cirrus.
  const filaments = (q: Puff, r: Rng) => {
    for (let k = 0; k < m.filaments; k++) {
      const side = m.shear !== 0 ? Math.sign(m.shear) : r.sign();
      puffs.push({
        x: q.x + side * q.rx * r.range(0.8, 2.2),
        y: q.y + r.range(-0.3, 0.6) * q.ry,
        rx: q.rx * r.range(1.5, 3),
        ry: Math.max(2, q.ry * r.range(0.12, 0.3)),
        a: q.a * 0.45,
      });
    }
  };
  const grow = (p: Puff, depth: number, path: number) => {
    if (depth >= m.depth) {
      filaments(p, mulberry32(mix(seed, path, 77)));
      return;
    }
    const n = depth === 0 ? m.tower : m.detail;
    for (let i = 0; i < n; i++) {
      const r = mulberry32(mix(seed, path, i + 2, depth + 3));
      // Angles crowd the zenith on a flat-based cloud; without a base they go all round.
      const ang = m.flatBase
        ? -Math.PI / 2 + r.range(-1, 1) * r.range(0, 1) * Math.PI * 0.45
        : r.range(-Math.PI, Math.PI);
      const rx = p.rx * r.range(0.4, 0.62) * m.lobe;
      const ry = p.ry * r.range(0.45, 0.7) * m.lobe;
      const swell =
        1 +
        wobble *
          (0.6 + 0.4 * depth) *
          Math.sin(t * r.range(0.5, 1.2) + r.range(0, 6.3));
      const breath =
        0.5 + 0.5 * Math.sin(t * r.range(0.4, 0.9) + r.range(0, 6.3));
      const q: Puff = {
        x: sway(
          r,
          p.x + Math.cos(ang) * p.rx * r.range(0.5, 0.95),
          rx * wobble,
          depth,
        ),
        y: sway(
          r,
          p.y + Math.sin(ang) * p.ry * r.range(0.6, 1.05) * m.rise,
          ry * wobble * 0.8,
          depth,
        ),
        rx: rx * swell,
        ry: ry * swell,
        a:
          Math.min(1, p.a * r.range(0.9, 1.25)) *
          (1 - wobble * 4 * (0.4 + 0.6 * depth) * breath),
      };
      anvil(q, r);
      puffs.push(q);
      grow(q, depth + 1, mix(path, i + 11));
    }
  };
  for (let i = 0; i < m.body; i++) {
    const t0 = (i + 0.5) / m.body;
    const edge = 1 - Math.abs(t0 - 0.5) * 2;
    const r = mulberry32(mix(seed, i + 101));
    const p: Puff = {
      x: sway(r, cx + (t0 - 0.5) * 2 * span + r.range(-20, 20), 8 * wobble, 0),
      y: cy + r.range(-8, 12) + r.range(-H * 0.25, H * 0.25) * m.scatter,
      rx: r.range(56, 96) * (0.72 + 0.28 * edge) * m.size * m.stretch,
      ry: r.range(36, 54) * (0.72 + 0.28 * edge) * m.size,
      a: m.peak * r.range(0.7, 1),
    };
    puffs.push(p);
    grow(p, 0, mix(i + 101));
  }
  // Shear leans the whole cloud with height.
  if (m.shear) for (const q of puffs) q.x += (cy - q.y) * m.shear;
  // Fit: past a margin the set scales down about its centre and slides back inside.
  const pad = 0.05;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const q of puffs) {
    minX = Math.min(minX, q.x - q.rx);
    maxX = Math.max(maxX, q.x + q.rx);
    minY = Math.min(minY, q.y - q.ry);
    maxY = Math.max(maxY, q.y + q.ry);
  }
  const k = Math.min(
    1,
    (W * (1 - 2 * pad)) / (maxX - minX),
    (H * (1 - 2 * pad)) / (maxY - minY),
  );
  const bx = (minX + maxX) / 2;
  const by = (minY + maxY) / 2;
  const left = bx - (bx - minX) * k;
  const right = bx + (maxX - bx) * k;
  const upper = by - (by - minY) * k;
  const lower = by + (maxY - by) * k;
  const dx =
    left < W * pad
      ? W * pad - left
      : right > W * (1 - pad)
        ? W * (1 - pad) - right
        : 0;
  const dy =
    upper < H * pad
      ? H * pad - upper
      : lower > H * (1 - pad)
        ? H * (1 - pad) - lower
        : 0;
  for (const q of puffs) {
    q.x = bx + (q.x - bx) * k + dx;
    q.y = by + (q.y - by) * k + dy;
    q.rx *= k;
    q.ry *= k;
  }
  if (erodeAt) {
    const cell = W / PAINT_COLS;
    for (let i = puffs.length - 1; i >= 0; i--) {
      const q = puffs[i] as Puff;
      const e = erodeAt(q.x / W, q.y / H);
      if (e <= 0.02) continue;
      if (q.rx <= cell * 3.5 && e > 0.35) puffs.splice(i, 1);
      else q.a *= 1 - e * 0.6;
    }
  }
  return puffs;
}

/**
 * A seamless alpha-noise canvas: Perlin gradient noise summed over octaves,
 * each octave's lattice wrapping at the tile, mapped to alpha = k·n + b, so
 * `destination-in` with it multiplies a cloud's alpha by the texture.
 */
function noiseTile(
  seed: number,
  size: number,
  cells: number,
  octaves: number,
  amount: number,
) {
  const r = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = r.int(0, i);
    [p[i], p[j]] = [p[j] as number, p[i] as number];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255] as number;
  const grad = (h: number, x: number, y: number) => {
    switch (h & 7) {
      case 0:
        return x + y;
      case 1:
        return x - y;
      case 2:
        return -x + y;
      case 3:
        return -x - y;
      case 4:
        return x;
      case 5:
        return -x;
      case 6:
        return y;
      default:
        return -y;
    }
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  /** Perlin noise at (x, y), wrapping every `period` lattice cells. */
  const perlin = (x: number, y: number, period: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const x0 = xi % period;
    const y0 = yi % period;
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const h = (a: number, b: number) =>
      perm[(perm[a & 255] as number) + (b & 255)] as number;
    const u = fade(xf);
    const v = fade(yf);
    const n00 = grad(h(x0, y0), xf, yf);
    const n10 = grad(h(x1, y0), xf - 1, yf);
    const n01 = grad(h(x0, y1), xf, yf - 1);
    const n11 = grad(h(x1, y1), xf - 1, yf - 1);
    return (
      n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v
    );
  };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const img = ctx.createImageData(size, size);
  const px = img.data;
  const k = 0.6 + amount * 0.8;
  const b = 0.5 - amount * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let f = 0;
      let amp = 0.5;
      let period = cells;
      for (let o = 0; o < octaves; o++) {
        f += amp * perlin((x / size) * period, (y / size) * period, period);
        amp *= 0.5;
        period *= 2;
      }
      const n = 0.5 + f * 0.75;
      const i = (y * size + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = 255;
      px[i + 3] = Math.round(255 * Math.min(1, Math.max(0, k * n + b)));
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const tiles = new Map<string, HTMLCanvasElement>();
/** The grain and cores-and-gaps tiles, painted once per page per setting. */
function tile(
  kind: "grain" | "mid",
  amount: number,
  cells: number,
  octaves: number,
) {
  const key = `${kind}/${amount}/${cells}/${octaves}`;
  let t = tiles.get(key);
  if (!t) {
    t = noiseTile(kind === "grain" ? 77 : 78, 512, cells, octaves, amount);
    tiles.set(key, t);
  }
  return t;
}

const hex = (c: string) =>
  [1, 3, 5].map((i) => Number.parseInt(c.slice(i, i + 2), 16));
const rgb = (c: number[]) => `rgb(${c.map((v) => Math.round(v)).join(",")})`;

/** A hand edit to one of the day's clouds; anything left out keeps the day's value. */
export interface CloudEdit {
  /** A type name for the cloud. */
  name?: string;
  /** Percent of the sky's height. */
  top?: number;
  /** Percent of the sky's width. */
  width?: number;
  /** Vertical scale of the body. */
  height?: number;
  /** The silhouette's seed. */
  seed?: number;
  /** Knobs that differ from the sky's model. */
  model?: Partial<CloudModel>;
  paint?: PaintCells;
  hardness?: PaintHardness;
  /** How often it is drawn next to the others: 1 as often as any, 0 never. Left out is 1. */
  rarity?: number;
  /** The times of day it may show in. Left out is all of them. */
  phases?: SkyPhase[];
}

/** Everything about the clouds that can be set from outside the day's seed. */
export interface CloudSettings {
  /** Designs in the pool the sky draws its clouds from. */
  count: number;
  /** Fewest and most clouds in the sky at once, per time of day; the day picks a number between. A time left out shows `cloudsShown` of the pool. */
  inSky: Partial<Record<SkyPhase, [number, number]>>;
  /** The layer's base opacity. */
  opacity: number;
  /** Multiplier on the wind's pace. */
  speed: number;
  /** Distinct silhouettes; clouds past this number reuse one. */
  shapes: number;
  /** Seed of the first silhouette. */
  baseSeed: number;
  /** Knobs that differ from `CLOUD_MODEL`, for every cloud. */
  model: Partial<CloudModel>;
  /** Per-cloud edits, by cloud id. */
  edits: Record<number, CloudEdit>;
  /** Ids taken out of the sky. */
  removed: number[];
  /** Templates made in the panel, by name; one named after a recipe of `CLOUD_PRESETS` takes its place. */
  templates: Record<string, CloudPreset>;
  /** See `CLOUD_LIVE`. */
  variation: number;
  variationPeriod: number;
  interval: number;
}

export const CLOUD_SETTINGS: CloudSettings = {
  count: 3,
  inSky: {
    morning: [3, 11],
    noon: [2, 7],
    evening: [1, 6],
    sunset: [2, 6],
    dusk: [0, 2],
    night: [0, 0],
  },
  opacity: 0.95,
  speed: 1,
  shapes: 40,
  baseSeed: 21,
  model: {
    body: 10,
    tower: 0,
    depth: 0,
    size: 1.2,
    stretch: 4,
    spread: 1.6,
    scatter: 0.6,
    softness: 0.95,
    flatBase: 0,
    peak: 0.2,
    grain: 0.3,
    fade: 0.95,
    top: 0.3,
    cap: 0.6,
  },
  // The pool: three designs, in the slots after the ones taken out.
  edits: {
    11: {
      name: "Boreas's shoulder",
      seed: 620242,
      top: 4.5,
      width: 40,
      height: 1,
      model: {
        body: 5,
        tower: 3,
        depth: 3,
        size: 1,
        stretch: 1,
        spread: 1,
        scatter: 0,
        softness: 0.75,
        flatBase: 1,
        peak: 1,
        grain: 0.8,
        grainScale: 8,
        grainOctaves: 6,
        mid: 0.55,
        midScale: 8,
        midOctaves: 4,
        fade: 0.8,
        cap: 1,
      },
    },
    12: {
      name: "Thor's anvil",
      seed: 620242,
      top: -1.6,
      width: 40,
      height: 1,
      model: {
        body: 8,
        tower: 2,
        detail: 2,
        depth: 2,
        size: 1,
        stretch: 1.5,
        rise: 0.6,
        spread: 1.4,
        scatter: 0.3,
        softness: 0.55,
        flatBase: 1,
        peak: 0.5,
        grain: 0.8,
        grainScale: 12,
        grainOctaves: 6,
        mid: 0.7,
        midScale: 10,
        midOctaves: 4,
        fade: 0.62,
        top: 0.08,
        cap: 1,
      },
    },
    13: {
      name: "Iris's ribbon",
      seed: 34,
      top: 25.5,
      width: 62.2,
      height: 1,
      model: {
        body: 9,
        tower: 1,
        detail: 0,
        depth: 1,
        size: 1,
        stretch: 2.6,
        rise: 0.4,
        spread: 1.5,
        scatter: 0.15,
        softness: 0.5,
        flatBase: 1,
        peak: 0.36,
        grain: 0.8,
        grainScale: 9,
        grainOctaves: 6,
        mid: 0.8,
        midScale: 6,
        midOctaves: 4,
        fade: 0.75,
        top: 0.25,
        cap: 1,
      },
    },
  },
  removed: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  templates: {},
  variation: 1,
  variationPeriod: CLOUD_LIVE.variationPeriod,
  interval: 3000,
};

/** One cloud, ready to draw. */
export interface SkyCloud extends Cloud {
  /** Its slot in the day's sequence; edits follow it when another cloud is removed. */
  id: number;
  name: string;
  seed: number;
  /** Vertical scale of the body. */
  height: number;
  model: CloudModel;
  paint: PaintCells;
  hardness: PaintHardness;
  /** How often it is drawn next to the others; 0 never. */
  rarity: number;
  /** The times of day it may show in; null for all. */
  phases: SkyPhase[] | null;
  /** The design it is: its own id, or for a second showing of a design the id of that design. */
  design: number;
}

/** Ids from here up are second showings of a design, not designs. */
export const CLOUD_COPY = 100_000;
/** How far a cloud's height in the sky may move each time it enters, percent of the sky, either way. */
export const CLOUD_TOP_SHIFT = 4;

/** Fewest and most clouds a time of day shows at once. */
export function cloudRange(
  phase: SkyPhase,
  settings: CloudSettings = CLOUD_SETTINGS,
): [number, number] {
  const set = settings.inSky?.[phase];
  if (set) return [Math.min(set[0], set[1]), Math.max(set[0], set[1])];
  const all = Math.min(settings.count, cloudsShown(phase, settings.count));
  return [all, all];
}

/** How many clouds are in the sky at a time of day on a day: a number in that time's range, the same for everyone on the day. */
export function cloudsInSky(
  phase: SkyPhase,
  daySeed: number,
  settings: CloudSettings = CLOUD_SETTINGS,
): number {
  const [few, most] = cloudRange(phase, settings);
  if (most <= few) return few;
  const rng = mulberry32(mix(daySeed, 0x5107, SKY_PHASES.indexOf(phase)));
  return few + Math.floor(rng.next() * (most - few + 1));
}

/** Whether a cloud may be drawn at a time of day. */
export const cloudFits = (c: SkyCloud, phase: SkyPhase) =>
  c.rarity > 0 && (!c.phases || c.phases.includes(phase));

/**
 * Draws one cloud by rarity from those that fit the time of day; `roll` is a
 * random number from 0 to 1. A design already in the sky is passed over while
 * another is free, so one shows twice only when the pool is too small.
 */
export function drawCloud(
  from: readonly SkyCloud[],
  phase: SkyPhase,
  inSky: readonly SkyCloud[],
  roll: number,
): SkyCloud | null {
  const taken = new Set(inSky.map((c) => c.design));
  const fits = from.filter((c) => cloudFits(c, phase));
  const fresh = fits.filter((c) => !taken.has(c.design));
  const pool = fresh.length ? fresh : fits;
  let total = 0;
  for (const c of pool) total += c.rarity;
  if (total <= 0) return null;
  let at = roll * total;
  for (const c of pool) {
    at -= c.rarity;
    if (at <= 0) return c;
  }
  return pool[pool.length - 1] ?? null;
}

/**
 * The pool of cloud designs with the settings applied: removed ids skipped,
 * edits laid over the day's layout. With `spare`, designs are added a second
 * time wherever some time of day wants more clouds at once than it has designs
 * that fit it; each second showing has a path of its own and is mirrored.
 */
export function skyClouds(
  daySeed: number,
  settings: CloudSettings = CLOUD_SETTINGS,
  spare = false,
): SkyCloud[] {
  const removed = new Set(settings.removed);
  const out: SkyCloud[] = [];
  cloudLayout(daySeed, settings.count + removed.size).forEach((cloud, id) => {
    if (removed.has(id) || out.length >= settings.count) return;
    const edit = settings.edits[id] ?? {};
    const width = edit.width ?? cloud.width;
    out.push({
      ...cloud,
      id,
      name: edit.name ?? "",
      top: edit.top ?? cloud.top,
      width,
      blur: Math.max(0, (width - 38) * 0.07),
      seed:
        edit.seed ?? settings.baseSeed + (id % Math.max(1, settings.shapes)),
      height: edit.height ?? 1,
      model: { ...CLOUD_MODEL, ...settings.model, ...edit.model },
      paint: edit.paint ?? NO_CELLS,
      hardness: edit.hardness ?? NO_CELLS,
      rarity: edit.rarity ?? 1,
      phases: edit.phases ?? null,
      design: id,
    });
  });
  if (!spare) return out;
  // The designs that are ever drawn; the ones drawn most often come first as second showings.
  const drawn = out
    .filter((c) => c.rarity > 0)
    .sort((a, b) => b.rarity - a.rarity);
  const short = Math.max(
    0,
    ...SKY_PHASES.map((phase) => {
      const fits = drawn.filter((c) => cloudFits(c, phase)).length;
      return fits ? cloudRange(phase, settings)[1] - fits : 0;
    }),
  );
  if (short > 0) {
    cloudLayout(mix(daySeed, 0xc0b1), short).forEach((path, i) => {
      const of = drawn[i % drawn.length] as SkyCloud;
      out.push({
        ...of,
        id: CLOUD_COPY + i,
        // Its own crossing and height, so it is not seen as a twin.
        dur: path.dur,
        delay: path.delay,
        lift: path.lift,
        rot: path.rot,
        top: path.top,
        flip: -of.flip,
      });
    });
  }
  return out;
}

const NO_CELLS: PaintCells = {};

/** A painted field: its canvas, and its depth (0 to 1) at a point in canvas fractions. */
interface PaintField {
  canvas: HTMLCanvasElement;
  sample: (u: number, v: number) => number;
}

/**
 * The field for a cloud's painted cells of one sign: pooled cloud (`sign` 1)
 * or erosion (`sign` -1). Each cell is stamped as jittered blobs and blurred
 * into its neighbours, the cloud's own noise tiles shape the spread and the
 * rim, a soft threshold drops the low patches out, and the cells themselves
 * stay as a core so one painted cell always lands where it was put. A hard
 * brush keeps more of the core and less of the spread. Cells at -2 clear outright.
 */
function paintField(
  cells: PaintCells,
  hardness: PaintHardness,
  m: CloudModel,
  seed: number,
  sign: 1 | -1,
): PaintField | null {
  const picked = Object.entries(cells)
    .filter(([, v]) => (sign < 0 ? v < 0 : v > 0))
    .map(([key, v]) => {
      const [i = 0, j = 0] = key.split(",").map(Number);
      return {
        i,
        j,
        strength: Math.min(1, Math.abs(v)),
        hard: hardness[key] ?? PAINT_HARDNESS,
        clear: v <= -2,
      };
    });
  if (!picked.length) return null;
  const S = 4;
  const w = PAINT_COLS * S;
  const h = paintRows(m) * S;
  const make = () => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d") as CanvasRenderingContext2D] as const;
  };
  // Two layers per cell. The spread soaks outward and takes the noise; a soft
  // brush feeds it most. The core stays where it was painted; a hard brush
  // feeds it most and keeps it crisp.
  const [spread, sx] = make();
  const [core, cx] = make();
  for (const { i, j, strength, hard } of picked) {
    const r = mulberry32(mix(seed, i + 31, j + 57, sign + 3));
    const reach = 1.5 - hard;
    sx.globalAlpha = strength * Math.min(1, 1.4 - 1.2 * hard);
    cx.globalAlpha = strength * (0.4 + 0.6 * hard);
    for (let k = 0; k < 3; k++) {
      const x = (i + 0.5 + r.range(-0.6, 0.6)) * S;
      const y = (j + 0.5 + r.range(-0.6, 0.6)) * S;
      const rx = S * r.range(0.5, 1.4);
      const ry = S * r.range(0.5, 1.4);
      sx.beginPath();
      sx.ellipse(x, y, rx * reach, ry * reach, 0, 0, Math.PI * 2);
      sx.fill();
      cx.beginPath();
      cx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      cx.fill();
    }
  }
  const [field, fx] = make();
  fx.filter = `blur(${S * 1.3}px)`;
  fx.drawImage(spread, 0, 0);
  fx.filter = "none";
  fx.globalCompositeOperation = "destination-in";
  for (const [kind, amount, lattice, octaves, scale, ox, oy] of [
    ["mid", 0.8, m.midScale, m.midOctaves, 0.16, seed % 97, seed % 53],
    ["mid", 0.8, m.midScale, m.midOctaves, 0.3, seed % 89, seed % 71],
    ["grain", 0.6, m.grainScale, m.grainOctaves, 0.5, seed % 41, seed % 67],
  ] as const) {
    fx.save();
    fx.scale(scale, scale);
    fx.translate(ox, oy);
    fx.fillStyle = fx.createPattern(
      tile(kind, amount, lattice, octaves),
      "repeat",
    ) as CanvasPattern;
    fx.fillRect(-300, -300, w / scale + 600, h / scale + 600);
    fx.restore();
  }
  fx.globalCompositeOperation = "source-over";
  const img = fx.getImageData(0, 0, w, h);
  for (let i = 3; i < img.data.length; i += 4) {
    const a = Math.min(
      1,
      Math.max(0, ((img.data[i] as number) / 255 - 0.22) / 0.45),
    );
    img.data[i] = Math.round(255 * a * a * (3 - 2 * a));
  }
  fx.putImageData(img, 0, 0);
  const meanHard = picked.reduce((sum, c) => sum + c.hard, 0) / picked.length;
  fx.filter = `blur(${S * (0.7 - 0.5 * meanHard)}px)`;
  fx.drawImage(core, 0, 0);
  const cleared = picked.filter((c) => c.clear);
  if (cleared.length) {
    const [solid, hx] = make();
    for (const { i, j } of cleared)
      hx.fillRect((i - 0.35) * S, (j - 0.35) * S, S * 1.7, S * 1.7);
    fx.filter = `blur(${S * 0.5}px)`;
    for (let k = 0; k < 3; k++) fx.drawImage(solid, 0, 0);
  }
  fx.filter = "none";
  const d = fx.getImageData(0, 0, w, h).data;
  const sample = (u: number, v: number) => {
    const x = Math.min(w - 1, Math.max(0, Math.round(u * w)));
    const y = Math.min(h - 1, Math.max(0, Math.round(v * h)));
    return (d[(y * w + x) * 4 + 3] as number) / 255;
  };
  return { canvas: field, sample };
}

/** Paints one cloud, puff by puff, into its own canvas. */
export class CloudPainter {
  private readonly ctx: CanvasRenderingContext2D;
  /** The tint as last painted, easing toward the phase's. */
  tint: number[][] | undefined;
  /** When the next paint is due, in performance.now() ms. */
  nextAt = 0;
  /** Milliseconds the last paint took. */
  ms = 0;
  private fieldKey = "";
  private pool: PaintField | null = null;
  private erosion: PaintField | null = null;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly seed: number,
    width = CLOUD_LIVE.width,
  ) {
    canvas.width = width;
    canvas.height = width / 2;
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  /**
   * One paint: the puffs at `t` (radians of the variation cycle) as white radial
   * gradients, painted cells pooled in and eroded out, alpha multiplied by the
   * scrolling grain and mid tiles, the underside, top and sides faded, the cap
   * applied, then the tint composited in. The tint eases toward `target`
   * across paints over `tintEase` seconds.
   */
  paint(
    t: number,
    target: readonly [string, string],
    dtSec: number,
    m = CLOUD_MODEL,
    live = CLOUD_LIVE,
    cells: PaintCells = NO_CELLS,
    hardness: PaintHardness = NO_CELLS,
  ) {
    const started = performance.now();
    const ctx = this.ctx;
    const c = this.canvas;
    const height = Math.round(c.width / m.aspect);
    if (c.height !== height) c.height = height;
    const s = c.width / VIEW_W;
    const goal = [hex(target[0]), hex(target[1])];
    const k = Math.min(1, dtSec / live.tintEase);
    this.tint = this.tint
      ? this.tint.map((col, i) =>
          col.map((v, j) => v + ((goal[i]?.[j] ?? v) - v) * k),
        )
      : goal;
    const fieldKey = `${Object.entries(cells)
      .map(([key, v]) => `${key}${v}/${hardness[key] ?? ""}`)
      .sort()
      .join()}|${m.aspect}|${m.midScale}|${m.midOctaves}|${m.grainScale}|${m.grainOctaves}`;
    if (fieldKey !== this.fieldKey) {
      this.fieldKey = fieldKey;
      this.pool = paintField(cells, hardness, m, this.seed, 1);
      this.erosion = paintField(cells, hardness, m, this.seed, -1);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, c.width, c.height);
    const shoulder = 0.6 - 0.5 * m.softness;
    const shoulderAlpha = (0.85 - 0.33 * m.softness).toFixed(2);
    for (const q of cloudPuffs(
      this.seed,
      m,
      t,
      live.variation * 0.12,
      this.erosion?.sample,
    )) {
      ctx.setTransform(s, 0, 0, (s * q.ry) / q.rx, q.x * s, q.y * s);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, q.rx);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(shoulder, `rgba(255,255,255,${shoulderAlpha})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.globalAlpha = q.a;
      ctx.beginPath();
      ctx.arc(0, 0, q.rx, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.pool) {
      ctx.globalAlpha = 0.95;
      ctx.drawImage(this.pool.canvas, 0, 0, c.width, c.height);
    }
    ctx.globalAlpha = 1;
    if (this.erosion) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.drawImage(this.erosion.canvas, 0, 0, c.width, c.height);
    }
    ctx.globalCompositeOperation = "destination-in";
    for (const [kind, amount, lattice, octaves, speed] of [
      ["grain", m.grain, m.grainScale, m.grainOctaves, 3],
      ["mid", m.mid, m.midScale, m.midOctaves, 1.2],
    ] as const) {
      if (amount <= 0) continue;
      const off = (t * speed * 4) % 512;
      ctx.save();
      ctx.translate(-off, off * 0.3);
      ctx.fillStyle = ctx.createPattern(
        tile(kind, amount, lattice, octaves),
        "repeat",
      ) as CanvasPattern;
      ctx.fillRect(off, -off * 0.3, c.width, c.height);
      ctx.restore();
    }
    const down = ctx.createLinearGradient(0, 0, 0, c.height);
    down.addColorStop(0, "rgba(0,0,0,0)");
    down.addColorStop(m.top, "rgba(0,0,0,1)");
    down.addColorStop(m.fade, "rgba(0,0,0,1)");
    down.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = down;
    ctx.fillRect(0, 0, c.width, c.height);
    const across = ctx.createLinearGradient(0, 0, c.width, 0);
    across.addColorStop(0, "rgba(0,0,0,0)");
    across.addColorStop(0.12, "rgba(0,0,0,1)");
    across.addColorStop(0.88, "rgba(0,0,0,1)");
    across.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = `rgba(0,0,0,${m.cap})`;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "source-in";
    const tg = ctx.createLinearGradient(0, 0, 0, c.height);
    tg.addColorStop(0.35, rgb(this.tint[0] as number[]));
    tg.addColorStop(1, rgb(this.tint[1] as number[]));
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "source-over";
    this.ms = performance.now() - started;
  }
}
