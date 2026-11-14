import { Crossing } from "./crossing";
import {
  anyVisible,
  type EventOptions,
  type SkyEvent,
  UP_Y,
  UP_Z,
} from "./event";
import { Flock } from "./flock";
import { E2_Y, E2_Z, orbitHeading, planeW, steer } from "./glider";
import { eventLabel, type ModifierId } from "./modifiers";
import type { Rng } from "./rng";
import { SPECIES } from "./species";
import { halfWidthAt, type View, worldYAt } from "./view";

const CELL = 4.5;
const TABLE = 4096;
const SEP_R2 = 1.1 * 1.1;
const NEAR_R2 = CELL * CELL;
/** Each bird's own unrest, m/s²: enough to keep the cloud from freezing into a lattice. */
const JITTER = 0.6;
/** Share of its crossing after which a cloud stops to wheel in the open sky, and for how many seconds. */
const HOLD_AT: [number, number] = [0.35, 0.6];
const HOLD_FOR: [number, number] = [20, 45];
/** Starlings react to about seven nearest neighbours, whatever the density. */
const MAX_NEIGHBOURS = 7;
const MIN_SPEED = 5;
const MAX_SPEED = 9.5;
const MAX_FORCE = 14;
const LEAD_SPEED = 7;
const LEAD_GAIN = 0.5;
const TURB = 2.6;
/** How much of a bird's alarm is left after a 60 Hz step, and how much of a neighbour's it takes on. */
const ALARM_KEEP = 0.965;
const ALARM_PASS = 0.94;
/** At full alarm: extra pull into line with the neighbours, extra speed and force (as shares), and the sideways kick. */
const ALARM_ALIGN = 3;
const ALARM_SPEED = 0.45;
const ALARM_FORCE = 1.25;
const ALARM_KICK = 9;
/** Seconds between one wave of alarm and the next, [shortest, longest]. */
const WAVE_EVERY: [number, number] = [5, 11];

/**
 * A starling murmuration: one fluid mass. Local boids over a hashed grid
 * (short separation, strong alignment, cohesion to the seven nearest), a
 * global spring to the flock's own centroid so the cloud can stretch and
 * fold but never splits, the whole cloud dragged along a slow `Crossing`
 * that stops partway so the cloud wheels in the open sky before it goes on,
 * and a wandering lead direction the whole mass streams after, with a
 * breathing spring that rolls density waves through it. Scales to thousands
 * of birds: steering is refreshed for half the flock each step (positions
 * still integrate every step), turbulence is sampled per grid cell, and
 * the hot loop avoids trig, hypot and allocation.
 *
 * Modifiers: `pulse` (sudden contractions), `ribbon` (stretched along its
 * path), `funnel` (drains down into the roost), `probing` (a raptor circles
 * above it, never stooping), `wave` (alarm starts at one bird and passes
 * from neighbour to neighbour, so a band of hard-turning birds rolls through
 * the cloud); `giant` is the engine's: twice the birds.
 */
export class Murmuration implements SkyEvent {
  readonly kind = "murmuration";
  readonly flock: Flock;
  readonly flocks: readonly Flock[];
  readonly maxLife: number;
  readonly mods: readonly ModifierId[];
  readonly label: string;
  done = false;

  private t = 0;
  /** Seconds travelled along the crossing; it stands still while the cloud wheels in the open sky. */
  private along = 0;
  private holdAt = 0;
  private holdLeft = 0;
  /** The crossing, or null when milling about a station. */
  private readonly path: Crossing | null;
  private readonly station: Float32Array | null;
  private readonly wind: [number, number];
  private readonly rng: Rng;
  private readonly view: View;
  private readonly c = new Float32Array(3);
  private readonly centroid = new Float32Array(3);
  private readonly keys: Int32Array;
  private readonly items: Int32Array;
  /** Steering forces, refreshed for half the birds each step. */
  private readonly fx: Float32Array;
  private readonly fy: Float32Array;
  private readonly fz: Float32Array;
  /** Turbulence per grid cell for this step (stamped), not per bird. */
  private readonly turbX = new Float32Array(TABLE);
  private readonly turbY = new Float32Array(TABLE);
  private readonly turbZ = new Float32Array(TABLE);
  private readonly turbStamp = new Int32Array(TABLE).fill(-1);
  private stepNo = 0;
  private readonly starts = new Int32Array(TABLE + 1);
  private readonly cursor = new Int32Array(TABLE + 1);
  private readonly cloud: number;
  private lead: number;
  private leaving = false;
  private liftLeft = 0;
  private jinkLeft = 0;
  private jinkDir = 1;
  private readonly ribbon: boolean;
  private readonly funnel: boolean;
  private readonly pulse: boolean;
  private pulseIn: number;
  private pulseLeft = 0;
  /** Alarm per bird, 0 to 1, and the buffer the next step's is written to; null without the `wave` twist. */
  private alarm: Float32Array | null;
  private alarmNext: Float32Array | null;
  private waveIn: number;
  /** The way this wave's birds jink. */
  private readonly waveDir = new Float32Array(3);
  private readonly raptor: Flock | null;
  private raptorHeading = 0;
  private raptorTurn = 0;
  // A predator this step: where, which way it is moving, reach, strength.
  private readonly threatAt = new Float32Array(3);
  private readonly threatDir = new Float32Array(3);
  private threatRadius = 0;
  private threatStrength = 0;

