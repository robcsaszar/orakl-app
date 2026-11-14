import { describe, expect, it, vi } from "vitest";
import type { FromWorker } from "@/lib/birds/driver";
import { defaultBirdSettings } from "@/lib/birds/settings";
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
    // Nothing is posted until the page asks.
    vi.advanceTimersByTime(1000);
    expect(posted).toHaveLength(0);
    host.handle({ type: "watch", every: 250 });
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

  it("takes settings and staging by message, and reports faster while watched", () => {
    vi.useFakeTimers();
    // The schedule is laid out a clock hour at a time: start at the top of one, so flocks are still to come.
    vi.setSystemTime(1_800_000_000_000);
    const posted: FromWorker[] = [];
    const host = new WorkerHost((m) => posted.push(m));
    host.handle({
      type: "init",
      canvas: fakeCanvas(),
      seed: 5,
      wind: [0, 0],
      width: 1280,
      height: 800,
      dpr: 1,
      phase: "noon",
      small: false,
    });
    host.handle({ type: "watch", every: 250 });
    const stats = () => {
      const last = posted.at(-1);
      if (last?.type !== "stats") throw new Error("no stats posted");
      return last.stats;
    };
    vi.advanceTimersByTime(300);
    expect(stats().next.length).toBeGreaterThan(0);
    host.handle({ type: "sendNext", index: 0 });
    vi.advanceTimersByTime(300);
    const [up] = stats().live;
    expect(up).toBeDefined();
    host.handle({ type: "retire", id: up?.id ?? -1 });
    vi.advanceTimersByTime(300);
    // A flock asked to leave is on its way out, or out of sight and gone.
    expect(stats().live.every((e) => e.leaving)).toBe(true);

    const settings = defaultBirdSettings();
    settings.scenarios.noon.events = [];
    host.handle({ type: "settings", settings });
    vi.advanceTimersByTime(300);
    expect(stats().next).toEqual([]);

    const slow = posted.length;
    vi.advanceTimersByTime(1000);
    const perSecond = posted.length - slow;
    host.handle({ type: "watch", every: 50 });
    const fast = posted.length;
    vi.advanceTimersByTime(1000);
    expect(posted.length - fast).toBeGreaterThan(perSecond);
    host.dispose();
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
