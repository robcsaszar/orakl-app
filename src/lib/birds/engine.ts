import type { SkyPhase } from "@orakl/shared";
import { SKY_PHASES } from "@orakl/shared";
import {
  anyVisible,
  type EventKind,
  type EventOptions,
  type EventSpec,
  type SkyEvent,
} from "./event";
import { eventSentence, type ModifierId, rollModifiers } from "./modifiers";
import { Murmuration } from "./murmuration";
import { PALETTES, SCENARIOS, type Scenario } from "./phases";
import { Raptor } from "./raptor";
import type { Palette } from "./render";
import { mulberry32, type Rng } from "./rng";
import { kindSeason } from "./season";
import { mix } from "./seed";
import { Skein } from "./skein";
import { Soar } from "./soar";
import { makeView, type View } from "./view";

export interface EngineOptions {
  width: number;
  height: number;
  phase?: SkyPhase;
  /** Narrow viewport: start with a lower bird budget. */
  small?: boolean;
  /** PRNG seed (the day's, so a lobby shares one sky); random when omitted. */
  seed?: number;
  /** Month, 0 = January; from the clock when omitted. */
  month?: number;
  /** Seconds since the epoch; `Date.now` when omitted. Tests pass a fake. */
  clock?: () => number;
  /** The sky's wind, metres per second along x and z. */
  wind?: [number, number];
}

/** Something the quiz tells the sky. */
export type SkyCue =
  | { type: "reveal"; correct: boolean }
  | { type: "lobby"; players: number };

/** What the panel's snapshot button copies. */
export interface SkySnapshot {
  seed: number;
  phase: SkyPhase;
  month: number;
  wind: [number, number];
  budget: number;
  time: number;
  events: { kind: EventKind; mods: readonly ModifierId[]; age: number }[];
}

/** One planned event on the hour's timeline. */
interface Planned {
  /** Seconds since the epoch. */
  at: number;
  spec: EventSpec;
  mods: ModifierId[];
  count: number;
  seed: number;
}

const DEFAULT_DEPTH: [number, number] = [30, 150];
/**
 * What each kind may be: bird count after tunes and modifiers, and spawn depth
 * in metres. Phase tables stay inside these; manual spawns are clamped to them
 * (a near murmuration swallows the camera, a lone goose is no skein).
 */
export const RANGES: Record<
  EventKind,
  { count: [number, number]; depth: [number, number] }
> = {
  skein: { count: [15, 80], depth: [16, 260] },
  murmuration: { count: [100, 2500], depth: [30, 120] },
  soar: { count: [2, 60], depth: [20, 160] },
  raptor: { count: [1, 6], depth: [30, 120] },
};
/** Past this multiple of maxLife an event is dropped even with birds in view. */
const HARD_CAP = 2.5;
const PALETTE_EASE = 1.5;
const HOUR = 3600;
/** Lowest the frame-time governor may push the bird budget. */
export const MIN_BUDGET = 0.35;

/**
 * Owns the sky: the viewport, the current phase's scenario and palette, the
 * active events and the timeline to the next one. Pure state machine — no
 * DOM, no timers — so the loop can run it at a fixed step and put it to
 * sleep while the sky is empty.
 *
 * Scheduled events sit on a timeline laid out per clock hour from the seed,
 * so two viewers with the same seed see the same events start at the same
 * second, with the same shapes. Only the first event after a phase change
 * is local, so nobody waits an interval for an empty sky.
 */
export class BirdEngine {
  view: View;
  readonly events: SkyEvent[] = [];
  /** Current colours, eased toward the phase's palette. */
  readonly palette: Palette;
  /** When false the phase table never spawns; events only start via `spawn`. */
  auto = true;
  readonly seed: number;
  readonly month: number;
  /** Multiplier on scheduled flock sizes, set by the frame-time governor. */
  budget: number;
  private wind: [number, number];
  private readonly ages: number[] = [];
  private readonly retired: boolean[] = [];
  /** Phase waiting for the sky to empty before its schedule takes over. */
  private pending: SkyPhase | null = null;
  /** Direction every skein of the current phase flies. */
  private skeinDir = 1;
  private readonly rng: Rng;
  private phase: SkyPhase;
  private scenario: Scenario;
  private target: Palette;
  /** Seconds since the epoch, advanced by `step`. */
  private time: number;
  private timeline: Planned[] = [];
  private timelineHour = -1;
  /** A local, unsynced first event after a phase change; seconds to go. */
  private firstIn = Number.POSITIVE_INFINITY;

  constructor(o: EngineOptions) {
    this.view = makeView(o.width, o.height);
    const clock = o.clock ?? (() => Date.now() / 1000);
    this.time = clock();
    this.seed = o.seed ?? (Math.random() * 2 ** 32) >>> 0;
    this.rng = mulberry32(mix(this.seed, 0x1ead));
    this.month = o.month ?? new Date(this.time * 1000).getMonth();
    this.budget = o.small ? 0.6 : 1;
    this.wind = o.wind ?? [0, 0];
    this.phase = o.phase ?? "noon";
    this.scenario = SCENARIOS[this.phase];
    this.target = PALETTES[this.phase];
    const p = this.target;
    this.palette = {
      body: [p.body[0], p.body[1], p.body[2]],
      fog: [p.fog[0], p.fog[1], p.fog[2]],
      lit: p.lit,
    };
    this.applyPhase(this.phase);
  }

