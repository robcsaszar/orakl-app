import { describe, expect, it } from "vitest";
import { BirdEngine } from "@/lib/birds/engine";
import { MODIFIERS, rollModifiers } from "@/lib/birds/modifiers";
import { mulberry32 } from "@/lib/birds/rng";
import {
  defaultBirdSettings,
  RANGES,
  readBirdSettings,
} from "@/lib/birds/settings";

const STEP = 1 / 60;
const SKEIN = {
  kind: "skein" as const,
  weight: 1,
  count: [20, 20] as [number, number],
  depth: [60, 60] as [number, number],
  exact: true,
};

/** The top of a clock hour: the schedule is laid out an hour at a time, so a test that reads it must not start near an hour's end. */
const HOUR_START = 500_000 * 3600;

function engine(phase: "noon" | "night" = "noon") {
  return new BirdEngine({
    width: 1280,
    height: 800,
    phase,
    seed: 7,
    clock: () => HOUR_START,
  });
}

/** Every bird's place, to tell two flocks apart. */
function places(e: BirdEngine): number[] {
  return e.events.flatMap((ev) => [...ev.flock.px, ...ev.flock.py]);
}

describe("bird settings", () => {
  it("the default settings change nothing about the day's schedule", () => {
    const plain = engine();
    const set = engine();
    set.setSettings(defaultBirdSettings());
    // Countdowns run on the wall clock, so compare what comes, not when.
    const what = (e: BirdEngine) =>
      e.upcoming(5).map(({ kind, label, birds }) => ({ kind, label, birds }));
    expect(what(set)).toEqual(what(plain));
  });

  it("a kind's weight of nothing keeps it off the schedule", () => {
    const e = engine();
    const s = defaultBirdSettings();
    const only = s.scenarios.noon.events[0];
    for (const spec of s.scenarios.noon.events) spec.weight = 0;
    if (only) only.weight = 1;
    e.setSettings(s);
    const kinds = new Set(e.upcoming(50).map((n) => n.kind));
    expect([...kinds]).toEqual([only?.kind]);
  });

  it("a rate of nothing sends no flock, and a very high one still lays out a finite hour", () => {
    const e = engine("night");
    const s = defaultBirdSettings();
    s.scenarios.night = { ...s.scenarios.night, events: [SKEIN], perHour: 0 };
    e.setSettings(s);
    expect(e.upcoming(3)).toHaveLength(0);
    s.scenarios.night = { ...s.scenarios.night, perHour: 1e9 };
    e.setSettings(s);
    expect(e.upcoming(3).length).toBeGreaterThan(0);
  });

  it("a higher rate lays out more flocks in the hour", () => {
    const flocks = (perHour: number) => {
      const e = engine("noon");
      const s = defaultBirdSettings();
      s.scenarios.noon = { ...s.scenarios.noon, perHour };
      e.setSettings(s);
      return e.upcoming(100_000).length;
    };
    expect(flocks(60)).toBeGreaterThan(flocks(6) * 3);
  });

  it("days with birds: none at no day, and at a share only some of the days", () => {
    const withBirds = (days: number, seed: number) => {
      const e = new BirdEngine({
        width: 1280,
        height: 800,
        phase: "noon",
        seed,
      });
      const s = defaultBirdSettings();
      s.scenarios.noon = { ...s.scenarios.noon, days };
      e.setSettings(s);
      return e.upcoming(1).length > 0;
    };
    const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
    expect(seeds.some((seed) => withBirds(0, seed))).toBe(false);
    expect(seeds.every((seed) => withBirds(1, seed))).toBe(true);
    const some = seeds.filter((seed) => withBirds(0.5, seed)).length;
    expect(some).toBeGreaterThan(50);
    expect(some).toBeLessThan(150);
  });

  it("a flock that comes by itself is inside its kind's own bounds; one sent with a size may be as large as the kind allows", () => {
    const e = engine("noon");
    const s = defaultBirdSettings();
    s.limits.skein = { count: [20, 30], depth: [40, 60] };
    e.setSettings(s);
    for (let k = 0; k < 20; k++) {
      const ev = e.spawn({ kind: "skein", weight: 1 });
      expect(ev.flock.n).toBeGreaterThanOrEqual(20);
      expect(ev.flock.n).toBeLessThanOrEqual(30);
    }
    const sent = e.spawn({
      kind: "skein",
      weight: 1,
      count: [1e5, 1e5],
      exact: true,
    });
    expect(sent.flock.n).toBe(RANGES.skein.count[1]);
    // Bounds set wider than the kind allows are held to what it allows.
    s.limits.skein = { count: [1e5, 1e6], depth: [0, 1e6] };
    e.setSettings(s);
    expect(e.spawn({ kind: "skein", weight: 1 }).flock.n).toBe(
      RANGES.skein.count[1],
    );
  });

  it("saved settings from before the rates are read whole: a wait becomes its rate, one twist chance each kind's share", () => {
    const base = defaultBirdSettings();
    const { perHour: _rate, days: _days, ...noon } = base.scenarios.noon;
    const read = readBirdSettings({
      scenarios: { noon: { ...noon, interval: [20, 40] } },
      oneTwist: 0.4,
      scale: 2,
    } as never);
    expect(read.scenarios.noon.perHour).toBe(120);
    expect(read.scenarios.noon.days).toBe(1);
    expect(read.scenarios.noon.events).toEqual(base.scenarios.noon.events);
    expect(read.scenarios.dawn).toEqual(base.scenarios.dawn);
    expect(Object.values(read.twistShare)).toEqual([0.4, 0.4, 0.4, 0.4]);
    expect(read.scale).toBe(2);
    expect(read.limits).toEqual(base.limits);
    // Settings saved with the rates keep them.
    expect(readBirdSettings(structuredClone(base))).toEqual(base);
  });

  it("twist odds of nothing never roll a twist, and a weight of nothing never picks that twist", () => {
    const rng = mulberry32(3);
    const none = { one: 0, two: 0, weights: {} };
    for (let i = 0; i < 200; i++)
      expect(rollModifiers("skein", "noon", rng, 0, none)).toEqual([]);
    const skein = MODIFIERS.filter((m) => m.kind === "skein");
    const banned = skein[0]?.id;
    if (!banned) throw new Error("no skein twist to ban");
    const always = { one: 1, two: 0, weights: { [banned]: 0 } };
    for (let i = 0; i < 200; i++)
      expect(rollModifiers("skein", "noon", rng, 0, always)).not.toContain(
        banned,
      );
  });

  it("bird size comes from the settings", () => {
    const e = engine();
    const s = defaultBirdSettings();
    s.scale *= 2;
    e.setSettings(s);
    expect(e.scale).toBe(s.scale);
  });
});

