import type { SkyPhase } from "@orakl/shared";
import { BirdEngine, type EngineOptions } from "./engine";
import type { EventSpec, SkyEvent } from "./event";
import type { ModifierId } from "./modifiers";
import { BirdRenderer, type Ctx2D } from "./render";

const STEP = 1 / 60;
const MAX_FRAME = 0.1;
const MAX_STEPS = 8;
/** Smoothed frame ms above which the budget shrinks, below which it recovers. */
const GOVERN_SLOW = 11;
const GOVERN_FAST = 5;

/** What the control panel shows about the sky. */
export interface SkyStats {
  events: number;
  birds: number;
  drawn: number;
  /** Smoothed milliseconds per rendered frame. */
  ms: number;
  captions: string[];
  /** One short sentence per event: the kind and its modifiers. */
  sentences: string[];
}

/** A canvas that can be resized: the page's or an OffscreenCanvas in a worker. */
export interface Surface {
  width: number;
  height: number;
}

/**
 * Drives a `BirdEngine` on a 2D context: fixed 60 Hz simulation steps inside
 * an animation-frame loop that stops entirely while the sky is empty and
 * wakes on a timer for the next event. Knows nothing of the document: the
 * owner tells it when it may run (hidden tab, reduced motion) through
 * `allowed`, so the same loop runs on the page or inside a worker.
 */
export class SkyLoop {
  readonly engine: BirdEngine;
  readonly renderer = new BirdRenderer();
  /** Simulation rate multiplier. */
  speed = 1;
  /** Smoothed milliseconds per rendered frame. */
  frameMs = 0;
  /** Whether the loop may run right now (visible, motion allowed). */
  allowed = true;
  private paused = false;
  private readonly surface: Surface;
  private readonly ctx: Ctx2D;
  private readonly farSurface: Surface | null;
  private readonly farCtx: Ctx2D | null;
  private frames = 0;
  private dpr = 1;
  private raf = 0;
  private wake: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private lastTs = 0;
  private acc = 0;
  private readonly raf$: (cb: (ts: number) => void) => number;
  private readonly cancel$: (id: number) => void;

  constructor(
    surface: Surface,
    ctx: Ctx2D,
    options: EngineOptions,
    far: { surface: Surface; ctx: Ctx2D } | null = null,
  ) {
    this.surface = surface;
    this.ctx = ctx;
    this.farSurface = far?.surface ?? null;
    this.farCtx = far?.ctx ?? null;
    this.engine = new BirdEngine(options);
    this.frame = this.frame.bind(this);
    // Workers in some browsers have no requestAnimationFrame; a 60 Hz timer
    // does the same job there.
    const g = globalThis as {
      requestAnimationFrame?: typeof requestAnimationFrame;
    };
    if (typeof g.requestAnimationFrame === "function") {
      this.raf$ = (cb) => requestAnimationFrame(cb);
      this.cancel$ = (id) => cancelAnimationFrame(id);
    } else {
      this.raf$ = (cb) =>
        setTimeout(() => cb(performance.now()), 16) as unknown as number;
      this.cancel$ = (id) =>
        clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
    }
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get events(): readonly SkyEvent[] {
    return this.engine.events;
  }

  get stats(): SkyStats {
    return {
      events: this.engine.events.length,
      birds: this.engine.birdCount,
      drawn: this.renderer.drawn,
      ms: this.frameMs,
      captions: this.engine.captions,
      sentences: this.engine.sentences,
    };
  }

  draw(): void {
    const e = this.engine;
    this.renderer.draw(
      this.ctx,
      e.view,
      this.dpr,
      e.events,
      e.palette,
      this.farCtx,
    );
  }

  /** Fits the backing store to the viewport at a pixel ratio and redraws. */
  resize(width: number, height: number, dpr: number): void {
    if (width < 1 || height < 1) return;
    this.dpr = Math.min(2, dpr || 1);
    this.surface.width = Math.round(width * this.dpr);
    this.surface.height = Math.round(height * this.dpr);
    if (this.farSurface) {
      this.farSurface.width = this.surface.width;
      this.farSurface.height = this.surface.height;
    }
    this.engine.setView(width, height);
    this.draw();
  }

  setPhase(phase: SkyPhase): void {
    this.engine.setPhase(phase);
    if (!this.running) this.resume();
  }

  /** Runs the loop if birds are up, else waits for the next event. */
  resume(): void {
    if (!this.allowed) return;
    const idle = this.engine.idleFor;
    if (idle > 0) this.sleep(idle);
    else this.start();
  }

  stop(): void {
    this.running = false;
    this.cancel$(this.raf);
    clearTimeout(this.wake);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused && !this.running) this.resume();
  }

  /** Lets the phase table spawn on its own (true) or only `spawn` calls (false). */
  setAuto(on: boolean): void {
    this.engine.auto = on;
    if (!this.running) this.resume();
  }

  spawn(spec: EventSpec, mods?: ModifierId[]): SkyEvent {
    const e = this.engine.spawn(spec, mods);
    if (!this.running) this.resume();
    return e;
  }

  clear(): void {
    this.engine.events.length = 0;
    this.draw();
  }

  private start(): void {
    if (this.running || !this.allowed) return;
    clearTimeout(this.wake);
    this.running = true;
    this.lastTs = 0;
    this.acc = 0;
    this.raf = this.raf$(this.frame);
  }

  /**
   * Frame-time governor: every two seconds of frames, a slow device gets a
   * smaller bird budget for the next flocks, a fast one earns it back.
   */
  private govern(): void {
    if (++this.frames % 120 !== 0) return;
    const e = this.engine;
    if (this.frameMs > GOVERN_SLOW) e.setBudget(e.budget * 0.8);
    else if (this.frameMs < GOVERN_FAST && e.budget < 1)
      e.setBudget(e.budget * 1.15);
  }

  private sleep(seconds: number): void {
    clearTimeout(this.wake);
    if (!Number.isFinite(seconds)) return;
    this.wake = setTimeout(() => {
      // Nothing moved while asleep, so the whole gap is one step.
      this.engine.step(seconds);
      this.start();
    }, seconds * 1000);
  }

  private frame(ts: number): void {
    if (!this.running) return;
    const t0 = performance.now();
    const elapsed = this.lastTs
      ? Math.min(MAX_FRAME, (ts - this.lastTs) / 1000)
      : STEP;
    this.lastTs = ts;
    if (!this.paused) {
      this.acc += elapsed * this.speed;
      let n = 0;
      while (this.acc >= STEP && n < MAX_STEPS) {
        this.engine.step(STEP);
        this.acc -= STEP;
        n++;
      }
      if (this.acc > STEP) this.acc = 0;
    }
    this.draw();
    this.frameMs = this.frameMs * 0.9 + (performance.now() - t0) * 0.1;
    this.govern();
    if (!this.paused && this.engine.idleFor > 0) {
      // Sky is empty: stop the loop and come back for the next event.
      this.running = false;
      this.sleep(this.engine.idleFor);
      return;
    }
    this.raf = this.raf$(this.frame);
  }
}