  setView(width: number, height: number): void {
    this.view = makeView(width, height);
  }

  setWind(x: number, z: number): void {
    this.wind = [x, z];
  }

  setBudget(b: number): void {
    this.budget = Math.min(1, Math.max(MIN_BUDGET, b));
  }

  /**
   * Switches the palette now; the scenario follows once the sky is empty.
   * Events already up are asked to leave, and nothing new spawns until the
   * last bird has flown out, so two phases never share the sky.
   */
  setPhase(phase: SkyPhase): void {
    if (phase === this.phase && this.pending === null) return;
    this.target = PALETTES[phase];
    if (this.events.length === 0) {
      this.applyPhase(phase);
      return;
    }
    this.pending = phase;
    for (let i = 0; i < this.events.length; i++) this.retireAt(i);
  }

  private applyPhase(phase: SkyPhase): void {
    this.pending = null;
    this.phase = phase;
    this.scenario = SCENARIOS[phase];
    const phaseRng = mulberry32(mix(this.seed, SKY_PHASES.indexOf(phase), 7));
    this.skeinDir = phaseRng.sign();
    this.timelineHour = -1;
    this.plan();
    // Don't leave the sky empty until the timeline's next slot: one local
    // event soon, then the shared timeline.
    const next = this.timeline[0];
    const first = this.scenario.first;
    this.firstIn =
      this.scenario.events.length === 0
        ? Number.POSITIVE_INFINITY
        : next && next.at - this.time <= first[1]
          ? Number.POSITIVE_INFINITY
          : this.rng.range(first[0], first[1]);
  }

  /** Lays out this clock hour's events from the seed, dropping ones already past. */
  private plan(): void {
    const hour = Math.floor(this.time / HOUR);
    if (hour === this.timelineHour) return;
    this.timelineHour = hour;
    this.timeline = [];
    const sc = this.scenario;
    if (sc.events.length === 0) return;
    const rng = mulberry32(
      mix(this.seed, SKY_PHASES.indexOf(this.phase), hour, this.month),
    );
    let t = rng.range(sc.first[0], sc.first[1]);
    while (t < HOUR) {
      const spec = this.pick(rng);
      const mods = rollModifiers(spec.kind, this.phase, rng, this.month);
      this.timeline.push({
        at: hour * HOUR + t,
        spec,
        mods,
        count: this.baseCount(spec, rng),
        seed: rng.int(0, 2 ** 31 - 1),
      });
      t += rng.range(sc.interval[0], sc.interval[1]);
    }
    this.timeline = this.timeline.filter((e) => e.at > this.time);
  }

  private retireAt(i: number): void {
    if (this.retired[i]) return;
    this.retired[i] = true;
    this.events[i].retire();
  }

  /** Captions of the events now in the sky, e.g. ["Skein · echelon"]. */
  get captions(): string[] {
    return this.events.map((e) => e.label);
  }

  /** The same as sentences, e.g. ["A skein of geese in one echelon line."]. */
  get sentences(): string[] {
    return this.events.map((e) => eventSentence(e.kind, e.mods));
  }

  get birdCount(): number {
    let n = 0;
    for (const e of this.events) for (const f of e.flocks) n += f.n;
    return n;
  }

  /**
   * Seconds until something next needs stepping: 0 while birds are up, the
   * time to the next event when the sky is empty, Infinity when this phase
   * never has birds.
   */
  get idleFor(): number {
    if (this.events.length > 0) return 0;
    if (this.pending !== null) return 0;
    if (!this.auto) return Number.POSITIVE_INFINITY;
    const next = this.timeline[0];
    const planned = next ? next.at - this.time : Number.POSITIVE_INFINITY;
    const idle = Math.min(this.firstIn, planned);
    if (!Number.isFinite(idle) && this.scenario.events.length > 0) {
      // Nothing left this hour: wake at the top of the next.
      return (this.timelineHour + 1) * HOUR - this.time + 0.01;
    }
    return Math.max(0, idle);
  }

