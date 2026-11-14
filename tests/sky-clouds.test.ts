import { describe, expect, it } from "vitest";
import {
  CLOUD_COPY,
  CLOUD_MODEL,
  CLOUD_PRESETS,
  CLOUD_SETTINGS,
  carryProgress,
  cloudLayout,
  cloudMotion,
  cloudPuffs,
  cloudRange,
  cloudsInSky,
  cloudsShown,
  drawCloud,
  paintRows,
  skyClouds,
  templateOver,
} from "@/lib/sky-clouds";
import { CALM } from "@/lib/sky-wind";

/** The settings with the pool emptied of its own designs, shared shape and counts: the day's clouds as they come. */
const PLAIN = {
  ...CLOUD_SETTINGS,
  model: {},
  edits: {},
  removed: [],
  inSky: {},
};

describe("cloudLayout", () => {
  it("is the same for the same seed", () => {
    expect(cloudLayout(7, 5)).toEqual(cloudLayout(7, 5));
  });

  it("differs by seed", () => {
    expect(cloudLayout(7, 5)).not.toEqual(cloudLayout(8, 5));
  });

  it("gives wider clouds a longer crossing and a softer edge", () => {
    const byWidth = cloudLayout(7, 9).sort((a, b) => a.width - b.width);
    for (let i = 1; i < byWidth.length; i++) {
      expect(byWidth[i]?.dur).toBeGreaterThan(byWidth[i - 1]?.dur ?? 0);
      expect(byWidth[i]?.blur).toBeGreaterThanOrEqual(
        byWidth[i - 1]?.blur ?? 0,
      );
    }
  });

  it("starts every cloud mid-crossing", () => {
    for (const c of cloudLayout(7, 6)) {
      expect(c.delay).toBeLessThanOrEqual(0);
      expect(-c.delay).toBeLessThanOrEqual(c.dur);
    }
  });
});

describe("cloudsShown", () => {
  it("thins the cover in calm phases", () => {
    const calm = Object.keys(CALM)[0] as keyof typeof CALM;
    expect(cloudsShown(calm, 6)).toBeLessThan(cloudsShown("noon", 6));
  });
});

describe("cloudMotion", () => {
  it("paces faster, stretches more and thins in stronger wind", () => {
    const slow = cloudMotion({ x: 0.3, z: 0 });
    const fast = cloudMotion({ x: 2.5, z: 0 });
    expect(fast.pace).toBeGreaterThan(slow.pace);
    expect(fast.stretch).toBeGreaterThan(slow.stretch);
    expect(fast.thin).toBeLessThan(slow.thin);
  });

  it("goes the way the wind goes", () => {
    expect(cloudMotion({ x: 1, z: 0 }).dir).toBe(1);
    expect(cloudMotion({ x: -1, z: 0 }).dir).toBe(-1);
  });
});

describe("carryProgress", () => {
  const cloud = cloudLayout(7, 1)[0] as ReturnType<typeof cloudLayout>[number];
  const progress = (t: number, m: ReturnType<typeof cloudMotion>) => {
    const dur = cloud.dur / m.pace;
    return ((((t - cloud.delay) % dur) + dur) % dur) / dur;
  };

  it("keeps the crossing's fraction when the pace changes", () => {
    const from = cloudMotion({ x: 0.5, z: 0 });
    const to = cloudMotion({ x: 2.5, z: 0 });
    const at = 37;
    const carried = carryProgress(cloud, at, from, to);
    expect(progress(carried, to)).toBeCloseTo(progress(at, from), 6);
  });

  it("never lands before the animation's start", () => {
    const from = cloudMotion({ x: 2.5, z: 0 });
    const to = cloudMotion({ x: 0.2, z: 0 });
    for (let at = 0; at < 400; at += 7) {
      expect(carryProgress(cloud, at, from, to)).toBeGreaterThanOrEqual(0);
    }
  });

  it("mirrors the fraction when the wind turns", () => {
    const from = cloudMotion({ x: 1, z: 0 });
    const to = cloudMotion({ x: -1, z: 0 });
    const at = 37;
    const carried = carryProgress(cloud, at, from, to);
    expect(progress(carried, to)).toBeCloseTo(1 - progress(at, from), 6);
  });
});

