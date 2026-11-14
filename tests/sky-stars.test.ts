import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSTELLATIONS,
  cometTonight,
  eventTimes,
  STAR_SETTINGS,
  StarField,
  type StarSettings,
} from "@/lib/sky-stars";
import {
  loadStarSettings,
  STARS,
  setStarValue,
  starHistory,
  starLab,
  starSettings,
  starValue,
} from "@/lib/sky-stars-lab.svelte";

const HOUR = 3_600_000;

describe("constellations", () => {
  it("every figure's stars sit in its box and its lines join stars it has", () => {
    for (const [key, figure] of Object.entries(CONSTELLATIONS)) {
      expect(figure.name, key).not.toBe("");
      for (const [x, y, size] of figure.stars) {
        for (const v of [x, y, size]) {
          expect(v, key).toBeGreaterThanOrEqual(0);
          expect(v, key).toBeLessThanOrEqual(1);
        }
      }
      for (const [a, b] of figure.lines) {
        expect(figure.stars[a], key).toBeDefined();
        expect(figure.stars[b], key).toBeDefined();
        expect(a, key).not.toBe(b);
      }
    }
  });
});

describe("seeded star events", () => {
  it("gives the same times for the same seed, kind and bucket, in order, inside the bucket", () => {
    const a = eventTimes(42, "satellite", 7, 5, HOUR);
    expect(eventTimes(42, "satellite", 7, 5, HOUR)).toEqual(a);
    expect(a).toHaveLength(5);
    expect([...a].sort((x, y) => x - y)).toEqual(a);
    for (const t of a) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(HOUR);
    }
    expect(eventTimes(43, "satellite", 7, 5, HOUR)).not.toEqual(a);
    expect(eventTimes(42, "aurora", 7, 5, HOUR)).not.toEqual(a);
    expect(eventTimes(42, "satellite", 8, 5, HOUR)).not.toEqual(a);
  });

  it("sends none at a rate of nothing, and a part of one in some buckets only", () => {
    expect(eventTimes(1, "shower", 3, 0, HOUR)).toEqual([]);
    const counts = Array.from(
      { length: 400 },
      (_, b) => eventTimes(1, "shower", b, 0.25, HOUR).length,
    );
    expect(Math.max(...counts)).toBe(1);
    const some = counts.filter((n) => n === 1).length;
    expect(some).toBeGreaterThan(0);
    expect(some).toBeLessThan(counts.length);
  });

  it("a comet comes on no night at a chance of nothing and on every night at a full one", () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(cometTonight(seed, 0)).toBe(false);
      expect(cometTonight(seed, 1)).toBe(true);
    }
  });
});

