import {
  anyVisible,
  type EventOptions,
  type SkyEvent,
  UP_Y,
  UP_Z,
} from "./event";
import { easeFlap, Flock } from "./flock";
import {
  E2_Y,
  E2_Z,
  orbitHeading,
  planeW,
  seekHeading,
  steer,
  wrapAngle,
} from "./glider";
import { eventLabel, type ModifierId } from "./modifiers";
import { Murmuration } from "./murmuration";
import type { Rng } from "./rng";
import { SPECIES } from "./species";
import { halfWidthAt, type View, worldYAt } from "./view";

type Stage = "arrive" | "circle" | "stoop" | "pullout" | "leave";

const MAX_TURN = 0.45;
const STOOP_SPEED = 18;
const STOOP_ACCEL = 12;
const STOOP_TURN = 2.0;
const CRUISE = 6;
/** Reach of the stoop's flash expansion, metres: about a second of closing. */
const BURST_RANGE = 14;

/**
 * Raptors on a thermal. Half the time the lead bird is only passing: glides
 * in, circles high in the view, peels off and glides out. The other half it
 * hunts: a small flock of starlings mills low while it circles patiently
 * above, then it tucks its wings and stoops through them at speed; the
 * flock scatters, the raptor pulls out and leaves, and the starlings regroup
 * and move on.
 *
 * Modifiers: `pair` (two share the thermal), `kettle` (five or six circle
 * it together, no hunt), `mobbed` (crows harass it until it leaves early),
 * `failed-stoop` (it breaks off the dive early and the prey is unharmed),
 * `ambush` (no circling: it drops in from above the top edge already in
 * the stoop).
 */
export class Raptor implements SkyEvent {
  readonly kind = "raptor";
  readonly flock: Flock;
  readonly flocks: readonly Flock[];
  readonly maxLife: number;
  readonly mods: readonly ModifierId[];
  readonly label: string;
  done = false;

  private t = 0;
  private stage: Stage = "arrive";
  private readonly rng: Rng;
  private readonly view: View;
  private readonly dir: number;
  private readonly exitX: number;
  private readonly speed: number;
  private readonly sense: number;
  private circleFor: number;
  private readonly failed: boolean;
  private cu: number;
  private cw: number;
  private readonly windU: number;
  private readonly windW: number;
  // Per raptor: heading, turn rate, ring radius, height offset, exit delay.
  private readonly heading: Float32Array;
  private readonly turn: Float32Array;
  private readonly radius: Float32Array;
  private readonly lift: Float32Array;
  private readonly leaveAfter: Float32Array;
  private readonly leaving: Uint8Array;
  private flapLeft = 2;
  private glideLeft = 0;
  // 3D velocity of the lead bird for the stoop and pull-out.
  private vx = 0;
  private vy = 0;
  private vz = 0;
  private spd = 0;
  private readonly aim = new Float32Array(3);
  /** Set once the dive points at the aim; passing it then ends the stoop. */
  private locked = false;

  /** The hunted flock: a real murmuration milling about a station. */
  private readonly prey: Murmuration | null;
  private preyLeaveIn = Number.POSITIVE_INFINITY;
  private preyLeaving = false;

  private readonly crows: Flock | null;
  private readonly crowHeading: Float32Array;
  private readonly crowTurn: Float32Array;
  private crowsLeaving = false;

