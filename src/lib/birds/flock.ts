import { basis } from "./event";
import type { Rng } from "./rng";
import type { Species } from "./species";

const G = 9.81;
const MAX_ROLL = 1.0;
const B = new Float32Array(9);

/**
 * Structure-of-arrays storage for one group of birds. Events write positions
 * (kinematic) or accelerations (steering); `integrate` / `follow` keep the
 * velocity, bank angle and wingbeat phase the renderer reads.
 */
export class Flock {
  readonly n: number;
  readonly species: Species;
  readonly px: Float32Array;
  readonly py: Float32Array;
  readonly pz: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly vz: Float32Array;
  readonly ax: Float32Array;
  readonly ay: Float32Array;
  readonly az: Float32Array;
  /** Wingbeat phase, radians. */
  readonly phase: Float32Array;
  /** 0 = gliding pose, 1 = full wingbeat. */
  readonly flap: Float32Array;
  /** Bank angle about the forward axis, radians; positive = left wing down. */
  readonly roll: Float32Array;
  /** 0 = wings spread, 1 = tucked for a stoop. */
  readonly tuck: Float32Array;
  /** Body size relative to the species, ~0.9–1.1. */
  readonly size: Float32Array;
  /** Wingbeat rate relative to the species, ~0.9–1.12. */
  readonly tempo: Float32Array;
  /** Temperament: how readily this bird glides or dawdles, ~0.5–1.6. */
  readonly habit: Float32Array;

  constructor(n: number, species: Species) {
    this.n = n;
    this.species = species;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.pz = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.vz = new Float32Array(n);
    this.ax = new Float32Array(n);
    this.ay = new Float32Array(n);
    this.az = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.flap = new Float32Array(n).fill(1);
    this.roll = new Float32Array(n);
    this.tuck = new Float32Array(n);
    this.size = new Float32Array(n).fill(1);
    this.tempo = new Float32Array(n).fill(1);
    this.habit = new Float32Array(n).fill(1);
  }

  /** Gives every bird its own size, beat and temperament. */
  vary(rng: Rng): void {
    for (let i = 0; i < this.n; i++) {
      this.size[i] = rng.range(0.9, 1.1);
      this.tempo[i] = rng.range(0.9, 1.12);
      this.habit[i] = rng.range(0.5, 1.6);
    }
  }

  /** Applies accumulated acceleration, clamps speed, moves, banks and clears the accumulator. */
  integrate(i: number, dt: number, minSpeed: number, maxSpeed: number): void {
    let vx = this.vx[i] + this.ax[i] * dt;
    let vy = this.vy[i] + this.ay[i] * dt;
    let vz = this.vz[i] + this.az[i] * dt;
    const sp = Math.hypot(vx, vy, vz);
    if (sp > maxSpeed) {
      const k = maxSpeed / sp;
      vx *= k;
      vy *= k;
      vz *= k;
    } else if (sp > 1e-6 && sp < minSpeed) {
      const k = minSpeed / sp;
      vx *= k;
      vy *= k;
      vz *= k;
    }
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.vz[i] = vz;
    this.px[i] += vx * dt;
    this.py[i] += vy * dt;
    this.pz[i] += vz * dt;
    this.bank(i, this.ax[i], this.ay[i], this.az[i], dt);
    this.ax[i] = 0;
    this.ay[i] = 0;
    this.az[i] = 0;
    this.beat(i, dt);
  }

  /** Moves a bird to a kinematic position, deriving velocity and bank from the motion. */
  follow(i: number, x: number, y: number, z: number, dt: number): void {
    const nvx = (x - this.px[i]) / dt;
    const nvy = (y - this.py[i]) / dt;
    const nvz = (z - this.pz[i]) / dt;
    const ax = (nvx - this.vx[i]) / dt;
    const ay = (nvy - this.vy[i]) / dt;
    const az = (nvz - this.vz[i]) / dt;
    this.vx[i] = nvx;
    this.vy[i] = nvy;
    this.vz[i] = nvz;
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.bank(i, ax, ay, az, dt);
    this.beat(i, dt);
  }

  /** Places a bird with a velocity, no history (spawn). */
  place(
    i: number,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
  ): void {
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.vz[i] = vz;
  }

  private bank(
    i: number,
    ax: number,
    ay: number,
    az: number,
    dt: number,
  ): void {
    // Lateral acceleration along the right vector sets the bank.
    basis(this.vx[i], this.vy[i], this.vz[i], B);
    const lat = ax * B[3] + ay * B[4] + az * B[5];
    let target = Math.atan(-lat / G);
    if (target > MAX_ROLL) target = MAX_ROLL;
    else if (target < -MAX_ROLL) target = -MAX_ROLL;
    this.roll[i] += (target - this.roll[i]) * Math.min(1, 3 * dt);
  }

  private beat(i: number, dt: number): void {
    const rate =
      this.species.flapHz * this.tempo[i] * (0.15 + 0.85 * this.flap[i]);
    const p = this.phase[i] + Math.PI * 2 * rate * dt;
    this.phase[i] = p > Math.PI * 2 ? p - Math.PI * 2 : p;
  }
}

/** Bank beyond which a large bird stops beating and rides the turn. */
const TURN_GLIDE = 0.3;

/**
 * Eases a flap amount toward a target (1 = beating, 0 = gliding). Species
 * that glide in turns hold their wings still once banked past `TURN_GLIDE`.
 */
export function easeFlap(
  flock: Flock,
  i: number,
  target: number,
  dt: number,
): void {
  let t = target;
  if (flock.species.glideInTurns) {
    const bank = Math.abs(flock.roll[i]);
    if (bank > TURN_GLIDE) t = 0;
  }
  flock.flap[i] += (t - flock.flap[i]) * Math.min(1, 4 * dt);
}