  constructor(view: View, rng: Rng, o: EventOptions) {
    const sp = SPECIES.starling;
    const has = (m: ModifierId) => o.mods.includes(m);
    const count = o.count;
    this.rng = rng;
    this.view = view;
    this.mods = o.mods;
    this.label = eventLabel("murmuration", o.mods);
    this.flock = new Flock(count, sp);
    this.ribbon = has("ribbon");
    this.funnel = has("funnel");
    this.pulse = has("pulse");
    this.pulseIn = rng.range(6, 12);
    const wave = has("wave");
    this.alarm = wave ? new Float32Array(count) : null;
    this.alarmNext = wave ? new Float32Array(count) : null;
    this.waveIn = wave ? rng.range(WAVE_EVERY[0], WAVE_EVERY[1]) : 0;
    // Small flocks sit denser than the great clouds, or they fall into clumps.
    this.wind = o.wind;
    this.cloud = 1.5 + Math.cbrt(count) * (count < 150 ? 1.3 : 2.1);
    if (o.station) {
      this.path = null;
      this.station = Float32Array.from(o.station);
      this.c.set(this.station);
      this.maxLife = 240;
    } else {
      this.station = null;
      this.path = new Crossing(view, rng, {
        depth: o.depth,
        speed: 2.8,
        band: [0.12, 0.55],
        wobble: 6,
        margin: this.cloud + 2,
        exitMargin: this.cloud + 6,
      });
      this.maxLife = this.path.duration + 40;
      this.path.posAt(0, this.c);
    }
    this.keys = new Int32Array(count);
    this.items = new Int32Array(count);
    this.fx = new Float32Array(count);
    this.fy = new Float32Array(count);
    this.fz = new Float32Array(count);
    const dir = this.path ? this.path.dir : rng.sign();
    const r = this.cloud;
    // Ellipsoid, flatter than wide, like a cloud seen from below; a ribbon
    // is drawn out along the path.
    const kx = this.ribbon ? 2.4 : 1;
    const kz = this.ribbon ? 0.6 : 1;
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const b = Math.acos(rng.range(-1, 1));
      const d = r * Math.cbrt(rng.next());
      this.flock.place(
        i,
        this.c[0] + d * Math.sin(b) * Math.cos(a) * kx,
        this.c[1] + d * Math.cos(b) * 0.5,
        this.c[2] + d * Math.sin(b) * Math.sin(a) * kz,
        dir * sp.speed + rng.range(-2, 2),
        rng.range(-1, 1),
        rng.range(-2, 2),
      );
      this.flock.phase[i] = rng.range(0, Math.PI * 2);
    }
    this.flock.vary(rng);
    this.centroid.set(this.c);
    // A crossing cloud stops partway to wheel where it can be seen; a funnel goes straight to its roost.
    if (this.path && !this.funnel) {
      this.holdAt = this.path.duration * rng.range(HOLD_AT[0], HOLD_AT[1]);
      this.holdLeft = rng.range(HOLD_FOR[0], HOLD_FOR[1]);
      this.maxLife += this.holdLeft;
    }
    this.lead = dir > 0 ? 0 : Math.PI;

