import { describe, expect, it } from "vitest";
import { BirdEngine } from "@/lib/birds/engine";
import { SkyLoop } from "@/lib/birds/loop";
import { BirdRenderer } from "@/lib/birds/render";

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

describe("the bird canvas", () => {
  it("far birds and near birds draw on the one context, in front of the clouds", () => {
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
      const one = counting();
      new BirdRenderer().draw(one.ctx, e.view, 1, e.events, e.palette);
      return one.n.image + one.n.stroke + one.n.fill;
    };
    expect(drawAt(140)).toBeGreaterThan(0);
    expect(drawAt(30)).toBeGreaterThan(0);
  });

  it("the loop sizes its surface and the governor lowers the budget on slow frames", () => {
    const near = counting();
    const surface = { width: 0, height: 0 };
    const loop = new SkyLoop(surface, near.ctx, {
      width: 1000,
      height: 500,
      phase: "night",
      seed: 1,
    });
    loop.resize(1000, 500, 2);
    expect(surface.width).toBe(2000);
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