  constructor(view: View, rng: Rng, o: EventOptions) {
    const sp = SPECIES.raptor;
    const has = (m: ModifierId) => o.mods.includes(m);
    this.rng = rng;
    this.view = view;
    this.mods = o.mods;
    this.label = eventLabel("raptor", o.mods);
    const n = has("kettle") ? rng.int(5, 6) : has("pair") ? 2 : 1;
    this.flock = new Flock(n, sp);
    this.dir = rng.sign();
    this.speed = sp.speed * rng.range(0.9, 1.1);
    this.sense = rng.sign();
    this.failed = has("failed-stoop");
    const z = rng.range(o.depth[0], o.depth[1]);
    const hw = halfWidthAt(view, z);
    const ambush = has("ambush");
    const hunt =
      ambush || has("failed-stoop") || (!has("kettle") && rng.chance(0.5));
    // Thermal high in the view (per phase), drifting with the wind.
    this.cu = rng.range(-0.3, 0.3) * hw;
    const [h0, h1] = o.tune.raptor.height;
    this.cw = planeW(worldYAt(view, z, rng.range(h0, h1)), z);
    this.windU = o.wind[0];
    this.windW = planeW(0, o.wind[1]);
    this.circleFor = hunt ? rng.range(14, 28) : rng.range(18, 40);
    if (has("mobbed"))
      this.circleFor = Math.min(this.circleFor, rng.range(8, 12));
    this.exitX = hw + 10;
    this.maxLife = this.circleFor + (hw * 4) / this.speed + 80;
    this.heading = new Float32Array(n);
    this.turn = new Float32Array(n);
    this.radius = new Float32Array(n);
    this.lift = new Float32Array(n);
    this.leaveAfter = new Float32Array(n);
    this.leaving = new Uint8Array(n);
    const y0 = worldYAt(view, z, (h0 + h1) / 2);
    for (let i = 0; i < n; i++) {
      this.heading[i] = this.dir > 0 ? 0 : Math.PI;
      this.radius[i] = rng.range(9, 13) * (i === 0 ? 1 : rng.range(0.7, 1.4));
      this.lift[i] = i === 0 ? 0 : rng.range(-6, 6);
      this.leaveAfter[i] = i === 0 ? 0 : rng.range(2, 9);
      const w0 = this.cw + rng.range(-4, 4) - i * 7;
      this.flock.place(
        i,
        -this.dir * (hw + 6 + i * 9),
        y0 + (w0 - planeW(y0, z)) * E2_Y + this.lift[i] * UP_Y,
        z + (w0 - planeW(y0, z)) * E2_Z + this.lift[i] * UP_Z,
        this.dir * this.speed,
        0,
        0,
      );
      this.flock.flap[i] = i === 0 ? 1 : 0;
      this.flock.phase[i] = rng.range(0, Math.PI * 2);
    }
    this.flock.vary(rng);

    const flocks: Flock[] = [this.flock];
    if (hunt) {
      const px = rng.range(-0.3, 0.3) * hw;
      const py = worldYAt(view, z, rng.range(0.55, 0.66));
      this.prey = new Murmuration(view, rng, {
        count: rng.int(40, 80),
        depth: [z, z],
        phase: o.phase,
        tune: o.tune,
        mods: [],
        station: [px, py, z + rng.range(-3, 3)],
        wind: o.wind,
      });
      flocks.push(this.prey.flock);
      if (ambush) {
        // Already diving as it enters, from above the header, wings tucked.
        this.flock.place(
          0,
          px + rng.range(-6, 6),
          worldYAt(view, z, -0.15),
          z + rng.range(-4, 4),
          0,
          -6,
          0,
        );
        this.flock.flap[0] = 0;
        this.flock.tuck[0] = 1;
        this.vx = 0;
        this.vy = -6;
        this.vz = 0;
        this.spd = 6;
        this.stage = "stoop";
      }
    } else {
      this.prey = null;
    }
    if (has("mobbed")) {
      const cn = 3;
      this.crows = new Flock(cn, SPECIES.crow);
      this.crowHeading = new Float32Array(cn);
      this.crowTurn = new Float32Array(cn);
      for (let i = 0; i < cn; i++) {
        // Crows come up from below the thermal to meet it.
        const cy = worldYAt(view, z, rng.range(0.7, 0.9));
        this.crows.place(
          i,
          this.cu + rng.range(-8, 8),
          cy,
          z + rng.range(-4, 4),
          0,
          0,
          0,
        );
        this.crowHeading[i] = rng.range(0, Math.PI * 2);
        this.crows.phase[i] = rng.range(0, Math.PI * 2);
      }
      flocks.push(this.crows);
    } else {
      this.crows = null;
      this.crowHeading = new Float32Array(0);
      this.crowTurn = new Float32Array(0);
    }
    this.flocks = flocks;
  }

