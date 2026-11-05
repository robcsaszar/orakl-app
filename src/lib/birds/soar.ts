import { type EventOptions, type SkyEvent, UP_Y, UP_Z } from "./event";
import { easeFlap, Flock } from "./flock";
import { E2_Y, E2_Z, orbitHeading, planeW, seekHeading, steer } from "./glider";
import { eventLabel, type ModifierId } from "./modifiers";
import type { Rng } from "./rng";
import { SPECIES } from "./species";
import { halfWidthAt, type View, worldYAt, Z_NEAR } from "./view";

const MAX_TURN = 0.75;
const WIDE = 28;
const FEED_FOR = 30;
/** Where unarrived gulls wait: behind the camera, never drawn. */
const PARKED_Z = -100;

type State = 0 | 1 | 2 | 3; // waiting, circling (or commuting), leaving, gone

/**
 * Gulls over a feeding spot. One by one they arrive from the sides, take a
 * wide circle over the spot at the bottom of the view and tighten it while
 * staying high. Once the last one is in they feed for a while, then drift
 * off one at a time, each in its own direction, as the food runs out.
 *
 * Modifiers: `frenzy` (more birds, tighter, busier wings), `loafing` (wide,
 * lazy, hardly a flap), `squabble` (one gull chases another through the
 * ring), `commute` (no ring at all: a loose line crossing the view, roost to
 * feeding ground).
 */
export class Soar implements SkyEvent {
  readonly kind = "soar";
  flock: Flock;
  flocks: readonly Flock[];
  readonly maxLife: number;
  readonly mods: readonly ModifierId[];
  readonly label: string;
  done = false;

  private t = 0;
  private readonly rng: Rng;
  private readonly view: View;
  private cu: number;
  private cw: number;
  private readonly wind: [number, number];
  /** How many gulls this event wants up; the lobby can change it. */
  private wanted: number;
  private readonly depth: number;
  private readonly commute: boolean;
  private readonly commuteDir: number;
  private readonly tight: [number, number];
  private readonly glide: [number, number];
  private readonly speedK: number;
  private readonly chaser: number;
  private readonly chased: number;
  private dodgeIn = 3;
  private arriveAt: Float32Array;
  private leaveAt: Float32Array;
  private state: Uint8Array;
  private heading: Float32Array;
  private turn: Float32Array;
  private speed: Float32Array;
  private radius: Float32Array;
  private sense: Float32Array;
  private bob: Float32Array;
  private exitU: Float32Array;
  private exitW: Float32Array;
  private flapLeft: Float32Array;
  private glideLeft: Float32Array;

  constructor(view: View, rng: Rng, o: EventOptions) {
    const sp = SPECIES.gull;
    const has = (m: ModifierId) => o.mods.includes(m);
    const count = o.count;
    this.rng = rng;
    this.view = view;
    this.mods = o.mods;
    this.label = eventLabel("soar", o.mods);
    this.flock = new Flock(count, sp);
    this.flock.vary(rng);
    this.flocks = [this.flock];
    this.wanted = count;
    this.wind = o.wind;
    const z = rng.range(o.depth[0], o.depth[1]);
    this.depth = z;
    this.commute = has("commute");
    this.commuteDir = o.dir ?? rng.sign();
    this.tight = o.tune.soar.radius;
    this.glide = o.tune.soar.glide;
    this.speedK = 1;
    if (has("frenzy")) {
      this.tight = [this.tight[0] * 0.7, this.tight[1] * 0.7];
      this.glide = [2, 5];
      this.speedK = 1.1;
    }
    if (has("loafing")) {
      this.tight = [18, 24];
      this.glide = [15, 30];
      this.speedK = 0.85;
    }
    if (has("squabble") && count >= 3) {
      this.chased = 0;
      this.chaser = 1;
    } else {
      this.chased = -1;
      this.chaser = -1;
    }
    // The imagined food sits low in the view; the ring is centred over it.
    this.cu = rng.range(-0.15, 0.15) * halfWidthAt(view, z);
    this.cw = planeW(worldYAt(view, z, rng.range(0.6, 0.72)), z);
    this.arriveAt = new Float32Array(count);
    this.leaveAt = new Float32Array(count);
    this.state = new Uint8Array(count);
    this.heading = new Float32Array(count);
    this.turn = new Float32Array(count);
    this.speed = new Float32Array(count);
    this.radius = new Float32Array(count);
    this.sense = new Float32Array(count);
    this.bob = new Float32Array(count);
    this.exitU = new Float32Array(count);
    this.exitW = new Float32Array(count);
    this.flapLeft = new Float32Array(count);
    this.glideLeft = new Float32Array(count);
    let at = 0;
    for (let i = 0; i < count; i++) {
      at += i === 0 ? rng.range(0, 1) : rng.range(0.6, 2.4);
      this.arriveAt[i] = at;
      this.speed[i] = sp.speed * rng.range(0.85, 1.1) * this.speedK;
      this.radius[i] = WIDE * rng.range(0.85, 1.15);
      this.sense[i] = rng.sign();
      this.bob[i] = rng.range(0, Math.PI * 2);
      this.glideLeft[i] = rng.range(0, this.glide[1] * 0.5);
      this.flock.flap[i] = 0;
      this.flock.phase[i] = rng.range(0, Math.PI * 2);
      this.flock.place(i, 0, 0, PARKED_Z, 0, 0, 0);
    }
    const lastIn = at;
    for (let i = 0; i < count; i++) {
      this.leaveAt[i] = this.commute
        ? Number.POSITIVE_INFINITY
        : lastIn + FEED_FOR + rng.range(0, 14);
    }
    this.maxLife = lastIn + FEED_FOR + 14 + 60;
  }

