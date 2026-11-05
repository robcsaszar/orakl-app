import type { FromWorker, ToWorker } from "./driver";
import { SkyLoop } from "./loop";
import type { Ctx2D } from "./render";

const STATS_EVERY = 250;

/**
 * The worker side of the sky: owns a `SkyLoop` on the transferred canvas,
 * applies the page's messages, and posts stats back a few times a second.
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
      const farCtx = m.far ? (m.far.getContext("2d") as Ctx2D | null) : null;
      this.loop = new SkyLoop(
        m.canvas,
        ctx,
        {
          width: m.width,
          height: m.height,
          small: m.small,
          phase: m.phase,
          seed: m.seed,
          wind: m.wind,
        },
        m.far && farCtx ? { surface: m.far, ctx: farCtx } : null,
      );
      this.loop.resize(m.width, m.height, m.dpr);
      this.loop.resume();
      this.statsTimer = setInterval(() => {
        if (this.loop) this.post({ type: "stats", stats: this.loop.stats });
      }, STATS_EVERY);
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

  dispose(): void {
    clearInterval(this.statsTimer);
    this.loop?.stop();
    this.loop = null;
  }
}
