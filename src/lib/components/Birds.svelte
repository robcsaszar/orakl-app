<script lang="ts">
import { PHASE_CONFIG } from "@orakl/shared";
import type { SkyPhase } from "@orakl/shared";
  import { onMount } from "svelte";
  import { BIRD_COLORS } from "@/lib/constants/phase-stops.constants";
  
  import { subscribeSkyPhase } from "@/lib/sky-phase";

  type TimeOfDay = SkyPhase;

  interface Props {
    timeOfDay?: TimeOfDay;
    flockSize?: number;
    wanderers?: number;
    transiting?: number;
    speed?: number;
    flockDensity?: number;
  }

  let {
    timeOfDay = "noon",
    flockSize = 25,
    wanderers = 5,
    transiting = 3,
    speed = 1.0,
    flockDensity = 0.5,
  }: Props = $props();

  class Vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    clone() {
      return new Vec3(this.x, this.y, this.z);
    }
    add(v: Vec3) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    sub(v: Vec3) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }
    scale(s: number) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
      return this;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    normalize() {
      const l = this.length();
      if (l > 0) this.scale(1 / l);
      return this;
    }
    limit(max: number) {
      const l = this.length();
      if (l > max) this.scale(max / l);
      return this;
    }
    distanceTo(v: Vec3) {
      const dx = this.x - v.x,
        dy = this.y - v.y,
        dz = this.z - v.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }

  let canvas: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

    // ── Config ────────────────────────────────────────────────────────────
    // Thin the flock on small screens — fewer birds is lighter and a packed
    // flock reads as cluttered on a narrow viewport.
    const SMALL_SCREEN = globalThis.innerWidth < 640;
    const FLOCK_SIZE = SMALL_SCREEN ? Math.round(flockSize * 0.45) : flockSize;
    const WANDERER_CNT = SMALL_SCREEN ? Math.max(2, Math.round(wanderers * 0.5)) : wanderers;
    const TRANSIT_CNT = SMALL_SCREEN ? Math.max(2, Math.round(transiting * 0.5)) : transiting;
    const SPEED = speed;
    const FLOCK_DENSITY = flockDensity;
    const BASE_COLOR = BIRD_COLORS[timeOfDay] ?? "#1a3a5c";

    function hexToRgb(hex: string): [number, number, number] {
      return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ];
    }
    let [BR, BG, BB] = hexToRgb(BASE_COLOR);

    // ── Geometry ──────────────────────────────────────────────────────────
    const FOCAL = 1000;
    // Birds are a fixed world-space size, so on a narrow viewport they look
    // huge ("too close"). Scale the model down toward mobile widths.
    let BIRD_SCALE = 1;
    function computeBirdScale() {
      BIRD_SCALE = Math.max(0.5, Math.min(1, globalThis.innerWidth / 1280));
    }
    computeBirdScale();

    type Pt3 = [number, number, number];

    // Forward = +x, up = +y, wingspan along ±z. Gull-style swept wings split
    // at the wrist so the flap can bend instead of pivoting as a flat plank.
    //                 x     y    z
    const BASE_VERTS: Pt3[] = [
      [6, 0.5, 0], // 0 head
      [-7, 0, 0], // 1 tail
      [2, 0, 1], // 2 shoulder L
      [-3, 0, 1], // 3 armpit L
      [1, 0, 5], // 4 wrist L
      [-4, 0, 9], // 5 tip L
      [2, 0, -1], // 6 shoulder R
      [-3, 0, -1], // 7 armpit R
      [1, 0, -5], // 8 wrist R
      [-4, 0, -9], // 9 tip R
    ];

    const TRIS: [number, number, number][] = [
      [0, 6, 2], // body front
      [1, 3, 7], // body back
      [2, 3, 6], // body mid
      [6, 3, 7], // body mid
      [2, 4, 5], // left wing outer
      [2, 5, 3], // left wing inner
      [6, 9, 8], // right wing outer
      [6, 7, 9], // right wing inner
    ];

    // Flap weighting: tips travel most, wrists lead (phase offset) so the wing
    // bows on the downstroke. Spine/body verts barely move.
    const FLAP_AMP = 6;
    const SPAN = BASE_VERTS.map((v) => Math.abs(v[2]) / 9);
    const LEAD = [0, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 0];

    const LIGHT = new Vec3(0, 1, 0.8).normalize();
    const LX = LIGHT.x,
      LY = LIGHT.y,
      LZ = LIGHT.z;

    // Reused per-bird scratch buffers — avoids allocating arrays/objects every
    // frame (10 verts × N birds × 60fps would otherwise churn the GC).
    const WORLD: Pt3[] = BASE_VERTS.map(() => [0, 0, 0]);
    const PROJ: [number, number][] = BASE_VERTS.map(() => [0, 0]);

    function drawBird(
      phase: number,
      yaw: number,
      pitch: number,
      px: number,
      py: number,
      pz: number,
      r: number,
      g: number,
      b: number,
      alpha: number,
    ) {
      if (pz < -(FOCAL - 80)) return;

      const denom = FOCAL + pz;
      if (denom > 0) {
        const s = FOCAL / denom;
        const sx = px * s;
        const sy = py * s;
        const hw = canvas.width / 2 + 30;
        const hh = canvas.height / 2 + 30;
        if (Math.abs(sx) > hw || Math.abs(sy) > hh) return;
      }

      const cosY = Math.cos(yaw),
        sinY = Math.sin(yaw);
      const cosZ = Math.cos(pitch),
        sinZ = Math.sin(pitch);

      for (let i = 0; i < BASE_VERTS.length; i++) {
        const v = BASE_VERTS[i];
        let x = v[0] * BIRD_SCALE;
        const flap = SPAN[i] > 0 ? Math.sin(phase + LEAD[i]) * FLAP_AMP * SPAN[i] : 0;
        let y = (v[1] + flap) * BIRD_SCALE;
        let z = v[2] * BIRD_SCALE;
        // rotate Y
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        x = x1;
        z = z1;
        // rotate Z
        const x2 = x * cosZ - y * sinZ;
        const y2 = x * sinZ + y * cosZ;
        const w = WORLD[i];
        w[0] = x2 + px;
        w[1] = y2 + py;
        w[2] = z + pz;
        // project
        const denom = FOCAL + w[2];
        const pr = PROJ[i];
        if (denom < 1) {
          pr[0] = 0;
          pr[1] = 0;
        } else {
          const s = FOCAL / denom;
          pr[0] = w[0] * s;
          pr[1] = w[1] * s;
        }
      }

      for (let t = 0; t < TRIS.length; t++) {
        const tri = TRIS[t];
        const a = WORLD[tri[0]];
        const bb = WORLD[tri[1]];
        const cc = WORLD[tri[2]];
        // face normal = (b-a) × (c-a), then |n·LIGHT| / |n|
        const e1x = bb[0] - a[0],
          e1y = bb[1] - a[1],
          e1z = bb[2] - a[2];
        const e2x = cc[0] - a[0],
          e2y = cc[1] - a[1],
          e2z = cc[2] - a[2];
        const nx = e1y * e2z - e1z * e2y;
        const ny = e1z * e2x - e1x * e2z;
        const nz = e1x * e2y - e1y * e2x;
        const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        const ndl = (nx * LX + ny * LY + nz * LZ) / nlen;
        const diffuse = 0.35 + Math.abs(ndl) * 0.65;
        const col = `rgba(${Math.floor(r * diffuse)},${Math.floor(g * diffuse)},${Math.floor(b * diffuse)},${alpha.toFixed(2)})`;
        const p0 = PROJ[tri[0]];
        const p1 = PROJ[tri[1]];
        const p2 = PROJ[tri[2]];
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── Bird state ────────────────────────────────────────────────────────
    interface Bird {
      pos: Vec3;
      vel: Vec3;
      acc: Vec3;
      type: "flock" | "wander" | "transit";
      flockId: number;
      phase: number;
      maxSpeed: number;
      maxForce: number;
      r: number;
      g: number;
      b: number;
      wanderTarget: Vec3;
      wanderTimer: number;
      transitDir: number;
      transitCooldown: number;
      bankAngle: number;
      bankRate: number;
      bankTimer: number;
      bankStrength: number;
    }

    const SEP_RADIUS = 55;
    const WORLD_D = 170;
    const Z_NEAR = -(FOCAL - 120);
    const MARGIN = 100;
    const BOUNDARY_F = 0.1;

    // Squared neighbour radii — compared against squared distance to avoid a
    // sqrt per pair (only taken once inside the separation radius).
    const SEP_R2 = SEP_RADIUS * SEP_RADIUS;
    const ALIGN_R2 = (40 + FLOCK_DENSITY * 60) ** 2;
    const COHERE_R2 = (70 + FLOCK_DENSITY * 100) ** 2;

    // ── Sub-flocks ────────────────────────────────────────────────────────
    // Each sub-flock chases its own slow-roaming home point so the flocks
    // spread across the whole sky instead of all hovering near the centre.
    const NUM_SUBFLOCKS = 3;

    interface Home {
      angle: number;
      speed: number;
      freqX: number;
      freqY: number;
      phaseX: number;
      phaseY: number;
      x: number;
      y: number;
    }

    const homes: Home[] = Array.from({ length: NUM_SUBFLOCKS }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.0005 + Math.random() * 0.0004,
      freqX: 0.8 + Math.random() * 0.9,
      freqY: 0.6 + Math.random() * 0.7,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      x: 0,
      y: 0,
    }));

    function updateHomes(dt: number) {
      // Roam across ~84% of the half-width/height so flocks reach the edges.
      const rx = (canvas.width / 2) * 0.84;
      const ry = (canvas.height / 2) * 0.84;
      for (const h of homes) {
        h.angle += h.speed * dt;
        h.x = Math.sin(h.angle * h.freqX + h.phaseX) * rx;
        h.y = Math.sin(h.angle * h.freqY + h.phaseY) * ry;
      }
    }

    let birds: Bird[] = [];

    function jitterColor(r: number, g: number, b: number): [number, number, number] {
      const f = 0.88 + Math.random() * 0.24;
      const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
      return [c(r), c(g), c(b)];
    }

    function makeBird(type: Bird["type"], transitDir = 1, flockId = -1): Bird {
      const jitter = 1 + (Math.random() * 0.3 - 0.15);
      const ww = canvas.width / 2;
      const wh = canvas.height / 2;

      let pos: Vec3, vel: Vec3;

      if (type === "transit") {
        pos = new Vec3(
          transitDir > 0 ? -ww - 50 : ww + 50,
          (Math.random() * 2 - 1) * wh * 0.7,
          (Math.random() * 2 - 1) * WORLD_D,
        );
        vel = new Vec3(
          transitDir * (5 + Math.random() * 3) * SPEED,
          (Math.random() * 0.8 - 0.4) * SPEED,
          (Math.random() * 1.2 - 0.6) * SPEED,
        );
      } else {
        pos = new Vec3(
          (Math.random() * 2 - 1) * ww * 0.7,
          (Math.random() * 2 - 1) * wh * 0.7,
          (Math.random() * 2 - 1) * WORLD_D,
        );
        vel = new Vec3(
          (Math.random() * 2 - 1) * SPEED * 3,
          (Math.random() * 2 - 1) * SPEED * 3,
          (Math.random() * 2 - 1) * SPEED * 3,
        );
      }

      const isWander = type === "wander";
      const baseBankRate = isWander
        ? 0.003 + Math.random() * 0.005
        : 0.002 + Math.random() * 0.004;
      const bankDir = Math.random() > 0.5 ? 1 : -1;
      const [jr, jg, jb] = jitterColor(BR, BG, BB);

      return {
        pos,
        vel,
        acc: new Vec3(),
        type,
        flockId,
        phase: Math.random() * Math.PI * 2,
        maxSpeed: (type === "transit" ? 9.0 : 5.0) * SPEED * jitter,
        maxForce: 0.18 * SPEED * jitter,
        r: jr,
        g: jg,
        b: jb,
        wanderTarget: new Vec3(
          (Math.random() * 2 - 1) * 200,
          (Math.random() * 2 - 1) * 100,
          (Math.random() * 2 - 1) * WORLD_D * 0.6,
        ),
        wanderTimer: Math.random() * 300,
        transitDir,
        transitCooldown: 0,
        bankAngle: Math.random() * Math.PI * 2,
        bankRate: baseBankRate * bankDir,
        bankTimer: Math.floor(400 + Math.random() * 600),
        bankStrength: isWander ? 0.05 : 0.08,
      };
    }

    function initBirds() {
      birds = [];
      for (let i = 0; i < FLOCK_SIZE; i++)
        birds.push(makeBird("flock", 1, i % NUM_SUBFLOCKS));
      for (let i = 0; i < WANDERER_CNT; i++) birds.push(makeBird("wander"));

      for (let i = 0; i < TRANSIT_CNT; ) {
        const size = Math.min(2 + Math.floor(Math.random() * 2), TRANSIT_CNT - i);
        const groupY = (((Math.random() * 2 - 1) * canvas.height) / 2) * 0.7;
        const dir = Math.random() > 0.5 ? 1 : -1;
        for (let j = 0; j < size; j++) {
          const b = makeBird("transit", dir);
          b.pos.y = groupY + (Math.random() * 2 - 1) * 30;
          b.pos.x =
            dir > 0
              ? -canvas.width / 2 - 50 - Math.random() * canvas.width * 0.9
              : canvas.width / 2 + 50 + Math.random() * canvas.width * 0.9;
          birds.push(b);
        }
        i += size;
      }
    }

    // ── Steering ──────────────────────────────────────────────────────────
    // Separation, alignment and cohesion in a single neighbour pass using
    // squared distance (sqrt avoided entirely — separation weight 1/d² falls
    // straight out of the components). Results land in the shared scratch
    // vectors below; updateBird is sequential so reuse is safe.
    const _sep = new Vec3();
    const _ali = new Vec3();
    const _coh = new Vec3();
    const _steer = new Vec3();

    function flockForces(bird: Bird) {
      _sep.set(0, 0, 0);
      _ali.set(0, 0, 0);
      _coh.set(0, 0, 0);
      let sepC = 0,
        aliC = 0,
        cohC = 0;
      const member = bird.flockId >= 0;
      for (const other of birds) {
        if (other === bird) continue;
        const dx = bird.pos.x - other.pos.x;
        const dy = bird.pos.y - other.pos.y;
        const dz = bird.pos.z - other.pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 === 0) continue;
        if (d2 < SEP_R2) {
          // (pos-other).normalize()·(1/d) === (dx,dy,dz)/d²
          _sep.x += dx / d2;
          _sep.y += dy / d2;
          _sep.z += dz / d2;
          sepC++;
        }
        if (member && other.flockId === bird.flockId) {
          if (d2 < ALIGN_R2) {
            _ali.add(other.vel);
            aliC++;
          }
          if (d2 < COHERE_R2) {
            _coh.add(other.pos);
            cohC++;
          }
        }
      }
      if (sepC > 0) _sep.scale(1 / sepC).limit(bird.maxForce * 2);
      if (aliC > 0) {
        _ali.scale(1 / aliC).normalize().scale(bird.maxSpeed);
        _ali.sub(bird.vel).limit(bird.maxForce);
      }
      if (cohC > 0) {
        _coh.scale(1 / cohC).sub(bird.pos).normalize().scale(bird.maxSpeed);
        _coh.sub(bird.vel).limit(bird.maxForce);
      }
    }

    // Forces accumulate straight into bird.acc — no per-frame Vec3 allocation
    // (the prior return-a-new-Vec3 helpers churned the GC at 57 birds × 60fps).
    function applyBoundary(bird: Bird) {
      const ww = canvas.width / 2;
      const wh = canvas.height / 2;
      const bf = BOUNDARY_F;
      const m = MARGIN;
      if (bird.pos.x < -ww + m) bird.acc.x += bf * (1 - (bird.pos.x + ww) / m);
      if (bird.pos.x > ww - m) bird.acc.x += -bf * (1 - (ww - bird.pos.x) / m);
      if (bird.pos.y < -wh + m) bird.acc.y += bf * (1 - (bird.pos.y + wh) / m);
      if (bird.pos.y > wh - m) bird.acc.y += -bf * (1 - (wh - bird.pos.y) / m);
      if (bird.pos.z < -WORLD_D + m)
        bird.acc.z += bf * 2.0 * (1 - (bird.pos.z + WORLD_D) / m);
      if (bird.pos.z > WORLD_D - m)
        bird.acc.z += -bf * 2.0 * (1 - (WORLD_D - bird.pos.z) / m);
      if (bird.pos.z < Z_NEAR) {
        bird.pos.z = Z_NEAR + 5;
        bird.vel.z = Math.abs(bird.vel.z) * 0.5;
      }
    }

    function applyBanking(bird: Bird) {
      const spd = bird.vel.length();
      if (spd < 0.01) return;

      const rx = -bird.vel.z;
      const rz = bird.vel.x;
      const rlen = Math.sqrt(rx * rx + rz * rz);
      let rX: number, rZ: number;
      if (rlen < 0.1) {
        rX = Math.cos(bird.bankAngle);
        rZ = Math.sin(bird.bankAngle);
      } else {
        rX = rx / rlen;
        rZ = rz / rlen;
      }
      const s = Math.sin(bird.bankAngle) * bird.bankStrength;
      bird.acc.x += rX * s;
      bird.acc.z += rZ * s;
      bird.acc.y += Math.sin(bird.bankAngle * 0.9 + 1.2) * bird.bankStrength * 0.35;
    }

    // ── Per-bird update ───────────────────────────────────────────────────
    function updateBird(bird: Bird, dt: number) {
      const ww = canvas.width / 2;
      const wh = canvas.height / 2;

      if (bird.type === "transit" && bird.transitCooldown > 0) {
        bird.transitCooldown -= dt;
        if (bird.transitCooldown <= 0) {
          const dir = bird.transitDir;
          bird.pos.set(
            dir > 0 ? -ww - 50 : ww + 50,
            (Math.random() * 2 - 1) * wh * 0.6,
            (Math.random() * 2 - 1) * WORLD_D * 0.7,
          );
          bird.vel.set(
            dir * (5 + Math.random() * 3) * SPEED,
            (Math.random() * 0.8 - 0.4) * SPEED,
            (Math.random() * 1.2 - 0.6) * SPEED,
          );
          bird.bankAngle = Math.random() * Math.PI * 2;
        }
        return;
      }

      switch (bird.type) {
        case "flock": {
          flockForces(bird);
          bird.acc.x += _sep.x * 2.2 + _ali.x * 0.75 + _coh.x * 0.65;
          bird.acc.y += _sep.y * 2.2 + _ali.y * 0.75 + _coh.y * 0.65;
          bird.acc.z += _sep.z * 2.2 + _ali.z * 0.75 + _coh.z * 0.65;
          applyBoundary(bird);
          applyBanking(bird);
          bird.acc.y += -bird.vel.y * 0.02;
          const home = homes[bird.flockId] ?? homes[0];
          _steer
            .set(home.x - bird.pos.x, home.y - bird.pos.y, -bird.pos.z * 0.5)
            .normalize()
            .scale(bird.maxSpeed * 0.13)
            .sub(bird.vel)
            .limit(bird.maxForce * 0.4);
          bird.acc.add(_steer);
          break;
        }
        case "wander": {
          bird.wanderTimer -= dt;
          const distToTarget = bird.pos.distanceTo(bird.wanderTarget);
          if (bird.wanderTimer <= 0 || distToTarget < 80) {
            const dx = bird.wanderTarget.x - bird.pos.x;
            const dz = bird.wanderTarget.z - bird.pos.z;
            const awayX = dx !== 0 ? Math.sign(dx) : Math.random() > 0.5 ? 1 : -1;
            const awayZ = dz !== 0 ? Math.sign(dz) : Math.random() > 0.5 ? 1 : -1;
            bird.wanderTarget.set(
              bird.pos.x + awayX * (ww * 0.3 + Math.random() * ww * 0.5),
              (Math.random() * 2 - 1) * wh * 0.55,
              bird.pos.z + awayZ * (WORLD_D * 0.2 + Math.random() * WORLD_D * 0.5),
            );
            bird.wanderTarget.x = Math.max(-ww * 0.9, Math.min(ww * 0.9, bird.wanderTarget.x));
            bird.wanderTarget.z = Math.max(-WORLD_D * 0.8, Math.min(WORLD_D * 0.8, bird.wanderTarget.z));
            bird.wanderTimer = 350 + Math.random() * 450;
          }
          _steer
            .set(
              bird.wanderTarget.x - bird.pos.x,
              bird.wanderTarget.y - bird.pos.y,
              bird.wanderTarget.z - bird.pos.z,
            )
            .normalize()
            .scale(bird.maxSpeed * 0.55)
            .sub(bird.vel)
            .limit(bird.maxForce * 0.5);
          bird.acc.add(_steer);
          applyBanking(bird);
          bird.acc.y += -bird.vel.y * 0.06; // leveling
          flockForces(bird); // wander: separation only (flockId < 0)
          bird.acc.add(_sep);
          applyBoundary(bird);
          break;
        }
        case "transit": {
          bird.acc.y += Math.sin(bird.bankAngle) * 0.03;
          bird.acc.z += Math.sin(bird.bankAngle * 0.7 + 0.5) * 0.02;
          if (
            (bird.transitDir > 0 && bird.pos.x > ww + 100) ||
            (bird.transitDir < 0 && bird.pos.x < -ww - 100)
          ) {
            bird.pos.x = bird.transitDir > 0 ? -ww * 10 : ww * 10;
            bird.vel.set(0, 0, 0);
            bird.transitCooldown = Math.floor(300 + Math.random() * 300);
          }
          break;
        }
      }

      bird.bankAngle += bird.bankRate * dt;
      bird.bankTimer -= dt;
      if (bird.bankTimer <= 0) {
        const isWander = bird.type === "wander";
        const base = isWander
          ? 0.003 + Math.random() * 0.005
          : 0.002 + Math.random() * 0.004;
        const sameDir =
          Math.random() > 0.2
            ? Math.sign(bird.bankRate)
            : -Math.sign(bird.bankRate);
        bird.bankRate = base * (sameDir || 1);
        bird.bankTimer = Math.floor(400 + Math.random() * 600);
      }

      const vy = bird.vel.y;
      const dynamicMax = bird.maxSpeed * (1 - vy / (bird.maxSpeed * 3));
      bird.vel.add(bird.acc.scale(dt)).limit(Math.max(bird.maxSpeed * 0.6, dynamicMax));
      const curSpd = bird.vel.length();
      if (curSpd > 0 && curSpd < bird.maxSpeed * 0.45) {
        bird.vel.scale((bird.maxSpeed * 0.45) / curSpd);
      }
      bird.pos.x += bird.vel.x * dt;
      bird.pos.y += bird.vel.y * dt;
      bird.pos.z += bird.vel.z * dt;
      bird.acc.set(0, 0, 0);

      const flapRate = 0.08 + Math.max(0, vy / bird.maxSpeed) * 0.18;
      bird.phase =
        (bird.phase + curSpd * flapRate * dt) % (Math.PI * 2);
    }

    // ── Render ────────────────────────────────────────────────────────────
    function render() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(1, -1);

      birds.sort((a, b) => b.pos.z - a.pos.z);

      for (const bird of birds) {
        const bspeed = bird.vel.length();
        const yaw = Math.atan2(-bird.vel.z, bird.vel.x);
        const pitch =
          bspeed > 0
            ? Math.asin(Math.max(-1, Math.min(1, bird.vel.y / bspeed)))
            : 0;
        const alpha = 0.55 + 0.45 * (1 - (bird.pos.z + WORLD_D) / (WORLD_D * 2));

        drawBird(
          bird.phase,
          yaw,
          pitch,
          bird.pos.x,
          bird.pos.y,
          bird.pos.z,
          bird.r,
          bird.g,
          bird.b,
          Math.max(0.3, alpha),
        );
      }
    }

    // ── Init & lifecycle ──────────────────────────────────────────────────
    function resize() {
      const w = globalThis.innerWidth;
      const h = globalThis.innerHeight;
      if (w < 1 || h < 1) return;
      canvas.width = w;
      canvas.height = h;
      computeBirdScale();
      render();
    }

    resize();
    initBirds();

    let rafId = 0;
    let running = false;
    let lastTs = 0;

    function loop(ts: number) {
      const dt = lastTs ? Math.min(2, Math.max(0, (ts - lastTs) / 16.667)) : 1;
      lastTs = ts;
      updateHomes(dt);
      for (const bird of birds) updateBird(bird, dt);
      render();
      rafId = requestAnimationFrame(loop);
    }

    // Single source of truth — never stack concurrent rAF loops.
    function startLoop() {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
    }
    function stopLoop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");

    if (reducedMotion?.matches) {
      render();
    } else {
      startLoop();
    }

    reducedMotion?.addEventListener("change", () => {
      if (reducedMotion.matches) {
        stopLoop();
        render();
      } else {
        startLoop();
      }
    });

    const onVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else if (!reducedMotion?.matches) {
        startLoop();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    let _resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(resize, 100);
    };
    globalThis.addEventListener("resize", onResize);

    function updateBirdColors() {
      const phase = document.documentElement.dataset.skyPhase;
      const hex =
        phase && phase in BIRD_COLORS
          ? BIRD_COLORS[phase as keyof typeof BIRD_COLORS]
          : BIRD_COLORS.noon;
      const [nr, ng, nb] = hexToRgb(hex);
      BR = nr;
      BG = ng;
      BB = nb;
      for (const bird of birds) {
        [bird.r, bird.g, bird.b] = jitterColor(nr, ng, nb);
      }
    }

    canvas.style.opacity = String(PHASE_CONFIG[timeOfDay].birdOpacity);

    const unsubscribePhase = subscribeSkyPhase((phase) => {
      updateBirdColors();
      canvas.style.opacity = String(PHASE_CONFIG[phase].birdOpacity);
    });

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(_resizeTimer);
      globalThis.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribePhase();
    };
  });
</script>

<canvas
  id="birds"
  bind:this={canvas}
  class="rr-block absolute inset-0 z-20 h-full w-full pointer-events-none"
  aria-hidden="true"
></canvas>
