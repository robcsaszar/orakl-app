import type { SkyPhase } from "@orakl/shared";
import type { SkyDriver } from "./driver";
import type { EngineOptions, SkyCue, SkySnapshot } from "./engine";
import type { EventSpec, SkyEvent } from "./event";
import { SkyLoop, type SkyStats } from "./loop";
import type { ModifierId } from "./modifiers";
import type { Ctx2D } from "./render";

/**
 * The sky on the page's own thread: a `SkyLoop` on the page canvas. The
 * fallback where OffscreenCanvas is missing, and what tests drive directly.
 */
export class BirdRunner implements SkyDriver {
  readonly loop: SkyLoop;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: Ctx2D,
    options: EngineOptions,
    far: { surface: HTMLCanvasElement; ctx: Ctx2D } | null = null,
  ) {
    this.loop = new SkyLoop(canvas, ctx, options, far);
  }

  get engine() {
    return this.loop.engine;
  }

  get events(): readonly SkyEvent[] {
    return this.loop.events;
  }

  get stats(): SkyStats {
    return this.loop.stats;
  }

  get speed(): number {
    return this.loop.speed;
  }

  set speed(v: number) {
    this.loop.speed = v;
  }

  /** Whether the loop may run (visible tab, motion allowed). */
  setAllowed(allowed: boolean): void {
    this.loop.allowed = allowed;
    if (!allowed) this.loop.stop();
  }

  resize(width: number, height: number): void {
    this.loop.resize(width, height, globalThis.devicePixelRatio || 1);
  }

  setPhase(phase: SkyPhase): void {
    this.loop.setPhase(phase);
  }

  resume(): void {
    this.loop.resume();
  }

  stop(): void {
    this.loop.stop();
  }

  draw(): void {
    this.loop.draw();
  }

  setPaused(paused: boolean): void {
    this.loop.setPaused(paused);
  }

  setAuto(on: boolean): void {
    this.loop.setAuto(on);
  }

  spawn(spec: EventSpec, mods?: ModifierId[]): SkyEvent {
    return this.loop.spawn(spec, mods);
  }

  clear(): void {
    this.loop.clear();
  }

  setWind(x: number, z: number): void {
    this.loop.engine.setWind(x, z);
  }

  cue(cue: SkyCue): void {
    this.loop.engine.cue(cue);
  }

  snapshot(): Promise<SkySnapshot> {
    return Promise.resolve(this.loop.engine.snapshot());
  }

  dispose(): void {
    this.loop.stop();
  }
}