describe("changing the stars' settings", () => {
  // A context that accepts every call: the field only draws to it.
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
  /** What is in the sky, read from the field's own state. */
  const sky = (field: StarField) =>
    field as unknown as {
      stars: { n: number; x: number; y: number; radius: number }[];
      figures: { key: string; x: number; y: number }[];
    };
  const places = (field: StarField) =>
    new Map(sky(field).stars.map((st) => [st.n, `${st.x},${st.y}`]));
  const made = (over: Partial<StarSettings> = {}) => {
    const field = new StarField(ctx as never, 11);
    field.setSettings({ ...structuredClone(STAR_SETTINGS), ...over });
    field.resize(1280, 800);
    // Turn the sky a while, so nothing stands where it was first laid out.
    field.step(600, Date.now());
    return field;
  };

  it("a constellation comes and goes without moving a star or another constellation", () => {
    const [first, second] = Object.keys(CONSTELLATIONS);
    if (!first || !second) throw new Error("needs two constellations");
    const field = made({
      constellations: { shown: [first], lines: false, names: false },
    });
    const stars = places(field);
    const [was] = sky(field).figures;

    field.setSettings({
      ...structuredClone(STAR_SETTINGS),
      constellations: { shown: [first, second], lines: true, names: false },
    });
    expect(places(field)).toEqual(stars);
    expect(sky(field).figures.map((f) => f.key)).toEqual([first, second]);
    expect(sky(field).figures[0]).toEqual(was);

    field.setSettings({
      ...structuredClone(STAR_SETTINGS),
      constellations: { shown: [second], lines: true, names: false },
    });
    expect(places(field)).toEqual(stars);
    expect(sky(field).figures.map((f) => f.key)).toEqual([second]);
  });

  it("fewer stars keeps the first ones where they are, and size changes move none", () => {
    const field = made();
    const stars = places(field);
    const fewer = Math.floor(STAR_SETTINGS.count / 2);
    field.setSettings({
      ...structuredClone(STAR_SETTINGS),
      count: fewer,
      size: STAR_SETTINGS.size * 2,
      faint: 1,
    });
    const now = places(field);
    expect(now.size).toBe(fewer);
    for (const [n, at] of now) expect(at).toBe(stars.get(n));

    // The stars that come back are new arrivals; the ones that stayed have not moved.
    field.setSettings(structuredClone(STAR_SETTINGS));
    const back = places(field);
    expect(back.size).toBe(STAR_SETTINGS.count);
    for (const [n, at] of now) expect(back.get(n)).toBe(at);
  });

  it("a fireball comes in from out of sight and is out of sight, tail and all, when it goes", () => {
    type M = { x: number; y: number; ux: number; uy: number; length: number };
    const out = (x: number, y: number) => x < 0 || x > 1280 || y < 0 || y > 800;
    for (let k = 0; k < 20; k++) {
      const field = made();
      const meteors = () => (field as unknown as { meteors: M[] }).meteors;
      field.send("fireball", 1000 + k);
      const start = meteors()[0];
      if (!start) throw new Error("no fireball");
      expect(out(start.x, start.y)).toBe(true);

      let last: M = { ...start };
      let seen = false;
      for (let steps = 0; meteors().length && steps < 100_000; steps++) {
        last = { ...(meteors()[0] as M) };
        seen ||= !out(last.x, last.y);
        field.step(1, Date.now());
      }
      expect(meteors()).toHaveLength(0);
      expect(seen).toBe(true);
      expect(out(last.x, last.y)).toBe(true);
      expect(
        out(last.x - last.ux * last.length, last.y - last.uy * last.length),
      ).toBe(true);
    }
  });

  it("a satellite stays until it is across the whole sky", () => {
    const field = made();
    const sats = () =>
      (field as unknown as { satellites: { x: number; vx: number }[] })
        .satellites;
    field.send("satellite", 5);
    const start = sats()[0];
    if (!start) throw new Error("no satellite");
    const right = start.vx > 0;
    let last = start.x;
    for (let steps = 0; sats().length && steps < 100_000; steps++) {
      last = (sats()[0] as { x: number }).x;
      field.step(1, Date.now());
    }
    expect(sats()).toHaveLength(0);
    if (right) expect(last).toBeGreaterThan(1280);
    else expect(last).toBeLessThan(0);
  });

  it("a sent comet comes in at rest at a side, gathers speed across the sky, and leaves it", () => {
    const field = made();
    const comet = () =>
      (field as unknown as { comet: { x: number; vx: number } | null }).comet;
    field.send("comet");
    const start = comet();
    if (!start) throw new Error("no comet");
    expect(start.vx).toBe(0);
    expect([0, 1280]).toContain(start.x);
    expect(field.busy).toBe(true);

    let last = 0;
    let steps = 0;
    for (; comet() && steps < 100_000; steps++) {
      const speed = Math.abs(comet()?.vx ?? 0);
      expect(speed).toBeGreaterThanOrEqual(last);
      last = speed;
      field.step(1, Date.now());
    }
    expect(comet()).toBeNull();
    expect(last).toBeGreaterThan(0);
  });
});

describe("star lab", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    starLab.active = false;
    starLab.settings = structuredClone(STAR_SETTINGS);
    starHistory.load();
  });

  it("gives the code's stars until the controls are open", () => {
    setStarValue(["count"], "How many", STAR_SETTINGS.count + 100);
    expect(starSettings()).toBe(STAR_SETTINGS);
    starLab.active = true;
    expect(starSettings().count).toBe(STAR_SETTINGS.count + 100);
  });

  it("sets a value by its path and undoes it", () => {
    const path = ["shooting", "every", 0];
    const was = starValue(starLab.settings, path) as number;
    setStarValue(path, "Shortest wait", was + 3);
    expect(starValue(starLab.settings, path)).toBe(was + 3);
    starHistory.undo(STARS);
    expect(starValue(starLab.settings, path)).toBe(was);
  });

  it("reads saved settings in over the code's, part by part, and refuses what is not stars", () => {
    loadStarSettings({ count: 90, shooting: { fireball: 0.5 } } as never);
    expect(starLab.settings.count).toBe(90);
    expect(starLab.settings.shooting.fireball).toBe(0.5);
    expect(starLab.settings.shooting.every).toEqual(
      STAR_SETTINGS.shooting.every,
    );
    expect(starLab.settings.aurora).toEqual(STAR_SETTINGS.aurora);
    expect(() => loadStarSettings({} as never)).toThrow();
  });
});
