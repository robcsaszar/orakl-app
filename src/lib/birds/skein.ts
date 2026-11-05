import { Crossing } from "./crossing";
import { basis, type EventOptions, type SkyEvent } from "./event";
import { easeFlap, Flock } from "./flock";
import { eventLabel, type ModifierId } from "./modifiers";
import type { Rng } from "./rng";
import { SPECIES } from "./species";
import type { View } from "./view";

const SLACK = 4;

/**
 * A migrating line of geese. The leader rides a `Crossing`; every other bird
 * holds a slot on one of two trailing arms with a spring so the line breathes
 * and lags. The arms are ragged the way real skeins are: uneven lengths (a J
 * more often than a V), spacing that varies bird to bird, a slow wander in
 * the arm's angle, kinks that turn a long arm into a W, and a straggler or
 * two trailing the ends. Every so often the leader drops to the back of an
 * arm and the next bird takes the point.
 *
 * The sky's wind sets the line's ground track: a tailwind makes for a fast,
 * gliding crossing, a headwind a slow low one with the wings always working.
 *
 * Modifiers: `echelon` (one arm), `low-pass` (near), `landing` (descends out
 * of the bottom).
 */
export class Skein implements SkyEvent {
  readonly kind = "skein";
  readonly flock: Flock;
  readonly flocks: readonly Flock[];
  readonly maxLife: number;
  readonly mods: readonly ModifierId[];
  readonly label: string;
  done = false;

  private t = 0;
  private readonly path: Crossing;
  private readonly rng: Rng;
  private leader = 0;
  private readonly armL: number[] = [];
  private readonly armR: number[] = [];
  /** Slot geometry per arm and rank, in the leader's frame. */
  private readonly geoL: { back: number[]; side: number[]; drop: number[] };
  private readonly geoR: { back: number[]; side: number[]; drop: number[] };
  private rotateIn: number;
  /** Per-bird slot offsets in the leader's frame: behind, to the right, below. */
  private readonly slotBack: Float32Array;
  private readonly slotSide: Float32Array;
  private readonly slotDrop: Float32Array;
  private readonly breath: Float32Array;
  private readonly glideLeft: Float32Array;
  private readonly lp = new Float32Array(3);
  private readonly lv = new Float32Array(3);
  private readonly b = new Float32Array(9);
  private readonly maxSpeed: number;
  private readonly glideChance: number;
  private readonly wind: [number, number];
  /** 1 right after a bird gives up the point; it peels out and slides back. */
  private readonly peel: Float32Array;