  /** Cuts the circling short: hunt now if hunting, else peel off; the prey moves on. */
  retire(): void {
    this.circleFor = Math.min(this.circleFor, this.t);
    if (this.prey && !this.preyLeaving) {
      this.preyLeaveIn = Math.min(this.preyLeaveIn, 6);
    }
  }

  update(dt: number): void {
    this.t += dt;
    this.updateLead(dt);
    this.updateOthers(dt);
    if (this.prey) this.updatePrey(dt);
    if (this.crows) this.updateCrows(dt);
    const r = this.flock;
    let allOut = true;
    for (let i = 0; i < r.n; i++) {
      const off = this.dir > 0 ? r.px[i] > this.exitX : r.px[i] < -this.exitX;
      if (!off) allOut = false;
    }
    if (this.stage === "leave" && allOut && this.preyGone()) this.done = true;
  }

  private updateLead(dt: number): void {
    const f = this.flock;
    const rng = this.rng;
    const u = f.px[0];
    const w = planeW(f.py[0], f.pz[0]);

    if (this.stage === "stoop" || this.stage === "pullout") {
      this.updateDive(dt);
    } else {
      let desired: number;
      switch (this.stage) {
        case "arrive": {
          desired = orbitHeading(
            u,
            w,
            this.cu,
            this.cw,
            this.radius[0],
            this.sense,
          );
          const dist = Math.hypot(this.cu - u, this.cw - w);
          if (Math.abs(dist - this.radius[0]) < 2.5 || this.t > 40) {
            this.stage = "circle";
          }
          break;
        }
        case "circle": {
          this.cu += this.windU * dt;
          this.cw += this.windW * dt;
          desired = orbitHeading(
            u,
            w,
            this.cu,
            this.cw,
            this.radius[0],
            this.sense,
          );
          if (this.t > this.circleFor) {
            if (this.prey) {
              this.beginStoop();
            } else {
              const exitHeading = this.dir > 0 ? 0 : Math.PI;
              if (Math.abs(wrapAngle(this.heading[0] - exitHeading)) < 0.35) {
                this.stage = "leave";
                this.flapLeft = 1.4;
              }
            }
          }
          break;
        }
        default:
          desired = seekHeading(u, w, this.dir * (this.exitX + 60), w);
      }
      this.turn[0] = steer(
        this.heading[0],
        desired,
        this.turn[0],
        MAX_TURN,
        dt,
      );
      this.heading[0] += this.turn[0] * dt;
      const v = this.speed;
      const h = this.heading[0];
      // After a hunt it keeps climbing on the way out, back into the view.
      const climb =
        this.stage === "circle"
          ? 0.12
          : this.stage === "leave"
            ? this.prey
              ? 1.6
              : 0.3
            : 0;
      f.follow(
        0,
        u + v * Math.cos(h) * dt,
        f.py[0] + v * Math.sin(h) * E2_Y * dt + climb * UP_Y * dt,
        f.pz[0] + v * Math.sin(h) * E2_Z * dt + climb * UP_Z * dt,
        dt,
      );
    }

    if (this.stage === "stoop" || this.stage === "pullout") {
      easeFlap(f, 0, 0, dt);
      return;
    }
    if (this.flapLeft > 0) {
      this.flapLeft -= dt;
      easeFlap(f, 0, 1, dt);
    } else {
      this.glideLeft -= dt;
      if (this.glideLeft <= 0) {
        this.flapLeft = 1.3;
        this.glideLeft = rng.range(12, 24);
      }
      easeFlap(f, 0, 0, dt);
    }
  }