  private arrive(i: number): void {
    const rng = this.rng;
    const hw = halfWidthAt(this.view, this.depth);
    const side = this.commute ? -this.commuteDir : rng.sign();
    // Enter high, from one side, already pointed at the ring (or, on a
    // commute, at a point past the far side).
    const y = worldYAt(this.view, this.depth, rng.range(0.1, 0.4));
    const u = side * (hw + 6);
    const jitter = rng.range(-4, 4);
    const w = planeW(y, this.depth) + jitter;
    if (this.commute) {
      this.exitU[i] = -side * (hw + 40);
      this.exitW[i] = w + rng.range(-10, 10);
      this.heading[i] = seekHeading(u, w, this.exitU[i], this.exitW[i]);
    } else {
      this.heading[i] = seekHeading(u, w, this.cu, this.cw);
    }
    const v = this.speed[i];
    const h = this.heading[i];
    this.flock.place(
      i,
      u,
      y + jitter * E2_Y,
      this.depth + jitter * E2_Z,
      v * Math.cos(h),
      v * Math.sin(h) * E2_Y,
      v * Math.sin(h) * E2_Z,
    );
    this.state[i] = this.commute ? 2 : 1;
  }

  private leave(i: number): void {
    // Pick a far point in a random direction; each gull goes its own way.
    const a = this.rng.range(0, Math.PI * 2);
    this.exitU[i] = this.cu + Math.cos(a) * 400;
    this.exitW[i] = this.cw + Math.sin(a) * 400;
    this.state[i] = 2;
  }

  private gone(i: number): boolean {
    const f = this.flock;
    const z = f.pz[i];
    if (z < Z_NEAR) return true;
    const hw = halfWidthAt(this.view, z) + 10;
    const hh = worldYAt(this.view, z, 0) + 10;
    return Math.abs(f.px[i]) > hw || Math.abs(f.py[i]) > hh;
  }

  /**
   * The lobby's head count: more gulls come in one by one, surplus ones
   * leave. Grows the flock when asked for more than it was built with.
   */
  setWanted(n: number): void {
    const want = Math.max(1, Math.min(60, Math.round(n)));
    if (want > this.flock.n) this.grow(want);
    if (want > this.wanted) {
      let at = this.t;
      for (let i = this.wanted; i < want; i++) {
        at += this.rng.range(0.6, 2.4);
        this.arriveAt[i] = at;
        this.state[i] = 0;
        this.leaveAt[i] = Number.POSITIVE_INFINITY;
      }
    } else if (want < this.wanted) {
      for (let i = want; i < this.wanted; i++) {
        if (this.state[i] === 0) this.state[i] = 3;
        else if (this.state[i] === 1)
          this.leaveAt[i] = this.t + this.rng.range(0, 3);
      }
    }
    this.wanted = want;
  }

