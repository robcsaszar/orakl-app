import type { Rng } from "./rng";
import { halfWidthAt, type View, worldYAt } from "./view";

export interface CrossingOptions {
  /** Depth range, metres. */
  depth: [number, number];
  /** Along-path speed, metres per second. */
  speed: number;
  /** Screen rows the path may start and end on, as fractions from the top. */
  band: [number, number];
  /** Rows the path ends on, when different from `band` (a landing sinks below 1). */
  bandEnd?: [number, number];
  /** Sideways and vertical wobble amplitude, metres. */
  wobble: number;
  /** Extra distance past the frustum edge where the path starts. */
  margin: number;
  /** Extra distance past the far edge where it ends; defaults to `margin`. */
  exitMargin?: number;
  /** Force a direction: +1 left to right, -1 right to left; random when omitted. */
  dir?: number;
}

/**
 * A parametric path from one off-screen side of the frustum to the other at a
 * chosen depth, with a slow sinusoidal wobble. Events use it as the track for a
 * formation leader, a murmuration's attractor or a soaring group's centre.
 */
export class Crossing {
  /** +1 = left to right, -1 = right to left. */
  readonly dir: number;
  readonly speed: number;
  readonly depth: number;
  /** Seconds to cover the straight segment. */
  readonly duration: number;
  private readonly sx: number;
  private readonly sy: number;
  private readonly sz: number;
  private readonly dx: number;
  private readonly dy: number;
  private readonly dz: number;
  private readonly wobble: number;
  private readonly w1: number;
  private readonly w2: number;
  private readonly exitX: number;
  private readonly p0 = new Float32Array(3);
  private readonly p1 = new Float32Array(3);

  constructor(view: View, rng: Rng, o: CrossingOptions) {
    this.dir = o.dir ?? rng.sign();
    this.speed = o.speed;
    this.depth = rng.range(o.depth[0], o.depth[1]);
    const z1 = this.depth * rng.range(0.85, 1.15);
    const hw0 = halfWidthAt(view, this.depth) + o.margin;
    const hw1 = halfWidthAt(view, z1) + (o.exitMargin ?? o.margin);
    this.sx = -this.dir * hw0;
    this.sy = worldYAt(view, this.depth, rng.range(o.band[0], o.band[1]));
    this.sz = this.depth;
    const ex = this.dir * hw1;
    const endBand = o.bandEnd ?? o.band;
    const ey = worldYAt(view, z1, rng.range(endBand[0], endBand[1]));
    const len = Math.hypot(ex - this.sx, ey - this.sy, z1 - this.sz);
    this.dx = (ex - this.sx) / len;
    this.dy = (ey - this.sy) / len;
    this.dz = (z1 - this.sz) / len;
    this.duration = len / o.speed;
    this.exitX = Math.abs(ex);
    this.wobble = o.wobble;
    this.w1 = rng.range(0, Math.PI * 2);
    this.w2 = rng.range(0, Math.PI * 2);
  }

  /** Position at time t, written as x, y, z into `out`. */
  posAt(t: number, out: Float32Array | number[]): void {
    const s = t * this.speed;
    const a = this.wobble;
    out[0] = this.sx + this.dx * s;
    out[1] = this.sy + this.dy * s + a * 0.5 * Math.sin(t * 0.21 + this.w1);
    out[2] = this.sz + this.dz * s + a * Math.sin(t * 0.13 + this.w2);
  }

  /** Velocity at time t (finite difference), written as x, y, z into `out`. */
  velAt(t: number, out: Float32Array | number[]): void {
    const e = 0.05;
    this.posAt(t, this.p0);
    this.posAt(t + e, this.p1);
    out[0] = (this.p1[0] - this.p0[0]) / e;
    out[1] = (this.p1[1] - this.p0[1]) / e;
    out[2] = (this.p1[2] - this.p0[2]) / e;
  }

  /** True once x lies past the exit edge in the direction of travel. */
  passed(x: number, slack = 0): boolean {
    return this.dir > 0 ? x > this.exitX + slack : x < -this.exitX - slack;
  }
}