describe("cloudPuffs", () => {
  it("is the same for the same seed and differs by seed", () => {
    expect(cloudPuffs(3)).toEqual(cloudPuffs(3));
    expect(cloudPuffs(3)).not.toEqual(cloudPuffs(4));
  });

  it("grows lobes on every body puff when the model asks for them", () => {
    const flat = cloudPuffs(3, { ...CLOUD_MODEL, depth: 0 });
    const grown = cloudPuffs(3, { ...CLOUD_MODEL, depth: 1 });
    expect(flat).toHaveLength(CLOUD_MODEL.body);
    expect(grown).toHaveLength(CLOUD_MODEL.body * (1 + CLOUD_MODEL.tower));
  });

  it("makes each lobe smaller and no fainter than its parent", () => {
    const [parent, lobe] = cloudPuffs(3, {
      ...CLOUD_MODEL,
      depth: 1,
      tower: 1,
    });
    expect(lobe?.rx).toBeLessThan(parent?.rx ?? 0);
    expect(lobe?.ry).toBeLessThan(parent?.ry ?? 0);
    expect(lobe?.y).toBeLessThan(parent?.y ?? 0);
  });

  it("keeps existing puffs in place when a knob adds lobes", () => {
    const fewer = cloudPuffs(3, { ...CLOUD_MODEL, depth: 1, tower: 1 });
    const more = cloudPuffs(3, { ...CLOUD_MODEL, depth: 1, tower: 2 });
    expect(more.slice(0, 2)).toEqual(fewer.slice(0, 2));
  });

  it("sits still without wobble and sways with it as time runs", () => {
    expect(cloudPuffs(3, CLOUD_MODEL, 1, 0)).toEqual(
      cloudPuffs(3, CLOUD_MODEL, 2, 0),
    );
    const a = cloudPuffs(3, CLOUD_MODEL, 1, 0.1);
    const b = cloudPuffs(3, CLOUD_MODEL, 2, 0.1);
    expect(a).not.toEqual(b);
    for (let i = 0; i < a.length; i++) {
      expect(Math.abs((a[i]?.x ?? 0) - (b[i]?.x ?? 0))).toBeLessThan(
        (a[i]?.rx ?? 0) * 2,
      );
    }
  });
});

describe("cloudPuffs fit", () => {
  it("keeps every genus inside its canvas", () => {
    for (const preset of Object.values(CLOUD_PRESETS)) {
      const m = { ...CLOUD_MODEL, ...preset.model };
      const height = 400 / m.aspect;
      for (const q of cloudPuffs(3, m)) {
        expect(q.x - q.rx).toBeGreaterThanOrEqual(-0.01);
        expect(q.x + q.rx).toBeLessThanOrEqual(400.01);
        expect(q.y - q.ry).toBeGreaterThanOrEqual(-0.01);
        expect(q.y + q.ry).toBeLessThanOrEqual(height + 0.01);
      }
    }
  });

  it("drops small puffs and thins large ones where the erosion runs deep", () => {
    const whole = cloudPuffs(3);
    const eroded = cloudPuffs(3, CLOUD_MODEL, 0, 0, () => 1);
    expect(eroded.length).toBeLessThan(whole.length);
    expect(Math.max(...eroded.map((q) => q.a))).toBeLessThan(
      Math.max(...whole.map((q) => q.a)),
    );
  });
});

describe("paintRows", () => {
  it("gives a tall canvas more rows than a wide one", () => {
    expect(paintRows({ ...CLOUD_MODEL, aspect: 1 })).toBeGreaterThan(
      paintRows({ ...CLOUD_MODEL, aspect: 3 }),
    );
  });
});

describe("skyClouds", () => {
  // A pool with nothing of its own, so each test sets what it reads.
  const settings = { ...PLAIN, count: 4 };

  it("lays out the day's clouds with ids in order", () => {
    expect(skyClouds(7, settings).map((c) => c.id)).toEqual([0, 1, 2, 3]);
  });

  it("skips a removed cloud and leaves the others as they were", () => {
    const before = skyClouds(7, settings);
    const after = skyClouds(7, { ...settings, count: 3, removed: [1] });
    expect(after.map((c) => c.id)).toEqual([0, 2, 3]);
    expect(after[1]).toEqual(before[2]);
  });

  it("lays an edit over its cloud only", () => {
    const before = skyClouds(7, settings);
    const after = skyClouds(7, {
      ...settings,
      edits: {
        2: {
          name: "anvil",
          top: 50,
          width: 80,
          height: 2,
          seed: 99,
          model: { body: 9 },
          paint: { "1,1": 1 },
        },
      },
    });
    expect(after[2]).toMatchObject({
      name: "anvil",
      top: 50,
      width: 80,
      height: 2,
      seed: 99,
      paint: { "1,1": 1 },
    });
    expect(after[2]?.model.body).toBe(9);
    expect(after[2]?.dur).toBe(before[2]?.dur);
    expect(after[0]).toEqual(before[0]);
  });

  it("applies the shared model under each cloud's own", () => {
    const [a, b] = skyClouds(7, {
      ...settings,
      model: { body: 2, depth: 1 },
      edits: { 1: { model: { body: 7 } } },
    });
    expect([a?.model.body, a?.model.depth]).toEqual([2, 1]);
    expect([b?.model.body, b?.model.depth]).toEqual([7, 1]);
  });

  it("gives clouds past the number of shapes a shape already used", () => {
    const seeds = skyClouds(7, { ...settings, shapes: 2 }).map((c) => c.seed);
    expect(new Set(seeds).size).toBe(2);
  });
});

