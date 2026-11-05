import { describe, expect, it } from "vitest";
import { BirdEngine } from "@/lib/birds/engine";
import { SkyLoop } from "@/lib/birds/loop";
import { BirdRenderer, LAYER_DEPTH } from "@/lib/birds/render";

/** A 2D context that counts fills and strokes and accepts everything else. */
function counting() {
  const n = { fill: 0, stroke: 0, image: 0 };
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, key) => {
      if (key === "fill" || key === "fillRect") return () => n.fill++;
      if (key === "stroke") return () => n.stroke++;
      if (key === "drawImage") return () => n.image++;
      return () => {};
    },
    set: () => true,
  });
  return { ctx, n };
}

describe("two-canvas layering", () => {
  it("far birds draw on the far context, near birds on the near one", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 2,
    });
    const drawAt = (depth: number) => {
      e.spawn(
        {
          kind: "skein",
          weight: 1,
          count: [15, 15],
          depth: [depth, depth],
          exact: true,
        },
        [],
      );
      for (let i = 0; i < 600; i++) e.step(1 / 60);
      const near = counting();
      const far = counting();
      new BirdRenderer().draw(
        near.ctx,
        e.view,
        1,
        e.events,
        e.palette,
        far.ctx,
      );
      return { near, far };
    };
    const a = drawAt(140);
    expect(a.far.n.image + a.far.n.stroke + a.far.n.fill).toBeGreaterThan(0);
    expect(a.near.n.image + a.near.n.fill).toBe(0);
    const b = drawAt(30);
    expect(b.near.n.image + b.near.n.fill).toBeGreaterThan(0);
    expect(LAYER_DEPTH).toBeGreaterThan(30);
    expect(LAYER_DEPTH).toBeLessThan(140);
  });

  it("the loop sizes both surfaces and the governor lowers the budget on slow frames", () => {
    const near = counting();
    const far = counting();
    const surface = { width: 0, height: 0 };
    const farSurface = { width: 0, height: 0 };
    const loop = new SkyLoop(
      surface,
      near.ctx,
      { width: 1000, height: 500, phase: "night", seed: 1 },
      { surface: farSurface, ctx: far.ctx },
    );
    loop.resize(1000, 500, 2);
    expect(surface.width).toBe(2000);
    expect(farSurface.width).toBe(2000);
    // Pretend frames are slow, then run the governor's two-second window.
    loop.frameMs = 20;
    const inner = loop as unknown as { frames: number; govern(): void };
    for (let i = 0; i < 120; i++) {
      inner.frames++;
      inner.govern();
    }
    expect(loop.engine.budget).toBeLessThan(1);
    // Fast frames earn it back.
    loop.frameMs = 2;
    for (let i = 0; i < 1200; i++) {
      inner.frames++;
      inner.govern();
    }
    expect(loop.engine.budget).toBe(1);
  });
});
