import type { FromWorker, ToWorker } from "./driver";
import { SkyLoop } from "./loop";
import type { Ctx2D } from "./render";

/**
 * The worker side of the sky: owns a `SkyLoop` on the transferred canvas,
 * applies the page's messages, and posts stats back while the page asks for them.
 * Pure message handling, so it is unit-tested without a real worker.
 */
export class WorkerHost {
  private loop: SkyLoop | null = null;
  private statsTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly post: (m: FromWorker) => void) {}

  handle(m: ToWorker): void {
    if (m.type === "init") {
      const ctx = m.canvas.getContext("2d") as Ctx2D | null;
      if (!ctx) return;
      this.loop = new SkyLoop(m.canvas, ctx, {
        width: m.width,
        height: m.height,
        small: m.small,
        phase: m.phase,
        seed: m.seed,
        wind: m.wind,
      });
      this.loop.resize(m.width, m.height, m.dpr);
      this.loop.resume();
      return;
    }
    const loop = this.loop;
    if (!loop) return;
    switch (m.type) {
      case "resize":
        loop.resize(m.width, m.height, m.dpr);
        break;
      case "phase":
        loop.setPhase(m.phase);
        break;
      case "allowed":
        loop.allowed = m.allowed;
        if (!m.allowed) loop.stop();
        break;
      case "resume":
        loop.resume();
        break;
      case "stop":
        loop.stop();
        break;
      case "draw":
        loop.draw();
        break;
      case "paused":
        loop.setPaused(m.paused);
        break;
      case "auto":
        loop.setAuto(m.on);
        break;
      case "speed":
        loop.speed = m.speed;
        break;
      case "spawn":
        loop.spawn(m.spec, m.mods);
        break;
      case "clear":
        loop.clear();
        break;
      case "settings":
        loop.setSettings(m.settings);
        break;
      case "retire":
        loop.retire(m.id);
        break;
      case "sendNext":
        loop.sendNext(m.index);
        break;
      case "replay":
        loop.replay();
        break;
      case "watch":
        this.report(m.every);
        break;
      case "wind":
        loop.engine.setWind(m.x, m.z);
        break;
      case "cue":
        loop.engine.cue(m.cue);
        break;
      case "snapshot":
        this.post({
          type: "snapshot",
          id: m.id,
          snapshot: loop.engine.snapshot(),
        });
        break;
    }
  }

  /** Posts the stats every so many ms; 0 stops them. Nobody reads them unless a panel is open. */
  private report(every: number): void {
    clearInterval(this.statsTimer);
    if (every <= 0) return;
    this.statsTimer = setInterval(() => {
      if (this.loop) this.post({ type: "stats", stats: this.loop.stats });
    }, every);
  }

  dispose(): void {
    clearInterval(this.statsTimer);
    this.loop?.stop();
    this.loop = null;
  }
}