describe("templateOver", () => {
  it("one cloud gets the whole template, whatever model the clouds share", () => {
    const names = Object.keys(CLOUD_PRESETS);
    for (const name of names) {
      const preset = CLOUD_PRESETS[name];
      if (!preset) continue;
      const want = { ...CLOUD_MODEL, ...preset.model };
      for (const sharedName of names) {
        const shared = CLOUD_PRESETS[sharedName]?.model ?? {};
        const own = templateOver(preset, shared);
        expect({ ...CLOUD_MODEL, ...shared, ...own }).toEqual(want);
      }
      // Over its own template it holds nothing of its own.
      expect(templateOver(preset, preset.model)).toEqual({});
    }
  });
});

describe("the cloud pool", () => {
  const settings = (over = {}) => ({
    ...structuredClone(PLAIN),
    count: 5,
    ...over,
  });

  it("a time of day shows a number of clouds in its own range, the same all day", () => {
    const s = settings({ inSky: { noon: [2, 6] } });
    expect(cloudRange("noon", s)).toEqual([2, 6]);
    const seen = new Set<number>();
    for (let day = 0; day < 200; day++) {
      const n = cloudsInSky("noon", day, s);
      expect(n).toBe(cloudsInSky("noon", day, s));
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect(seen.size).toBe(5);
    // A time with no range of its own shows no more than the pool holds.
    expect(cloudRange("morning", s)[1]).toBeLessThanOrEqual(s.count);
  });

  it("designs show a second time only where the sky needs more clouds than the pool holds", () => {
    const enough = settings({ count: 3, inSky: { noon: [1, 3] } });
    expect(skyClouds(7, enough, true).map((c) => c.id)).toEqual([0, 1, 2]);
    // Five wanted at noon, three designs, one of them never drawn: three more showings, none of that one.
    const s = settings({
      count: 3,
      inSky: { noon: [5, 5] },
      edits: { 1: { rarity: 0 } },
    });
    const more = skyClouds(7, s, true);
    expect(more).toHaveLength(6);
    expect(
      more.slice(3).every((c) => c.id >= CLOUD_COPY && c.design !== 1),
    ).toBe(true);
    expect(skyClouds(7, s)).toHaveLength(3);
  });

  it("a cloud is drawn as often as its rarity says, and never when it is at nothing or out of its time", () => {
    const s = settings({
      count: 3,
      edits: { 0: { rarity: 3 }, 1: { rarity: 0 }, 2: { phases: ["sunset"] } },
    });
    const pool = skyClouds(7, s);
    const count = (phase: "noon" | "sunset") => {
      const n = [0, 0, 0];
      for (let k = 0; k < 4000; k++) {
        const c = drawCloud(pool, phase, [], (k + 0.5) / 4000);
        if (c) n[c.id]++;
      }
      return n;
    };
    expect(count("noon")).toEqual([4000, 0, 0]);
    const [common, never, rare] = count("sunset");
    expect(never).toBe(0);
    expect(common / rare).toBeCloseTo(3, 1);
  });

  it("a design already in the sky is passed over while another is free", () => {
    const pool = skyClouds(7, settings({ count: 2 }));
    const [a, b] = pool;
    if (!a || !b) throw new Error("needs two clouds");
    for (const roll of [0, 0.3, 0.7, 0.999])
      expect(drawCloud(pool, "noon", [a], roll)?.id).toBe(b.id);
    // With every design in the sky, one comes again.
    expect(drawCloud(pool, "noon", [a, b], 0.1)).not.toBeNull();
  });
});