  /** Re-allocates every per-gull array for `n` birds, keeping the ones up. */
  private grow(n: number): void {
    const old = this.flock;
    const f = new Flock(n, old.species);
    f.vary(this.rng);
    for (let i = 0; i < old.n; i++) {
      f.place(
        i,
        old.px[i],
        old.py[i],
        old.pz[i],
        old.vx[i],
        old.vy[i],
        old.vz[i],
      );
      f.phase[i] = old.phase[i];
      f.flap[i] = old.flap[i];
      f.roll[i] = old.roll[i];
      f.size[i] = old.size[i];
      f.tempo[i] = old.tempo[i];
      f.habit[i] = old.habit[i];
    }
    for (let i = old.n; i < n; i++) {
      f.place(i, 0, 0, PARKED_Z, 0, 0, 0);
      f.flap[i] = 0;
      f.phase[i] = this.rng.range(0, Math.PI * 2);
    }
    const copy = (a: Float32Array, fill: number) => {
      const b = new Float32Array(n).fill(fill);
      b.set(a.subarray(0, Math.min(a.length, n)));
      return b;
    };
    const sp = this.flock.species;
    this.arriveAt = copy(this.arriveAt, Number.POSITIVE_INFINITY);
    this.leaveAt = copy(this.leaveAt, Number.POSITIVE_INFINITY);
    this.speed = copy(this.speed, sp.speed);
    this.heading = copy(this.heading, 0);
    this.turn = copy(this.turn, 0);
    this.radius = copy(this.radius, WIDE);
    this.sense = copy(this.sense, 1);
    this.bob = copy(this.bob, 0);
    this.exitU = copy(this.exitU, 0);
    this.exitW = copy(this.exitW, 0);
    this.flapLeft = copy(this.flapLeft, 0);
    this.glideLeft = copy(this.glideLeft, 0);
    const st = new Uint8Array(n);
    st.set(this.state.subarray(0, Math.min(this.state.length, n)));
    this.state = st;
    for (let i = old.n; i < n; i++) {
      this.speed[i] = sp.speed * this.rng.range(0.85, 1.1) * this.speedK;
      this.sense[i] = this.rng.sign();
      this.bob[i] = this.rng.range(0, Math.PI * 2);
    }
    this.flock = f;
    this.flocks = [f];
  }

  /** Food's gone: whoever is here leaves over the next few seconds, the rest never come. */
  retire(): void {
    for (let i = 0; i < this.flock.n; i++) {
      if (this.state[i] === 0) this.state[i] = 3;
      else if (this.state[i] === 1) {
        this.leaveAt[i] = this.t + this.rng.range(0, 4);
      }
    }
  }

  update(dt: number): void {
    this.t += dt;
    const f = this.flock;
    const rng = this.rng;
    this.dodgeIn -= dt;
    // The feeding spot stays; the air over it moves, so every gull drifts.
    const wx = this.wind[0] * dt;
    const wz = this.wind[1] * dt;
    let left = 0;
    for (let i = 0; i < f.n; i++) {
      const st = this.state[i] as State;
      if (st === 3) {
        left++;
        continue;
      }
      if (st === 0) {
        if (this.t < this.arriveAt[i]) continue;
        this.arrive(i);
      } else if (st === 1 && this.t >= this.leaveAt[i]) {
        this.leave(i);
      }

      const u = f.px[i];
      const w = planeW(f.py[i], f.pz[i]);
      let desired: number;
      if (this.state[i] === 2) {
        desired = seekHeading(u, w, this.exitU[i], this.exitW[i]);
        if (this.gone(i)) {
          this.state[i] = 3;
          continue;
        }
      } else if (i === this.chaser && this.state[this.chased] === 1) {
        // Squabble: the chaser dogs the chased bird's tail.
        const j = this.chased;
        desired = seekHeading(u, w, f.px[j], planeW(f.py[j], f.pz[j]));
      } else {
        // Close the circle over the food, keeping each gull's own radius.
        const tight =
          this.tight[0] +
          ((i * 7) % Math.max(1, this.tight[1] - this.tight[0]));
        this.radius[i] += (tight - this.radius[i]) * Math.min(1, 0.06 * dt);
        if (i === this.chased && this.dodgeIn <= 0) {
          // The chased one jinks the other way now and then.
          this.sense[i] = -this.sense[i];
          this.dodgeIn = rng.range(2, 5);
        }
        desired = orbitHeading(
          u,
          w,
          this.cu,
          this.cw,
          this.radius[i],
          this.sense[i],
        );
      }
      const maxTurn =
        i === this.chased || i === this.chaser ? MAX_TURN * 1.5 : MAX_TURN;
      this.turn[i] = steer(this.heading[i], desired, this.turn[i], maxTurn, dt);
      this.heading[i] += this.turn[i] * dt;
      const h = this.heading[i];
      const v = this.speed[i];
      // Slow vertical sway on top of the planar flight.
      const dy = Math.cos(this.t * 0.35 + this.bob[i]) * 0.2 * dt;
      f.follow(
        i,
        u + v * Math.cos(h) * dt + wx,
        f.py[i] + v * Math.sin(h) * E2_Y * dt + dy * UP_Y,
        f.pz[i] + v * Math.sin(h) * E2_Z * dt + dy * UP_Z + wz,
        dt,
      );

      if (this.flapLeft[i] > 0) {
        this.flapLeft[i] -= dt;
        easeFlap(f, i, 1, dt);
      } else {
        this.glideLeft[i] -= dt;
        if (this.glideLeft[i] <= 0) {
          this.flapLeft[i] = rng.range(1.2, 3);
          this.glideLeft[i] =
            rng.range(this.glide[0], this.glide[1]) * f.habit[i];
        }
        easeFlap(f, i, 0, dt);
      }
    }
    if (left === f.n) this.done = true;
  }
}