describe("staging flocks", () => {
  it("lists what is up, and retires one by its id", () => {
    const e = engine();
    e.auto = false;
    e.spawn(SKEIN, []);
    const [up] = e.live();
    expect(up?.kind).toBe("skein");
    expect(up?.birds).toBe(SKEIN.count[0]);
    expect(up?.leaving).toBe(false);
    e.retire(up?.id ?? -1);
    expect(e.live()[0]?.leaving).toBe(true);
    e.clear();
    expect(e.live()).toEqual([]);
  });

  it("sends the same flock again as it was", () => {
    const e = engine();
    e.auto = false;
    e.spawn(SKEIN, []);
    const first = places(e);
    for (let i = 0; i < 120; i++) e.step(STEP);
    expect(places(e)).not.toEqual(first);
    e.replay();
    expect(places(e)).toEqual(first);
    // A fresh send is another flock.
    e.spawn(SKEIN, []);
    expect(places(e)).not.toEqual(first);
  });

  it("sends a scheduled flock now and skips the ones before it", () => {
    const e = engine();
    const queue = e.upcoming(3);
    expect(queue.length).toBe(3);
    e.sendNext(1);
    expect(e.live()[0]?.label).toBe(queue[1]?.label);
    expect(e.upcoming(1)[0]?.label).toBe(queue[2]?.label);
  });

  it("an off schedule has nothing coming", () => {
    const e = engine();
    e.auto = false;
    expect(e.upcoming()).toEqual([]);
  });
});