  /** Advances the sky by dt seconds. */
  step(dt: number): void {
    this.time += dt;
    this.easePalette(dt);
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      e.update(dt);
      this.ages[i] += dt;
      if (this.ages[i] > e.maxLife) this.retireAt(i);
      // Birds never vanish mid-sky: a finished or expired event stays until
      // its last bird has flown out of view.
      const over = e.done || this.retired[i];
      if (
        (over && !anyVisible(e, this.view)) ||
        this.ages[i] > e.maxLife * HARD_CAP
      ) {
        this.events.splice(i, 1);
        this.ages.splice(i, 1);
        this.retired.splice(i, 1);
      }
    }
    if (this.pending !== null) {
      if (this.events.length === 0) this.applyPhase(this.pending);
      return;
    }
    if (!this.auto) return;
    this.plan();
    const room = this.events.length === 0;
    if (Number.isFinite(this.firstIn)) {
      this.firstIn -= dt;
      if (this.firstIn <= 0) {
        this.firstIn = Number.POSITIVE_INFINITY;
        if (room) this.spawn();
      }
    }
    // Timeline slots that come due start if the sky is empty; a busy sky skips them.
    while (this.timeline.length > 0 && this.timeline[0].at <= this.time) {
      const e = this.timeline.shift() as Planned;
      if (this.events.length === 0) this.spawnPlanned(e);
    }
  }

  private easePalette(dt: number): void {
    const k = Math.min(1, dt / PALETTE_EASE);
    const p = this.palette;
    const t = this.target;
    for (let i = 0; i < 3; i++) {
      p.body[i] += (t.body[i] - p.body[i]) * k;
      p.fog[i] += (t.fog[i] - p.fog[i]) * k;
    }
    p.lit += (t.lit - p.lit) * k;
  }

  private pick(rng: Rng): EventSpec {
    const specs = this.scenario.events;
    const weight = (s: EventSpec) => s.weight * kindSeason(s.kind, this.month);
    let total = 0;
    for (const s of specs) total += weight(s);
    let r = rng.range(0, total);
    for (const s of specs) {
      r -= weight(s);
      if (r <= 0) return s;
    }
    return specs[specs.length - 1];
  }

  private baseCount(spec: EventSpec, rng: Rng): number {
    const [lo, hi] = spec.count ?? [1, 1];
    return rng.int(lo, hi);
  }

  /** Final bird count: tunes, modifiers and the budget on a base count. */
  private finalCount(
    spec: EventSpec,
    base: number,
    mods: ModifierId[],
  ): number {
    let n = base;
    if (!spec.exact) n = Math.round(n * this.budget);
    if (spec.kind === "murmuration") {
      n = Math.round(n * this.scenario.tune.murmuration.size);
      if (mods.includes("giant")) n *= 2;
    }
    if (spec.kind === "soar" && mods.includes("frenzy")) {
      n = Math.round(n * 1.5);
    }
    const [lo, hi] = RANGES[spec.kind].count;
    return Math.min(hi, Math.max(lo, n));
  }

  private build(
    spec: EventSpec,
    mods: ModifierId[],
    count: number,
    rng: Rng,
  ): SkyEvent {
    const [near, far] = RANGES[spec.kind].depth;
    const clampZ = (z: number) => Math.min(far, Math.max(near, z));
    const [lo, hi] = spec.depth ?? DEFAULT_DEPTH;
    const o: EventOptions = {
      count: this.finalCount(spec, count, mods),
      depth: [clampZ(lo), clampZ(hi)],
      phase: this.phase,
      tune: this.scenario.tune,
      mods,
      dir: spec.kind === "skein" ? this.skeinDir : undefined,
      wind: this.wind,
    };
    let e: SkyEvent;
    switch (spec.kind) {
      case "skein":
        e = new Skein(this.view, rng, o);
        break;
      case "murmuration":
        e = new Murmuration(this.view, rng, o);
        break;
      case "soar":
        e = new Soar(this.view, rng, o);
        break;
      case "raptor":
        e = new Raptor(this.view, rng, o);
        break;
    }
    this.events.push(e);
    this.ages.push(0);
    this.retired.push(false);
    return e;
  }

  private spawnPlanned(p: Planned): SkyEvent {
    return this.build(p.spec, p.mods, p.count, mulberry32(p.seed));
  }

  /**
   * Starts one event now: the given spec, or a weighted pick from the phase
   * table, with its modifiers rolled from the phase and month unless the
   * spec names them. Local to this viewer, not on the shared timeline. One
   * event at a time: whatever is up is dropped first.
   */
  spawn(
    spec: EventSpec = this.pick(this.rng),
    forced?: ModifierId[],
  ): SkyEvent {
    this.events.length = 0;
    this.ages.length = 0;
    this.retired.length = 0;
    const mods =
      forced ??
      spec.mods ??
      rollModifiers(spec.kind, this.phase, this.rng, this.month);
    return this.build(spec, mods, this.baseCount(spec, this.rng), this.rng);
  }

  /** The quiz's nudge: a reveal moves a murmuration, the lobby fills the gulls. */
  cue(cue: SkyCue): void {
    for (const e of this.events) {
      if (cue.type === "reveal" && e instanceof Murmuration) {
        e.react(cue.correct ? "lift" : "jink");
        return;
      }
      if (cue.type === "lobby" && e instanceof Soar) {
        e.setWanted(cue.players);
        return;
      }
    }
  }

  snapshot(): SkySnapshot {
    return {
      seed: this.seed,
      phase: this.phase,
      month: this.month,
      wind: [this.wind[0], this.wind[1]],
      budget: this.budget,
      time: this.time,
      events: this.events.map((e, i) => ({
        kind: e.kind,
        mods: e.mods,
        age: this.ages[i],
      })),
    };
  }
}