  /** The other raptors on the thermal: orbit it, then follow the lead out, staggered. */
  private updateOthers(dt: number): void {
    const f = this.flock;
    const leadGone = this.stage === "leave" || this.stage === "pullout";
    for (let i = 1; i < f.n; i++) {
      const u = f.px[i];
      const w = planeW(f.py[i], f.pz[i]);
      if (leadGone && !this.leaving[i]) {
        this.leaveAfter[i] -= dt;
        if (this.leaveAfter[i] <= 0) this.leaving[i] = 1;
      }
      const desired = this.leaving[i]
        ? seekHeading(u, w, this.dir * (this.exitX + 60), w)
        : orbitHeading(u, w, this.cu, this.cw, this.radius[i], this.sense);
      this.turn[i] = steer(
        this.heading[i],
        desired,
        this.turn[i],
        MAX_TURN,
        dt,
      );
      this.heading[i] += this.turn[i] * dt;
      const v = this.speed * 0.95;
      const h = this.heading[i];
      const climb = this.leaving[i] ? 0.2 : 0.1;
      f.follow(
        i,
        u + v * Math.cos(h) * dt,
        f.py[i] + v * Math.sin(h) * E2_Y * dt + climb * UP_Y * dt,
        f.pz[i] + v * Math.sin(h) * E2_Z * dt + climb * UP_Z * dt,
        dt,
      );
      easeFlap(f, i, 0, dt);
    }
  }

  private beginStoop(): void {
    const f = this.flock;
    this.stage = "stoop";
    this.locked = false;
    this.vx = f.vx[0];
    this.vy = f.vy[0];
    this.vz = f.vz[0];
    this.spd = Math.hypot(this.vx, this.vy, this.vz) || this.speed;
  }

  /**
   * Lead pursuit, as a falcon flies it: aim at where the flock's centre will
   * be by the time of contact, re-read every step, so a flock that turns is
   * still met. Writes the aim into `this.aim`.
   */
  private aimAtPrey(): void {
    const f = this.flock;
    const prey = this.prey as Murmuration;
    const p = prey.flock;
    const g = prey.centre;
    let vx = 0;
    let vy = 0;
    let vz = 0;
    for (let i = 0; i < p.n; i++) {
      vx += p.vx[i];
      vy += p.vy[i];
      vz += p.vz[i];
    }
    const inv = 1 / p.n;
    const dist = Math.hypot(g[0] - f.px[0], g[1] - f.py[0], g[2] - f.pz[0]);
    const closing = Math.max(this.spd, 6);
    const lead = Math.min(1.5, dist / closing);
    this.aim[0] = g[0] + vx * inv * lead;
    this.aim[1] = g[1] + vy * inv * lead;
    this.aim[2] = g[2] + vz * inv * lead;
  }

  /** Stoop at the prey with tucked wings, then flare and pull out. */
  private updateDive(dt: number): void {
    const f = this.flock;
    let tx: number;
    let ty: number;
    let tz: number;
    let maxTurn: number;
    if (this.stage === "stoop") {
      this.aimAtPrey();
      tx = this.aim[0] - f.px[0];
      ty = this.aim[1] - f.py[0];
      tz = this.aim[2] - f.pz[0];
      maxTurn = STOOP_TURN;
      this.spd = Math.min(STOOP_SPEED, this.spd + STOOP_ACCEL * dt);
      f.tuck[0] += (1 - f.tuck[0]) * Math.min(1, 2.5 * dt);
      const dist = Math.hypot(tx, ty, tz);
      const closing = tx * this.vx + ty * this.vy + tz * this.vz;
      // Only once the dive points at the aim: the first moments still point
      // along the circle.
      if (closing > 0 && this.spd > 10) this.locked = true;
      const committed = this.locked;
      // A failed stoop breaks off well short of the flock.
      const breakOff = this.failed ? 16 : 3;
      if (dist < breakOff || (committed && closing < 0)) {
        this.stage = "pullout";
        this.preyLeaveIn = 5;
      }
    } else {
      // Flare: zoom up hard toward the exit side, trading the speed for height.
      tx = this.dir * 40;
      ty = 100 * UP_Y;
      tz = 100 * UP_Z;
      maxTurn = 2.6;
      this.spd = Math.max(CRUISE, this.spd - 9 * dt);
      f.tuck[0] += (0 - f.tuck[0]) * Math.min(1, 1.5 * dt);
      if (this.spd <= CRUISE + 0.01) {
        this.stage = "leave";
        this.heading[0] = Math.atan2(planeW(this.vy, this.vz), this.vx);
        this.turn[0] = 0;
        f.tuck[0] = 0;
      }
    }
    // Rotate the velocity toward the target by at most maxTurn·dt.
    const vl = Math.hypot(this.vx, this.vy, this.vz) || 1;
    let dx = this.vx / vl;
    let dy = this.vy / vl;
    let dz = this.vz / vl;
    const tl = Math.hypot(tx, ty, tz) || 1;
    const ux = tx / tl;
    const uy = ty / tl;
    const uz = tz / tl;
    const ang = Math.acos(
      Math.max(-1, Math.min(1, dx * ux + dy * uy + dz * uz)),
    );
    const k = ang > 1e-4 ? Math.min(1, (maxTurn * dt) / ang) : 1;
    dx += (ux - dx) * k;
    dy += (uy - dy) * k;
    dz += (uz - dz) * k;
    const dl = Math.hypot(dx, dy, dz) || 1;
    this.vx = (dx / dl) * this.spd;
    this.vy = (dy / dl) * this.spd;
    this.vz = (dz / dl) * this.spd;
    f.follow(
      0,
      f.px[0] + this.vx * dt,
      f.py[0] + this.vy * dt,
      f.pz[0] + this.vz * dt,
      dt,
    );
  }