    if (has("probing")) {
      this.raptor = new Flock(1, SPECIES.raptor);
      this.raptor.flap[0] = 0;
      this.raptor.place(
        0,
        this.c[0],
        this.c[1] + 14 * UP_Y,
        this.c[2] + 14 * UP_Z,
        dir * SPECIES.raptor.speed,
        0,
        0,
      );
      this.raptorHeading = this.lead;
      this.flocks = [this.flock, this.raptor];
    } else {
      this.raptor = null;
      this.flocks = [this.flock];
    }
  }

  private static key(ix: number, iy: number, iz: number): number {
    return (
      (Math.imul(ix, 92837111) ^
        Math.imul(iy, 689287499) ^
        Math.imul(iz, 283923481)) &
      (TABLE - 1)
    );
  }

  private buildGrid(): void {
    const f = this.flock;
    const keys = this.keys;
    const items = this.items;
    const starts = this.starts;
    starts.fill(0);
    for (let i = 0; i < f.n; i++) {
      const k = Murmuration.key(
        Math.floor(f.px[i] / CELL),
        Math.floor(f.py[i] / CELL),
        Math.floor(f.pz[i] / CELL),
      );
      keys[i] = k;
      starts[k + 1]++;
    }
    for (let k = 0; k < TABLE; k++) starts[k + 1] += starts[k];
    const cursor = this.cursor;
    cursor.set(starts);
    for (let i = 0; i < f.n; i++) {
      items[cursor[keys[i]]++] = i;
    }
  }

  retire(): void {
    this.leaving = true;
    if (this.station) this.leave();
  }

  /** Sends a stationed cloud off to one side, out of the view. */
  leave(): void {
    if (!this.station) return;
    this.leaving = true;
    const hw = halfWidthAt(this.view, this.station[2]);
    this.station[0] = this.rng.sign() * (hw + 60);
    this.station[1] += this.rng.range(-4, 10);
  }

  /**
   * A predator at (x, y, z) moving along (dx, dy, dz) this step: within
   * `radius` the birds burst away from its line of flight (flash expansion,
   * opening a hole around the dive); the whole cloud tightens while it is
   * near. A zero direction means a hovering threat: birds burst radially.
   */
  threat(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    radius: number,
    strength: number,
  ): void {
    this.threatAt[0] = x;
    this.threatAt[1] = y;
    this.threatAt[2] = z;
    const dl = Math.hypot(dx, dy, dz);
    this.threatDir[0] = dl > 1e-6 ? dx / dl : 0;
    this.threatDir[1] = dl > 1e-6 ? dy / dl : 0;
    this.threatDir[2] = dl > 1e-6 ? dz / dl : 0;
    this.threatRadius = radius;
    this.threatStrength = strength;
  }

  /**
   * The quiz's reveal: a correct answer lifts the whole cloud in a surge, a
   * wrong one makes it jink sideways. Either lasts a second or two.
   */
  react(kind: "lift" | "jink"): void {
    if (kind === "lift") {
      this.liftLeft = 1.8;
    } else {
      this.jinkLeft = 1.2;
      this.jinkDir = this.rng.sign();
    }
  }

  /** Centre of the cloud as of the last step. */
  get centre(): Float32Array {
    return this.centroid;
  }

  update(dt: number): void {
    this.t += dt;
    const f = this.flock;
    const c = this.c;
    const rng = this.rng;
    if (this.path) {
      if (this.holdLeft > 0 && this.along >= this.holdAt && !this.leaving)
        this.holdLeft -= dt;
      else this.along += dt;
      this.path.posAt(this.along, c);
      // The whole cloud drifts on the wind.
      c[0] += this.wind[0] * this.along;
      c[2] += this.wind[1] * this.along;
      // Roost funnel: past the middle of the crossing the cloud drains down
      // out of the view instead of crossing it.
      if (this.funnel && this.along > this.path.duration * 0.5) {
        this.path.posAt(this.path.duration * 0.5, c);
        c[1] = worldYAt(this.view, c[2], 1.4);
      }
    } else if (this.station) {
      if (!this.leaving) {
        this.station[0] += this.wind[0] * dt;
        this.station[2] += this.wind[1] * dt;
      }
      c.set(this.station);
    }
    this.buildGrid();

    // Where the cloud is now, and how far it lags the attractor.
    const g = this.centroid;
    let gx = 0;
    let gy = 0;
    let gz = 0;
    for (let i = 0; i < f.n; i++) {
      gx += f.px[i];
      gy += f.py[i];
      gz += f.pz[i];
    }
    g[0] = gx / f.n;
    g[1] = gy / f.n;
    g[2] = gz / f.n;
    const dragX = (c[0] - g[0]) * 0.12;
    const dragY = (c[1] - g[1]) * 0.12;
    const dragZ = (c[2] - g[2]) * 0.12;

    // The whole mass streams after a slowly wandering lead direction; folds
    // and ripples come from the lag between the front and the back of the
    // cloud as it turns. The spring breathes so density waves roll through.
    const t = this.t;
    this.lead +=
      (Math.sin(t * 0.21) * 0.5 + Math.sin(t * 0.073 + 1) * 0.6) * dt;
    // Wander is relative to the crossing: the further the cloud lags the
    // attractor, the more the lead points back at it. Retired: straight out.
    const wander = this.leaving ? 0 : 3;
    const wx = Math.cos(this.lead);
    const wy = 0.35 * Math.sin(t * 0.17 + 0.4);
    const wz = Math.sin(this.lead);
    // A reveal surge: up for a correct answer, hard sideways for a wrong one.
    if (this.liftLeft > 0) this.liftLeft -= dt;
    if (this.jinkLeft > 0) this.jinkLeft -= dt;
    const lift = this.liftLeft > 0 ? 2.5 : 0;
    const jink = this.jinkLeft > 0 ? 6 * this.jinkDir : 0;
    const lx = wx * wander + (c[0] - g[0]) * 1.5 + jink;
    const ly = wy * wander + (c[1] - g[1]) * 1.5 + lift;
    const lz = wz * wander + (c[2] - g[2]) * 1.5;
    const ll = Math.hypot(lx, ly, lz) || 1;
    const ldx = (lx / ll) * LEAD_SPEED;
    const ldy = (ly / ll) * LEAD_SPEED;
    const ldz = (lz / ll) * LEAD_SPEED;
    // Predator pulse: every so often the cloud snaps tight, then releases.
    if (this.pulse) {
      this.pulseIn -= dt;
      if (this.pulseIn <= 0) {
        this.pulseLeft = 1.4;
        this.pulseIn = rng.range(8, 14);
      }
      if (this.pulseLeft > 0) this.pulseLeft -= dt;
    }
    // A wave of alarm: one bird takes fright, and the fright runs on from it.
    const alarm = this.alarm;
    const alarmNext = this.alarmNext;
    const keep = ALARM_KEEP ** (dt * 60);
    if (alarm) {
      this.waveIn -= dt;
      if (this.waveIn <= 0) {
        this.waveIn = rng.range(WAVE_EVERY[0], WAVE_EVERY[1]);
        alarm[Math.floor(rng.next() * f.n) % f.n] = 1;
        // The birds jink across the way the cloud is heading, and a little up or down.
        const side = rng.sign();
        const rise = rng.range(-0.5, 0.5);
        const wl = Math.hypot(1, rise);
        this.waveDir[0] = (-Math.sin(this.lead) * side) / wl;
        this.waveDir[1] = rise / wl;
        this.waveDir[2] = (Math.cos(this.lead) * side) / wl;
      }
    }
    const kx = this.waveDir[0] * ALARM_KICK;
    const ky = this.waveDir[1] * ALARM_KICK;
    const kz = this.waveDir[2] * ALARM_KICK;
    // Under attack the cloud tightens; the burst is local, below.
    const threatNear =
      this.threatStrength > 0 &&
      Math.hypot(
        this.threatAt[0] - g[0],
        this.threatAt[1] - g[1],
        this.threatAt[2] - g[2],
      ) <
        this.threatRadius * 3;
    const squeeze =
      this.pulseLeft > 0 || this.liftLeft > 0 ? 5 : threatNear ? 3 : 1;
    const tr = this.threatRadius;
    const tsx = this.threatAt[0];
    const tsy = this.threatAt[1];
    const tsz = this.threatAt[2];
    const tdx = this.threatDir[0];
    const tdy = this.threatDir[1];
    const tdz = this.threatDir[2];
    const tstr = this.threatStrength;
    const breathe =
      (f.n < 150 ? 0.14 : 0.06) * (1 + 0.5 * Math.sin(t * 0.45)) * squeeze;
    const loose = this.cloud * (this.ribbon ? 1.6 : 1.1);
    const align = this.ribbon ? 4.2 : 3.2;

    const items = this.items;
    const starts = this.starts;
    const fxs = this.fx;
    const fys = this.fy;
    const fzs = this.fz;
    const stepNo = ++this.stepNo;
    const ph = t * 0.9;
    const turbX = this.turbX;
    const turbY = this.turbY;
    const turbZ = this.turbZ;
    const turbStamp = this.turbStamp;
    for (let i = 0; i < f.n; i++) {
      const px = f.px[i];
      const py = f.py[i];
      const pz = f.pz[i];
      const ix = Math.floor(px / CELL);
      const iy = Math.floor(py / CELL);
      const iz = Math.floor(pz / CELL);
      let maxForce = MAX_FORCE;
      let maxSpeed = MAX_SPEED;
      // Its own alarm fades; the steering below may take on a neighbour's.
      let scare = alarm ? alarm[i] * keep : 0;

      // Steering (neighbours, springs, lead, turbulence) for half the flock
      // per step; the other half keeps last step's forces.
      if (((i + stepNo) & 1) === 0) {
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let cx = 0;
        let cy = 0;
        let cz = 0;
        let avx = 0;
        let avy = 0;
        let avz = 0;
        let count = 0;
        outer: for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dz = -1; dz <= 1; dz++) {
              const k = Murmuration.key(ix + dx, iy + dy, iz + dz);
              for (let s = starts[k], e = starts[k + 1]; s < e; s++) {
                const j = items[s];
                if (j === i) continue;
                const ox = px - f.px[j];
                const oy = py - f.py[j];
                const oz = pz - f.pz[j];
                const d2 = ox * ox + oy * oy + oz * oz;
                if (d2 >= NEAR_R2) continue;
                if (d2 < SEP_R2 && d2 > 1e-6) {
                  sx += ox / d2;
                  sy += oy / d2;
                  sz += oz / d2;
                }
                cx += f.px[j];
                cy += f.py[j];
                cz += f.pz[j];
                avx += f.vx[j];
                avy += f.vy[j];
                avz += f.vz[j];
                if (alarm && alarm[j] * ALARM_PASS > scare)
                  scare = alarm[j] * ALARM_PASS;
                if (++count >= MAX_NEIGHBOURS) break outer;
              }
            }
          }
        }
        let ax = dragX;
        let ay = dragY;
        let az = dragZ;
        const sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
        if (sl > 0) {
          const k = Math.min(sl, 6) / sl;
          ax += sx * k * 4;
          ay += sy * k * 4;
          az += sz * k * 4;
        }
        if (count > 0) {
          const inv = 1 / count;
          // A scared bird holds harder to its neighbours' heading.
          const line = align + ALARM_ALIGN * scare;
          ax += (cx * inv - px) * 0.5 + (avx * inv - f.vx[i]) * line;
          ay += (cy * inv - py) * 0.5 + (avy * inv - f.vy[i]) * line;
          az += (cz * inv - pz) * 0.5 + (avz * inv - f.vz[i]) * line;
        }
        // Global spring to the cloud's own centroid: soft inside, firm beyond.
        const tx = g[0] - px;
        const ty = g[1] - py;
        const tz = g[2] - pz;
        const td = Math.sqrt(tx * tx + ty * ty + tz * tz);
        const pull = td > loose ? breathe + (td - loose) * 0.4 : breathe;
        ax += tx * pull;
        ay += ty * pull;
        az += tz * pull;
        // Stream after the lead direction.
        ax += (ldx - f.vx[i]) * LEAD_GAIN;
        ay += (ldy - f.vy[i]) * LEAD_GAIN;
        az += (ldz - f.vz[i]) * LEAD_GAIN;
        // Spatial turbulence: slow waves that pass through the cloud without
        // ever orbiting it, so it ripples but stays one body. Sampled once
        // per cell per step: the waves are metres wide, a cell is 4.5 m.
        const ck = this.keys[i];
        if (turbStamp[ck] !== stepNo) {
          turbStamp[ck] = stepNo;
          const cxm = (ix + 0.5) * CELL;
          const cym = (iy + 0.5) * CELL;
          const czm = (iz + 0.5) * CELL;
          turbX[ck] =
            Math.sin(cym * 0.35 + ph) * Math.cos(czm * 0.25 - ph * 0.7) * TURB;
          turbY[ck] =
            Math.sin(czm * 0.3 + ph * 1.1) *
            Math.cos(cxm * 0.25 + ph * 0.5) *
            TURB;
          turbZ[ck] =
            Math.sin(cxm * 0.3 - ph * 0.8) * Math.cos(cym * 0.3 + ph) * TURB;
        }
        ax += turbX[ck];
        ay += turbY[ck];
        az += turbZ[ck];
        // One random number, three jitter components.
        const r = rng.next();
        ax += (r - 0.5) * JITTER;
        ay += (((r * 7.31) % 1) - 0.5) * JITTER;
        az += (((r * 13.7) % 1) - 0.5) * JITTER;
        const fl = Math.sqrt(ax * ax + ay * ay + az * az);
        if (fl > maxForce) {
          const k = maxForce / fl;
          ax *= k;
          ay *= k;
          az *= k;
        }
        fxs[i] = ax;
        fys[i] = ay;
        fzs[i] = az;
      }

      let ax = fxs[i];
      let ay = fys[i];
      let az = fzs[i];
      if (tstr > 0) {
        // Flash expansion, every step: birds in the predator's reach burst
        // away from its line of flight, the nearer the harder, and may
        // outrun the cloud's pace.
        const ox = px - tsx;
        const oy = py - tsy;
        const oz = pz - tsz;
        const fd = Math.sqrt(ox * ox + oy * oy + oz * oz);
        if (fd < tr) {
          // Away from the line of flight, not from the bird: the flock opens
          // a hole around the dive and closes behind it.
          const along = ox * tdx + oy * tdy + oz * tdz;
          let bx = ox - along * tdx;
          let by = oy - along * tdy;
          let bz = oz - along * tdz;
          let bl = Math.sqrt(bx * bx + by * by + bz * bz);
          if (bl < 0.3) {
            // Right on the line: pick a sideways way out.
            bx = rng.range(-1, 1);
            by = 0.3;
            bz = rng.range(-1, 1);
            bl = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
          }
          const k = (tstr * (1 - fd / tr)) / bl;
          ax += bx * k;
          ay += by * k;
          az += bz * k;
          maxForce = MAX_FORCE * 4;
          maxSpeed = MAX_SPEED * 1.4;
          // A bird the predator reaches starts a wave of its own.
          if (alarm) scare = 1;
          const fl = Math.sqrt(ax * ax + ay * ay + az * az);
          if (fl > maxForce) {
            const k2 = maxForce / fl;
            ax *= k2;
            ay *= k2;
            az *= k2;
          }
        }
      }

      if (alarmNext) {
        alarmNext[i] = scare;
        // A scared bird jinks, and may fly faster and turn harder than the rest.
        ax += kx * scare;
        ay += ky * scare;
        az += kz * scare;
        maxSpeed *= 1 + ALARM_SPEED * scare;
        maxForce *= 1 + ALARM_FORCE * scare;
        const fl = Math.sqrt(ax * ax + ay * ay + az * az);
        if (fl > maxForce) {
          const k = maxForce / fl;
          ax *= k;
          ay *= k;
          az *= k;
        }
      }

      f.ax[i] += ax;
      f.ay[i] += ay;
      f.az[i] += az;
      f.integrate(i, dt, MIN_SPEED, maxSpeed);
    }
    this.threatStrength = 0;
    this.alarm = alarmNext;
    this.alarmNext = alarm;

    if (this.raptor) {
      this.updateRaptor(dt);
      // A raptor overhead keeps the cloud tight and wary.
      this.threat(
        this.raptor.px[0],
        this.raptor.py[0],
        this.raptor.pz[0],
        0,
        0,
        0,
        6,
        4,
      );
    }

    if (!this.path) {
      // Stationed: finished once sent off and clear of the view.
      if (this.leaving && !anyVisible(this, this.view)) this.done = true;
    } else if (this.funnel) {
      if (this.along > this.path.duration * 0.5 + 30) this.done = true;
    } else if (
      this.along > this.path.duration &&
      this.path.passed(g[0] - this.wind[0] * this.along, this.cloud)
    ) {
      this.done = true;
    }
  }

  /** A raptor circling above the cloud's centre, following it, never stooping. */
  private updateRaptor(dt: number): void {
    const r = this.raptor as Flock;
    const g = this.centroid;
    const u = r.px[0];
    const w = planeW(r.py[0], r.pz[0]);
    const cu = g[0];
    const cw = planeW(g[1] + 14 * UP_Y, g[2] + 14 * UP_Z);
    const desired = orbitHeading(u, w, cu, cw, this.cloud * 0.8, 1);
    this.raptorTurn = steer(
      this.raptorHeading,
      desired,
      this.raptorTurn,
      0.5,
      dt,
    );
    this.raptorHeading += this.raptorTurn * dt;
    const v = SPECIES.raptor.speed;
    const h = this.raptorHeading;
    r.follow(
      0,
      u + v * Math.cos(h) * dt,
      r.py[0] + v * Math.sin(h) * E2_Y * dt,
      r.pz[0] + v * Math.sin(h) * E2_Z * dt,
      dt,
    );
  }
}