  constructor(view: View, rng: Rng, o: EventOptions) {
    const sp = SPECIES.goose;
    const has = (m: ModifierId) => o.mods.includes(m);
    const count = o.count;
    this.rng = rng;
    this.mods = o.mods;
    this.label = eventLabel("skein", o.mods);
    this.flock = new Flock(count, sp);
    this.flocks = [this.flock];
    this.wind = o.wind;
    const dir = o.dir ?? rng.sign();
    // Along-track wind: positive is a tailwind. Ground speed follows it,
    // gliding comes easy with it and never against it.
    const along = dir * o.wind[0];
    const speed = Math.max(2.5, sp.speed * o.tune.skein.speed + along * 0.6);
    const headwind = Math.max(0, -along) / 3;
    const band: [number, number] = [
      Math.min(0.8, o.tune.skein.band[0] + 0.15 * headwind),
      Math.min(0.85, o.tune.skein.band[1] + 0.15 * headwind),
    ];
    this.glideChance = Math.max(0, Math.min(0.14, 0.04 + along * 0.03));
    let depth = o.depth;
    if (has("low-pass")) depth = [14, 22];
    this.path = new Crossing(view, rng, {
      depth,
      speed,
      band,
      // Landing: the line sinks below the view before it reaches the far side.
      bandEnd: has("landing") ? [1.1, 1.25] : undefined,
      wobble: 3,
      // The leader starts at the edge; the line emerges behind it.
      margin: 4,
      exitMargin: count * sp.span * 1.4 + 8,
      dir,
    });
    this.maxLife = this.path.duration * 1.8 + 30;
    this.maxSpeed = speed * 1.7;
    this.rotateIn = rng.range(8, 16);
    this.slotBack = new Float32Array(count);
    this.slotSide = new Float32Array(count);
    this.slotDrop = new Float32Array(count);
    this.breath = new Float32Array(count);
    this.glideLeft = new Float32Array(count);
    this.peel = new Float32Array(count);
    for (let i = 0; i < count; i++) this.breath[i] = rng.range(0, Math.PI * 2);
    this.flock.vary(rng);

    // Uneven arms: the longer one takes 50–70 % of the followers; an echelon
    // puts everyone on one arm.
    const followers = count - 1;
    const longCount = has("echelon")
      ? followers
      : Math.round(followers * rng.range(0.5, 0.7));
    const longArm = rng.sign() > 0 ? this.armL : this.armR;
    const shortArm = longArm === this.armL ? this.armR : this.armL;
    for (let i = 1; i < count; i++) {
      (longArm.length < longCount ? longArm : shortArm).push(i);
    }
    this.geoL = this.armGeometry(this.armL.length, -1);
    this.geoR = this.armGeometry(this.armR.length, 1);
    this.refreshSlots();

    this.path.posAt(0, this.lp);
    this.path.velAt(0, this.lv);
    basis(this.lv[0], this.lv[1], this.lv[2], this.b);
    const lp = this.lp;
    const lv = this.lv;
    const b = this.b;
    for (let i = 0; i < count; i++) {
      const back = this.slotBack[i];
      const side = this.slotSide[i];
      const drop = this.slotDrop[i];
      this.flock.place(
        i,
        lp[0] - b[0] * back + b[3] * side - b[6] * drop,
        lp[1] - b[1] * back + b[4] * side - b[7] * drop,
        lp[2] - b[2] * back + b[5] * side - b[8] * drop,
        lv[0],
        lv[1],
        lv[2],
      );
      this.flock.phase[i] = rng.range(0, Math.PI * 2);
    }
  }

  /**
   * Lays out one arm as a random walk behind the leader: the angle off the
   * flight line wanders about a base of ~35°, spacing varies per bird, a
   * long arm may bend back toward the flight line once for a few birds (a
   * W) without ever crossing it, and the last couple of birds hang back as
   * stragglers.
   */
  private armGeometry(
    n: number,
    sideSign: number,
  ): { back: number[]; side: number[]; drop: number[] } {
    const rng = this.rng;
    const span = this.flock.species.span;
    const step = span * 1.4;
    const base = rng.range(0.55, 0.75);
    let angle = base;
    let sign = sideSign;
    let back = 0;
    let side = 0;
    // About one long arm in three bends gently back toward the flight line
    // for a few birds, well down the arm, then heads out again.
    const kinkAt = n > 20 && rng.chance(0.35) ? rng.int(10, n - 8) : -1;
    let kinkLeft = 0;
    const geo = {
      back: [] as number[],
      side: [] as number[],
      drop: [] as number[],
    };
    for (let r = 0; r < n; r++) {
      angle += rng.range(-0.09, 0.09) - (angle - base) * 0.15;
      if (r === kinkAt) {
        kinkLeft = rng.int(5, 9);
        sign = -sideSign;
      } else if (
        kinkLeft > 0 &&
        (--kinkLeft === 0 || Math.abs(side) < 3 * span)
      ) {
        kinkLeft = 0;
        sign = sideSign;
      }
      const straggler = r >= n - 2 && n > 4 && rng.chance(0.5);
      const s = step * rng.range(0.8, 1.3) * (straggler ? 1.9 : 1);
      // The bend back is shallower than the arm's own angle.
      const a = kinkLeft > 0 ? angle * 0.5 : angle;
      back += s * Math.cos(a);
      side += sign * s * Math.sin(a);
      geo.back.push(back);
      geo.side.push(side + rng.range(-0.3, 0.3) * span);
      geo.drop.push(back * 0.03 + rng.range(-0.15, 0.15) * span);
    }
    return geo;
  }