  /** The hunted flock: mills about its station, bursts from the stoop, then moves on. */
  private updatePrey(dt: number): void {
    const prey = this.prey as Murmuration;
    const r = this.flock;
    if (this.stage === "pullout" || this.stage === "leave") {
      this.preyLeaveIn -= dt;
      if (this.preyLeaveIn <= 0 && !this.preyLeaving) {
        this.preyLeaving = true;
        prey.leave();
      }
    }
    if (this.stage === "stoop" || this.stage === "pullout") {
      // The flock only breaks when the raptor is almost on it; a failed
      // stoop never gets close enough for more than a shiver.
      const reach = this.failed ? BURST_RANGE * 0.5 : BURST_RANGE;
      prey.threat(
        r.px[0],
        r.py[0],
        r.pz[0],
        this.vx,
        this.vy,
        this.vz,
        reach,
        60,
      );
    }
    prey.update(dt);
  }

  /** Crows harry the lead raptor in tight fast circles until it leaves, then drop away. */
  private updateCrows(dt: number): void {
    const c = this.crows as Flock;
    const r = this.flock;
    if (this.stage === "leave" || this.stage === "pullout")
      this.crowsLeaving = true;
    const ru = r.px[0];
    const rw = planeW(r.py[0], r.pz[0]);
    for (let i = 0; i < c.n; i++) {
      const u = c.px[i];
      const w = planeW(c.py[i], c.pz[i]);
      const desired = this.crowsLeaving
        ? seekHeading(u, w, u + (i % 2 === 0 ? -200 : 200), w)
        : orbitHeading(u, w, ru, rw, 3.5 + i, i % 2 === 0 ? 1 : -1);
      this.crowTurn[i] = steer(
        this.crowHeading[i],
        desired,
        this.crowTurn[i],
        2.2,
        dt,
      );
      this.crowHeading[i] += this.crowTurn[i] * dt;
      const v = SPECIES.crow.speed;
      const h = this.crowHeading[i];
      // Climb to the raptor's height, then sink away once it has gone.
      const dy = this.crowsLeaving
        ? -0.6
        : Math.max(-0.8, Math.min(0.8, (r.py[0] - c.py[i]) * 0.5));
      c.follow(
        i,
        u + v * Math.cos(h) * dt,
        c.py[i] + v * Math.sin(h) * E2_Y * dt + dy * dt,
        c.pz[i] + v * Math.sin(h) * E2_Z * dt,
        dt,
      );
      easeFlap(c, i, this.crowsLeaving ? 0.5 : 1, dt);
    }
  }

  private preyGone(): boolean {
    const p = this.prey;
    if (!p) return true;
    return !anyVisible(p, this.view);
  }
}
