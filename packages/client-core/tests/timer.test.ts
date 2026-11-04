import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCountdown } from "../src/index.js";
import { COUNTDOWN_TICK_MS } from "../src/timer.ts";

describe("createCountdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls onTick every second with decreasing values", () => {
    const ticks: number[] = [];
    const timer = createCountdown({
      onTick: (t) => ticks.push(t),
      onExpire: () => {},
    });

    timer.start(3);
    vi.advanceTimersByTime(3 * COUNTDOWN_TICK_MS);

    expect(ticks).toEqual([2, 1, 0]);
  });

  it("calls onExpire when reaching 0", () => {
    const onExpire = vi.fn();
    const timer = createCountdown({ onTick: () => {}, onExpire });

    timer.start(2);
    vi.advanceTimersByTime(2 * COUNTDOWN_TICK_MS);

    expect(onExpire).toHaveBeenCalledOnce();
  });

  it("stops ticking after expiry", () => {
    const ticks: number[] = [];
    const timer = createCountdown({
      onTick: (t) => ticks.push(t),
      onExpire: () => {},
    });

    timer.start(2);
    vi.advanceTimersByTime(5 * COUNTDOWN_TICK_MS);

    expect(ticks).toEqual([1, 0]);
    expect(timer.running).toBe(false);
  });

  it("stop() cancels the countdown", () => {
    const ticks: number[] = [];
    const onExpire = vi.fn();
    const timer = createCountdown({
      onTick: (t) => ticks.push(t),
      onExpire,
    });

    timer.start(5);
    vi.advanceTimersByTime(2 * COUNTDOWN_TICK_MS);
    timer.stop();
    vi.advanceTimersByTime(5 * COUNTDOWN_TICK_MS);

    expect(ticks).toEqual([4, 3]);
    expect(onExpire).not.toHaveBeenCalled();
    expect(timer.running).toBe(false);
  });

  it("start() restarts if already running", () => {
    const ticks: number[] = [];
    const timer = createCountdown({
      onTick: (t) => ticks.push(t),
      onExpire: () => {},
    });

    timer.start(3);
    vi.advanceTimersByTime(COUNTDOWN_TICK_MS); // tick: 2
    timer.start(5); // restart
    vi.advanceTimersByTime(COUNTDOWN_TICK_MS); // tick: 4

    expect(ticks).toEqual([2, 4]);
    expect(timer.running).toBe(true);
  });

  it("running reflects active state", () => {
    const timer = createCountdown({ onTick: () => {}, onExpire: () => {} });

    expect(timer.running).toBe(false);
    timer.start(3);
    expect(timer.running).toBe(true);
    timer.stop();
    expect(timer.running).toBe(false);
  });

  it("handles duration of 1", () => {
    const onExpire = vi.fn();
    const ticks: number[] = [];
    const timer = createCountdown({
      onTick: (t) => ticks.push(t),
      onExpire,
    });

    timer.start(1);
    vi.advanceTimersByTime(COUNTDOWN_TICK_MS);

    expect(ticks).toEqual([0]);
    expect(onExpire).toHaveBeenCalledOnce();
  });
});