  private refreshSlots(): void {
    this.slotBack[this.leader] = 0;
    this.slotSide[this.leader] = 0;
    this.slotDrop[this.leader] = 0;
    for (let r = 0; r < this.armL.length; r++) {
      const i = this.armL[r];
      this.slotBack[i] = this.geoL.back[r];
      this.slotSide[i] = this.geoL.side[r];
      this.slotDrop[i] = this.geoL.drop[r];
    }
    for (let r = 0; r < this.armR.length; r++) {
      const i = this.armR[r];
      this.slotBack[i] = this.geoR.back[r];
      this.slotSide[i] = this.geoR.side[r];
      this.slotDrop[i] = this.geoR.drop[r];
    }
  }

  private rotateLeader(): void {
    const arm = this.armL.length >= this.armR.length ? this.armL : this.armR;
    if (arm.length === 0) return;
    const next = arm.shift() as number;
    arm.push(this.leader);
    // The old leader peels outward and glides back down the arm to its slot.
    this.peel[this.leader] = 1;
    this.glideLeft[this.leader] = 2.5;
    this.leader = next;
    this.refreshSlots();
  }

  /** A skein is always on its way out; nothing to change. */
  retire(): void {}

  update(dt: number): void {
    this.t += dt;
    this.rotateIn -= dt;
    if (this.rotateIn <= 0) {
      this.rotateLeader();
      this.rotateIn = this.rng.range(9, 18);
    }
    const f = this.flock;
    const lp = this.lp;
    const lv = this.lv;
    const b = this.b;
    const rng = this.rng;
    this.path.posAt(this.t, lp);
    this.path.velAt(this.t, lv);
    // The line crabs on the wind: heading holds, the track drifts.
    lp[0] += this.wind[0] * this.t;
    lp[2] += this.wind[1] * this.t;
    basis(lv[0], lv[1], lv[2], b);
    const span = f.species.span;
    let allPassed = true;
    for (let i = 0; i < f.n; i++) {
      const br = Math.sin(this.t * 0.5 + this.breath[i]) * 0.2 * span;
      const bu = Math.sin(this.t * 0.37 + this.breath[i] * 1.7) * 0.12 * span;
      const peel = this.peel[i];
      if (peel > 0) this.peel[i] = Math.max(0, peel - dt / 3);
      const out = Math.sign(this.slotSide[i] || 1) * 1.6 * span * peel;
      const back = this.slotBack[i];
      const side = this.slotSide[i] + br + out;
      const drop = this.slotDrop[i] - bu - 0.5 * span * peel;
      const tx = lp[0] - b[0] * back + b[3] * side - b[6] * drop;
      const ty = lp[1] - b[1] * back + b[4] * side - b[7] * drop;
      const tz = lp[2] - b[2] * back + b[5] * side - b[8] * drop;
      // Desired velocity: the leader's plus a pull toward the slot.
      let dx = lv[0] + (tx - f.px[i]) * 1.2;
      let dy = lv[1] + (ty - f.py[i]) * 1.2;
      let dz = lv[2] + (tz - f.pz[i]) * 1.2;
      const ds = Math.hypot(dx, dy, dz);
      if (ds > this.maxSpeed) {
        const k = this.maxSpeed / ds;
        dx *= k;
        dy *= k;
        dz *= k;
      }
      f.ax[i] += (dx - f.vx[i]) * 2.5;
      f.ay[i] += (dy - f.vy[i]) * 2.5;
      f.az[i] += (dz - f.vz[i]) * 2.5;

      // Brief glides break up the constant beat.
      if (this.glideLeft[i] > 0) this.glideLeft[i] -= dt;
      else if (rng.chance(this.glideChance * f.habit[i] * dt)) {
        this.glideLeft[i] = rng.range(1, 2.5);
      }
      easeFlap(f, i, this.glideLeft[i] > 0 ? 0 : 1, dt);

      f.integrate(i, dt, f.species.speed * 0.5, this.maxSpeed);
      if (!this.path.passed(f.px[i] - this.wind[0] * this.t, SLACK)) {
        allPassed = false;
      }
    }
    if (allPassed) this.done = true;
  }
}
