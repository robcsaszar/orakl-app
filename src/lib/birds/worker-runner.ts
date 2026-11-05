import type { SkyPhase } from "@orakl/shared";
import type { FromWorker, SkyDriver, ToWorker } from "./driver";
import type { SkyCue, SkySnapshot } from "./engine";
import type { EventSpec } from "./event";
import type { SkyStats } from "./loop";
import type { ModifierId } from "./modifiers";

/**
 * The page side of a sky that runs in a worker: hands the canvas over as an
 * OffscreenCanvas, forwards every control as a message, and keeps the last
 * stats the worker posted.
 */
export class WorkerRunner implements SkyDriver {
  stats: SkyStats = {
    events: 0,
    birds: 0,
    drawn: 0,
    ms: 0,
    captions: [],
    sentences: [],
  };
  private readonly worker: Worker;
  private speed$ = 1;
  private readonly waiting = new Map<number, (s: SkySnapshot) => void>();
  private nextId = 1;

  constructor(
    canvas: HTMLCanvasElement,
    far: HTMLCanvasElement | null,
    worker: Worker,
    options: {
      width: number;
      height: number;
      phase: SkyPhase;
      small: boolean;
      seed: number;
      wind: [number, number];
    },
  ) {
    this.worker = worker;
    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      if (e.data.type === "stats") this.stats = e.data.stats;
      else if (e.data.type === "snapshot") {
        this.waiting.get(e.data.id)?.(e.data.snapshot);
        this.waiting.delete(e.data.id);
      }
    };
    const offscreen = canvas.transferControlToOffscreen();
    const farOff = far ? far.transferControlToOffscreen() : null;
    const init: ToWorker = {
      type: "init",
      canvas: offscreen,
      far: farOff,
      seed: options.seed,
      wind: options.wind,
      width: options.width,
      height: options.height,
      dpr: Math.min(2, globalThis.devicePixelRatio || 1),
      phase: options.phase,
      small: options.small,
    };
    worker.postMessage(init, farOff ? [offscreen, farOff] : [offscreen]);
  }

  private send(m: ToWorker): void {
    this.worker.postMessage(m);
  }

  get speed(): number {
    return this.speed$;
  }

  set speed(v: number) {
    this.speed$ = v;
    this.send({ type: "speed", speed: v });
  }

  resize(width: number, height: number): void {
    this.send({
      type: "resize",
      width,
      height,
      dpr: Math.min(2, globalThis.devicePixelRatio || 1),
    });
  }

  setPhase(phase: SkyPhase): void {
    this.send({ type: "phase", phase });
  }

  /** Tells the worker whether it may run (visible tab, motion allowed). */
  setAllowed(allowed: boolean): void {
    this.send({ type: "allowed", allowed });
  }

  resume(): void {
    this.send({ type: "resume" });
  }

  stop(): void {
    this.send({ type: "stop" });
  }

  draw(): void {
    this.send({ type: "draw" });
  }

  setPaused(paused: boolean): void {
    this.send({ type: "paused", paused });
  }

  setAuto(on: boolean): void {
    this.send({ type: "auto", on });
  }

  spawn(spec: EventSpec, mods?: ModifierId[]): void {
    this.send({ type: "spawn", spec, mods });
  }

  clear(): void {
    this.send({ type: "clear" });
  }

  setWind(x: number, z: number): void {
    this.send({ type: "wind", x, z });
  }

  cue(cue: SkyCue): void {
    this.send({ type: "cue", cue });
  }

  snapshot(): Promise<SkySnapshot> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.waiting.set(id, resolve);
      this.send({ type: "snapshot", id });
    });
  }

  dispose(): void {
    this.worker.terminate();
  }
}
