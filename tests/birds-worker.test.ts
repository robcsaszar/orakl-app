import { describe, expect, it, vi } from "vitest";
import type { FromWorker } from "@/lib/birds/driver";
import { WorkerHost } from "@/lib/birds/worker-host";

// A canvas whose 2D context accepts every call: the loop only draws.
function fakeCanvas(): OffscreenCanvas {
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as OffscreenCanvas;
}

describe("WorkerHost", () => {
  it("builds the sky from init, drives it by message, and posts stats", () => {
    vi.useFakeTimers();
    const posted: FromWorker[] = [];
    const host = new WorkerHost((m) => posted.push(m));
    const canvas = fakeCanvas();
    host.handle({
      type: "init",
      canvas,
      width: 1280,
      height: 800,
      dpr: 2,
      phase: "night",
      small: false,
    });
    expect(canvas.width).toBe(2560);
    host.handle({ type: "auto", on: false });
    host.handle({
      type: "spawn",
      spec: {
        kind: "skein",
        weight: 1,
        count: [15, 15],
        depth: [60, 60],
        exact: true,
      },
      mods: ["echelon"],
    });
    vi.advanceTimersByTime(300);
    const last = posted.at(-1);
    expect(last?.type).toBe("stats");
    expect(last?.stats.events).toBe(1);
    expect(last?.stats.birds).toBe(15);
    expect(last?.stats.captions).toEqual(["Skein · echelon"]);
    host.handle({ type: "clear" });
    vi.advanceTimersByTime(300);
    expect(posted.at(-1)?.stats.events).toBe(0);
    host.dispose();
    vi.advanceTimersByTime(300);
    const n = posted.length;
    vi.advanceTimersByTime(300);
    expect(posted.length).toBe(n);
    vi.useRealTimers();
  });

  it("ignores controls before init and a canvas without a context", () => {
    const host = new WorkerHost(() => {});
    expect(() => host.handle({ type: "resume" })).not.toThrow();
    const dead = {
      width: 0,
      height: 0,
      getContext: () => null,
    } as unknown as OffscreenCanvas;
    host.handle({
      type: "init",
      canvas: dead,
      width: 10,
      height: 10,
      dpr: 1,
      phase: "noon",
      small: true,
    });
    expect(() => host.handle({ type: "clear" })).not.toThrow();
  });
});
