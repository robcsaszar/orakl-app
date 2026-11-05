import { SKY_PHASES } from "@orakl/shared";
import { describe, expect, it } from "vitest";
import { BirdEngine, MIN_BUDGET, RANGES } from "@/lib/birds/engine";
import { anyVisible, type EventKind, type SkyEvent } from "@/lib/birds/event";
import {
  eventSentence,
  type ModifierId,
  rollModifiers,
} from "@/lib/birds/modifiers";
import { PALETTES, SCENARIOS } from "@/lib/birds/phases";
import { mulberry32 } from "@/lib/birds/rng";
import { worldYAt } from "@/lib/birds/view";

const STEP = 1 / 60;

function run(engine: BirdEngine, seconds: number): void {
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps; i++) engine.step(STEP);
}

function finite(e: SkyEvent): boolean {
  const f = e.flock;
  for (let i = 0; i < f.n; i++) {
    if (
      !Number.isFinite(f.px[i]) ||
      !Number.isFinite(f.py[i]) ||
      !Number.isFinite(f.pz[i]) ||
      !Number.isFinite(f.vx[i]) ||
      !Number.isFinite(f.roll[i]) ||
      !Number.isFinite(f.phase[i])
    ) {
      return false;
    }
  }
  return true;
}

describe("BirdEngine scheduling", () => {
  it("night never spawns", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 1,
      clock: () => 1_800_000_000,
    });
    expect(e.idleFor).toBe(Number.POSITIVE_INFINITY);
    run(e, 600);
    expect(e.events).toHaveLength(0);
  });

  it("every other phase gets its first event inside the configured window", () => {
    for (const phase of SKY_PHASES) {
      if (phase === "night") continue;
      // A fixed clock: the shared timeline is laid out per real hour.
      const e = new BirdEngine({
        width: 1280,
        height: 800,
        phase,
        seed: 7,
        clock: () => 1_800_000_000,
      });
      const [, max] = SCENARIOS[phase].first;
      expect(e.idleFor).toBeGreaterThan(0);
      expect(e.idleFor).toBeLessThanOrEqual(max);
      run(e, max + STEP);
      expect(e.events.length).toBeGreaterThan(0);
      expect(e.birdCount).toBeGreaterThan(0);
      expect(e.idleFor).toBe(0);
    }
  });

  it("one event at a time: the schedule never overlaps, a manual spawn replaces", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "morning",
      seed: 3,
      clock: () => 1_800_000_000,
    });
    for (let i = 0; i < 60 * 240; i++) {
      e.step(STEP);
      expect(e.events.length).toBeLessThanOrEqual(1);
    }
    e.spawn({ kind: "soar", weight: 1, count: [5, 5], exact: true }, []);
    const second = e.spawn(
      { kind: "skein", weight: 1, count: [15, 15], exact: true },
      [],
    );
    expect(e.events).toEqual([second]);
  });

  it("the sky empties again: events exit and the engine reports a sleep time", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "dusk",
      seed: 11,
      clock: () => 1_800_000_000,
    });
    run(e, SCENARIOS.dusk.first[1] + STEP);
    expect(e.events).toHaveLength(1);
    const event = e.events[0];
    run(e, event.maxLife);
    expect(e.events).not.toContain(event);
  });

  it("switching phase reschedules; switching to night cancels", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "noon",
      seed: 5,
      clock: () => 1_800_000_000,
    });
    e.setPhase("morning");
    expect(e.idleFor).toBeLessThanOrEqual(SCENARIOS.morning.first[1]);
    e.setPhase("night");
    expect(e.idleFor).toBe(Number.POSITIVE_INFINITY);
  });

  it("eases the palette toward the new phase", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "noon",
      seed: 5,
      clock: () => 1_800_000_000,
    });
    e.setPhase("sunset");
    run(e, 0.5);
    const mid = e.palette.body[0];
    expect(mid).toBeGreaterThan(PALETTES.noon.body[0]);
    expect(mid).toBeLessThan(PALETTES.sunset.body[0]);
    run(e, 10);
    expect(Math.round(e.palette.body[0])).toBe(PALETTES.sunset.body[0]);
  });

  it("small viewports start on a lower bird budget", () => {
    const big = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "evening",
      seed: 9,
      clock: () => 1_800_000_000,
    });
    const small = new BirdEngine({
      width: 390,
      height: 800,
      phase: "evening",
      seed: 9,
      small: true,
    });
    const spec = {
      kind: "murmuration" as const,
      weight: 1,
      count: [300, 300] as [number, number],
    };
    expect(big.spawn(spec).flock.n).toBe(300);
    expect(small.spawn(spec).flock.n).toBe(180);
  });
});

describe("each event kind", () => {
  const kinds: EventKind[] = ["skein", "murmuration", "soar", "raptor"];
  for (const kind of kinds) {
    it(`${kind}: enters off-screen, stays finite, exits within maxLife`, () => {
      const e = new BirdEngine({
        width: 1280,
        height: 800,
        phase: "night",
        seed: 42,
      });
      const n = kind === "murmuration" ? 100 : kind === "skein" ? 15 : 12;
      const event = e.spawn({
        kind,
        weight: 1,
        count: [n, n],
        depth: [40, 80],
      });
      const f = event.flock;
      expect(f.n).toBe(kind === "raptor" ? 1 : n);
      // Starts outside the frustum horizontally (gulls wheel about a centre
      // at the edge, so some of them start just inside).
      if (kind !== "soar") {
        const halfW = (f.pz[0] * 1280) / (2 * e.view.f);
        expect(Math.abs(f.px[0])).toBeGreaterThan(halfW);
      }
      let crossedInside = false;
      let t = 0;
      while (!event.done && t < event.maxLife) {
        e.step(STEP);
        t += STEP;
        expect(finite(event)).toBe(true);
        const hw = (f.pz[0] * 1280) / (2 * e.view.f);
        if (Math.abs(f.px[0]) < hw) crossedInside = true;
      }
      expect(event.done).toBe(true);
      expect(crossedInside).toBe(true);
    });
  }

  it("skein birds hold formation: followers trail the leader", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 2,
    });
    const event = e.spawn({
      kind: "skein",
      weight: 1,
      count: [9, 9],
      depth: [60, 60],
    });
    run(e, 5);
    const f = event.flock;
    // Along the direction of travel, exactly one bird is at the front and the
    // rest are spread behind it within the arm length.
    const dir = Math.sign(f.vx[0]);
    const xs = Array.from(f.px).map((x) => x * dir);
    const front = Math.max(...xs);
    const spread = front - Math.min(...xs);
    expect(spread).toBeGreaterThan(f.species.span * 2);
    expect(spread).toBeLessThan(f.species.span * 1.15 * 9);
  });

  it("murmuration stays a cloud around its attractor", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 8,
    });
    const event = e.spawn({
      kind: "murmuration",
      weight: 1,
      count: [150, 150],
      depth: [60, 60],
    });
    run(e, 15);
    const f = event.flock;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < f.n; i++) {
      cx += f.px[i];
      cy += f.py[i];
      cz += f.pz[i];
    }
    cx /= f.n;
    cy /= f.n;
    cz /= f.n;
    let far = 0;
    for (let i = 0; i < f.n; i++) {
      if (Math.hypot(f.px[i] - cx, f.py[i] - cy, f.pz[i] - cz) > 45) far++;
    }
    expect(far).toBe(0);
  });
});

describe("event stories", () => {
  it("skein arms are balanced and ragged, never a 5-vs-35 split", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const e = new BirdEngine({
        width: 1280,
        height: 800,
        phase: "night",
        seed,
      });
      const ev = e.spawn({
        kind: "skein",
        weight: 1,
        count: [40, 40],
        depth: [80, 80],
        exact: true,
      });
      const { armL, armR, geoL } = ev as unknown as {
        armL: number[];
        armR: number[];
        geoL: { side: number[] };
      };
      const small = Math.min(armL.length, armR.length);
      expect(small).toBeGreaterThanOrEqual(11);
      // An arm stays on its side of the flight line and bends back at most once.
      expect(geoL.side.every((v) => v < 0)).toBe(true);
      // (Smoothed over five birds so per-bird jitter does not count.)
      const smooth = geoL.side.map((_, i, a) => {
        const w = a.slice(Math.max(0, i - 2), i + 3);
        return w.reduce((x, y) => x + y, 0) / w.length;
      });
      let bends = 0;
      for (let i = 2; i < smooth.length; i++) {
        const d1 = Math.sign(smooth[i - 1] - smooth[i - 2]);
        const d2 = Math.sign(smooth[i] - smooth[i - 1]);
        if (d1 !== d2 && d1 !== 0 && d2 !== 0) bends++;
      }
      expect(bends).toBeLessThanOrEqual(2);
      // Spacing varies along an arm: consecutive side offsets are not a constant step.
      const steps = geoL.side
        .slice(1)
        .map((v, i) => Math.abs(v - geoL.side[i]));
      expect(new Set(steps.map((s) => s.toFixed(2))).size).toBeGreaterThan(3);
    }
  });

  it("gulls trickle in, feed, then trickle out", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 3,
    });
    const ev = e.spawn({
      kind: "soar",
      weight: 1,
      count: [10, 10],
      depth: [50, 50],
      exact: true,
    });
    const state = (ev as unknown as { state: Uint8Array }).state;
    const active = () => Array.from(state).filter((s) => s === 1).length;
    run(e, 2);
    const early = active();
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(10);
    run(e, 20);
    expect(active()).toBe(10);
    // Departures start about 30 s after the last arrival and are staggered.
    run(e, 28);
    const leaving = Array.from(state).filter((s) => s >= 2).length;
    expect(leaving).toBeGreaterThan(0);
    expect(leaving).toBeLessThan(10);
  });

  it("a hunting raptor circles high, stoops with tucked wings, and the prey scatters", () => {
    let hunted = false;
    for (let seed = 1; seed < 40 && !hunted; seed++) {
      const e = new BirdEngine({
        width: 1280,
        height: 800,
        phase: "night",
        seed,
      });
      const ev = e.spawn({ kind: "raptor", weight: 1, depth: [40, 50] });
      if (ev.flocks.length < 2) continue;
      hunted = true;
      const r = ev.flock;
      const prey = ev.flocks[1];
      const stage = () => (ev as unknown as { stage: string }).stage;
      let t = 0;
      let maxSpeed = 0;
      let maxTuck = 0;
      let circledHigh = false;
      let preyMaxSpeed = 0;
      while (!ev.done && t < ev.maxLife) {
        e.step(STEP);
        t += STEP;
        if (stage() === "circle" && r.py[0] > prey.py[0] + 10)
          circledHigh = true;
        maxSpeed = Math.max(maxSpeed, Math.hypot(r.vx[0], r.vy[0], r.vz[0]));
        maxTuck = Math.max(maxTuck, r.tuck[0]);
        for (let i = 0; i < prey.n; i++) {
          preyMaxSpeed = Math.max(
            preyMaxSpeed,
            Math.hypot(prey.vx[i], prey.vy[i], prey.vz[i]),
          );
        }
      }
      expect(ev.done).toBe(true);
      expect(circledHigh).toBe(true);
      expect(maxSpeed).toBeGreaterThan(15);
      expect(maxTuck).toBeGreaterThan(0.9);
      expect(preyMaxSpeed).toBeGreaterThan(9);
      expect(r.tuck[0]).toBeLessThan(0.05);
    }
    expect(hunted).toBe(true);
  });

  it("a 2000-starling murmuration stays one mass", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 5,
    });
    const ev = e.spawn({
      kind: "murmuration",
      weight: 1,
      count: [2000, 2000],
      depth: [40, 40],
      exact: true,
    });
    run(e, 8);
    const f = ev.flock;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < f.n; i++) {
      cx += f.px[i];
      cy += f.py[i];
      cz += f.pz[i];
    }
    cx /= f.n;
    cy /= f.n;
    cz /= f.n;
    const cloud = (ev as unknown as { cloud: number }).cloud;
    let far = 0;
    for (let i = 0; i < f.n; i++) {
      if (Math.hypot(f.px[i] - cx, f.py[i] - cy, f.pz[i] - cz) > cloud * 1.8)
        far++;
    }
    expect(far).toBe(0);
  });

  it("large birds stop beating in a banked turn; starlings keep beating", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 9,
    });
    const gulls = e.spawn({
      kind: "soar",
      weight: 1,
      count: [6, 6],
      depth: [40, 40],
      exact: true,
    }).flock;
    run(e, 20);
    let bankedAndBeating = 0;
    for (let i = 0; i < gulls.n; i++) {
      if (Math.abs(gulls.roll[i]) > 0.5 && gulls.flap[i] > 0.5)
        bankedAndBeating++;
    }
    expect(bankedAndBeating).toBe(0);
    expect(gulls.species.glideInTurns).toBe(true);
    expect(
      e.spawn({
        kind: "murmuration",
        weight: 1,
        count: [50, 50],
        depth: [40, 40],
      }).flock.species.glideInTurns,
    ).toBe(false);
  });
});

describe("sky hand-over", () => {
  it("never drops an event while one of its birds is still in view", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 4,
      clock: () => 1_800_000_000,
    });
    const ev = e.spawn({
      kind: "skein",
      weight: 1,
      count: [9, 9],
      depth: [60, 60],
      exact: true,
    });
    run(e, 6);
    expect(anyVisible(ev, e.view)).toBe(true);
    ev.done = true;
    run(e, 1);
    expect(e.events).toContain(ev);
    run(e, ev.maxLife);
    expect(e.events).not.toContain(ev);
  });

  it("a phase change waits for the sky to empty, then the new schedule starts", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "morning",
      seed: 6,
      clock: () => 1_800_000_000,
    });
    run(e, SCENARIOS.morning.first[1] + STEP);
    expect(e.events.length).toBeGreaterThan(0);
    const old = [...e.events];
    e.setPhase("sunset");
    // Still the old events, nothing new while they fly out.
    run(e, 5);
    for (const ev of e.events) expect(old).toContain(ev);
    // Sunset spawns only murmurations and skeins; once the sky is empty one appears.
    let t = 0;
    while (e.events.some((ev) => old.includes(ev)) && t < 200) {
      e.step(STEP);
      t += STEP;
    }
    expect(e.events.some((ev) => old.includes(ev))).toBe(false);
    run(e, SCENARIOS.sunset.first[1] + STEP);
    expect(e.events.length).toBeGreaterThan(0);
    expect(["murmuration", "skein"]).toContain(e.events[0].kind);
  });

  it("every skein of a phase flies the same way", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "evening",
      seed: 8,
      clock: () => 1_800_000_000,
    });
    const dirs = new Set<number>();
    for (let i = 0; i < 6; i++) {
      const ev = e.spawn({
        kind: "skein",
        weight: 1,
        count: [5, 5],
        depth: [80, 80],
        exact: true,
      });
      dirs.add(Math.sign(ev.flock.vx[0]));
    }
    expect(dirs.size).toBe(1);
  });

  it("murmurations never spawn nearer than 30 m", () => {
    const e = new BirdEngine({
      width: 1280,
      height: 800,
      phase: "night",
      seed: 2,
      clock: () => 1_800_000_000,
    });
    const ev = e.spawn({
      kind: "murmuration",
      weight: 1,
      count: [100, 100],
      depth: [12, 12],
      exact: true,
    });
    const f = ev.flock;
    let minZ = Number.POSITIVE_INFINITY;
    for (let i = 0; i < f.n; i++) minZ = Math.min(minZ, f.pz[i]);
    // Centre at 30 m; the cloud itself reaches nearer.
    const cloud = (ev as unknown as { cloud: number }).cloud;
    expect(minZ).toBeGreaterThan(30 - cloud - 1);
  });
});

describe("modifiers", () => {
  const view = { width: 1280, height: 800 };
  const kinds: Record<EventKind, ModifierId[]> = {
    skein: ["echelon", "low-pass", "landing"],
    murmuration: ["pulse", "ribbon", "funnel", "giant", "probing"],
    soar: ["frenzy", "loafing", "squabble", "commute"],
    raptor: ["pair", "mobbed", "failed-stoop", "kettle", "ambush"],
  };
  for (const [kind, mods] of Object.entries(kinds) as [
    EventKind,
    ModifierId[],
  ][]) {
    for (const mod of mods) {
      it(`${kind} · ${mod}: builds, is captioned, stays finite and finishes`, () => {
        const e = new BirdEngine({ ...view, phase: "night", seed: 21 });
        const ev = e.spawn(
          { kind, weight: 1, count: [12, 12], depth: [40, 60], exact: true },
          [mod],
        );
        expect(ev.mods).toEqual([mod]);
        expect(ev.label).toContain(" · ");
        expect(e.captions[0]).toBe(ev.label);
        let t = 0;
        while (e.events.includes(ev) && t < ev.maxLife * 2.5) {
          e.step(STEP);
          t += STEP;
          for (const f of ev.flocks) {
            for (let i = 0; i < f.n; i++)
              expect(Number.isFinite(f.px[i] + f.py[i] + f.pz[i])).toBe(true);
          }
        }
        expect(e.events).not.toContain(ev);
      });
    }
  }

  it("extra birds: giant doubles a murmuration, a kettle is five or six raptors, mobbing adds crows", () => {
    const e = new BirdEngine({ ...view, phase: "night", seed: 5 });
    expect(
      e.spawn(
        { kind: "murmuration", weight: 1, count: [100, 100], exact: true },
        ["giant"],
      ).flock.n,
    ).toBe(200);
    const kettle = e.spawn({ kind: "raptor", weight: 1 }, ["kettle"]).flock.n;
    expect(kettle).toBeGreaterThanOrEqual(5);
    expect(kettle).toBeLessThanOrEqual(6);
    const mobbed = e.spawn({ kind: "raptor", weight: 1 }, ["mobbed"]);
    expect(mobbed.flocks.some((f) => f.species.id === "crow")).toBe(true);
  });

  it("rolls are rare and respect the phase table", () => {
    const rng = mulberry32(9);
    let withMods = 0;
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const mods = rollModifiers("skein", "dusk", rng);
      if (mods.length > 0) withMods++;
      for (const m of mods) seen.add(m);
    }
    expect(withMods / 2000).toBeGreaterThan(0.15);
    expect(withMods / 2000).toBeLessThan(0.3);
    expect(seen.has("landing")).toBe(true);
    expect(rollModifiers("raptor", "night", rng)).toEqual([]);
  });
});

describe("ranges", () => {
  const view = { width: 1280, height: 800 };
  it("every phase table entry sits inside its kind's range", () => {
    for (const sc of Object.values(SCENARIOS)) {
      for (const spec of sc.events) {
        const r = RANGES[spec.kind];
        const [clo, chi] = spec.count ?? [1, 1];
        expect(clo).toBeGreaterThanOrEqual(r.count[0]);
        expect(chi).toBeLessThanOrEqual(r.count[1]);
        const [dlo, dhi] = spec.depth ?? [30, 150];
        expect(dlo).toBeGreaterThanOrEqual(r.depth[0]);
        expect(dhi).toBeLessThanOrEqual(r.depth[1]);
      }
    }
  });

  it("manual spawns are clamped to the kind's range", () => {
    const e = new BirdEngine({ ...view, phase: "night", seed: 3 });
    const far = e.spawn({
      kind: "murmuration",
      weight: 1,
      count: [5000, 5000],
      depth: [400, 400],
      exact: true,
    });
    expect(far.flock.n).toBe(RANGES.murmuration.count[1]);
    const z = far.flock.pz[0];
    expect(z).toBeLessThan(RANGES.murmuration.depth[1] + 30);
    const one = e.spawn({
      kind: "skein",
      weight: 1,
      count: [1, 1],
      exact: true,
    });
    expect(one.flock.n).toBe(RANGES.skein.count[0]);
    const gulls = e.spawn({
      kind: "soar",
      weight: 1,
      count: [2000, 2000],
      exact: true,
    });
    expect(gulls.flock.n).toBe(RANGES.soar.count[1]);
  });

  it("sentences name the kind and its modifiers", () => {
    expect(eventSentence("skein", [])).toBe(
      "A skein of geese crossing the sky.",
    );
    expect(eventSentence("skein", ["echelon", "low-pass"])).toBe(
      "A skein of geese in one echelon line, passing low.",
    );
    expect(eventSentence("raptor", ["kettle"])).toBe(
      "A raptor circling as a kettle.",
    );
    const e = new BirdEngine({ ...view, phase: "night", seed: 3 });
    e.spawn({ kind: "soar", weight: 1, count: [5, 5], exact: true }, [
      "frenzy",
    ]);
    expect(e.sentences).toEqual(["Gulls in a feeding frenzy."]);
    expect(e.captions).toEqual(["Gulls · frenzy"]);
  });
});

describe("the day's sky", () => {
  const view = { width: 1280, height: 800 };

  it("two viewers with the same seed see the same events start at the same second", () => {
    const base = 1_800_000_000;
    const a = new BirdEngine({
      ...view,
      phase: "dawn",
      seed: 77,
      clock: () => base + 12,
      month: 10,
    });
    const b = new BirdEngine({
      ...view,
      phase: "dawn",
      seed: 77,
      clock: () => base + 40,
      month: 10,
    });
    // (Dawn: small, cheap events.) Step both through the same wall-clock window, noting each event's
    // kind, modifiers and start second as it appears.
    const seen = (e: BirdEngine, from: number, to: number) => {
      const out = new Set<string>();
      for (let t = from; t < to; t += 1) {
        for (let i = 0; i < 60; i++) e.step(STEP);
        for (const ev of e.snapshot().events) {
          out.add(`${ev.kind}:${ev.mods.join("+")}:${Math.round(t - ev.age)}`);
        }
      }
      return out;
    };
    const sa = seen(a, base + 12, base + 1500);
    const sb = seen(b, base + 40, base + 1500);
    // The local first events aside, both viewers share timeline events.
    const common = [...sa].filter((x) => sb.has(x));
    expect(common.length).toBeGreaterThan(0);
    expect(a.snapshot().seed).toBe(b.snapshot().seed);
  });

  it("the season shifts what is picked and the snapshot says which month", () => {
    const winter = new BirdEngine({
      ...view,
      phase: "sunset",
      seed: 3,
      month: 0,
    });
    const summer = new BirdEngine({
      ...view,
      phase: "sunset",
      seed: 3,
      month: 6,
    });
    expect(winter.snapshot().month).toBe(0);
    expect(summer.snapshot().month).toBe(6);
    let murmWinter = 0;
    let murmSummer = 0;
    for (let i = 0; i < 60; i++) {
      if (winter.spawn().kind === "murmuration") murmWinter++;
      winter.events.length = 0;
      if (summer.spawn().kind === "murmuration") murmSummer++;
      summer.events.length = 0;
    }
    expect(murmWinter).toBeGreaterThan(murmSummer);
  });

  it("wind carries a skein: a tailwind crosses faster than a headwind", () => {
    const run = (wind: [number, number]) => {
      const e = new BirdEngine({ ...view, phase: "night", seed: 5, wind });
      const ev = e.spawn(
        {
          kind: "skein",
          weight: 1,
          count: [9, 9],
          depth: [80, 80],
          exact: true,
        },
        [],
      );
      const dir = Math.sign(ev.flock.vx[0]);
      const x0 = ev.flock.px[0];
      for (let i = 0; i < 300; i++) e.step(STEP);
      return (ev.flock.px[0] - x0) * dir;
    };
    const dir = Math.sign(
      new BirdEngine({ ...view, phase: "night", seed: 5 }).spawn(
        {
          kind: "skein",
          weight: 1,
          count: [9, 9],
          depth: [80, 80],
          exact: true,
        },
        [],
      ).flock.vx[0],
    );
    expect(run([dir * 2.5, 0])).toBeGreaterThan(run([-dir * 2.5, 0]) + 10);
  });

  it("birds differ in size and tempo; the old leader peels out when the point changes", () => {
    const e = new BirdEngine({ ...view, phase: "night", seed: 11 });
    const ev = e.spawn(
      {
        kind: "skein",
        weight: 1,
        count: [12, 12],
        depth: [60, 60],
        exact: true,
      },
      [],
    );
    const f = ev.flock;
    expect(
      new Set(Array.from(f.size).map((v) => v.toFixed(3))).size,
    ).toBeGreaterThan(6);
    expect(
      new Set(Array.from(f.tempo).map((v) => v.toFixed(3))).size,
    ).toBeGreaterThan(6);
    // The leader changes every 8–18 s; force one and watch the old point peel.
    const inner = ev as unknown as {
      peel: Float32Array;
      rotateLeader(): void;
      leader: number;
    };
    const old = inner.leader;
    inner.rotateLeader();
    expect(inner.leader).not.toBe(old);
    expect(inner.peel[old]).toBe(1);
    run(e, 1);
    expect(inner.peel[old]).toBeGreaterThan(0);
    expect(inner.peel[old]).toBeLessThan(1);
  });

  it("an ambush starts already stooping above the view, with a prey flock", () => {
    const e = new BirdEngine({ ...view, phase: "night", seed: 4 });
    const ev = e.spawn({ kind: "raptor", weight: 1, depth: [45, 45] }, [
      "ambush",
    ]);
    expect(ev.flocks.length).toBe(2);
    expect((ev as unknown as { stage: string }).stage).toBe("stoop");
    const r = ev.flock;
    expect(r.py[0]).toBeGreaterThan(worldYAt(e.view, r.pz[0], 0));
    expect(r.tuck[0]).toBe(1);
  });

  it("cues: a reveal moves a murmuration, the lobby sets the gull count", () => {
    const e = new BirdEngine({ ...view, phase: "night", seed: 6 });
    const m = e.spawn(
      {
        kind: "murmuration",
        weight: 1,
        count: [120, 120],
        depth: [50, 50],
        exact: true,
      },
      [],
    );
    run(e, 3);
    const yBefore = m.flock.py.reduce((a, b) => a + b, 0) / m.flock.n;
    e.cue({ type: "reveal", correct: true });
    run(e, 1.5);
    const yAfter = m.flock.py.reduce((a, b) => a + b, 0) / m.flock.n;
    expect(yAfter).toBeGreaterThan(yBefore + 0.5);
    e.events.length = 0;
    const g = e.spawn(
      { kind: "soar", weight: 1, count: [4, 4], depth: [50, 50], exact: true },
      [],
    );
    e.cue({ type: "lobby", players: 9 });
    expect(g.flock.n).toBe(9);
    run(e, 30);
    const state = (g as unknown as { state: Uint8Array }).state;
    expect(Array.from(state).filter((s) => s === 1).length).toBe(9);
    e.cue({ type: "lobby", players: 3 });
    run(e, 10);
    expect(Array.from(state).filter((s) => s === 1).length).toBeLessThanOrEqual(
      3,
    );
  });

  it("the budget governs scheduled sizes, not manual exact spawns", () => {
    const e = new BirdEngine({ ...view, phase: "night", seed: 8 });
    e.setBudget(0.5);
    expect(
      e.spawn({ kind: "murmuration", weight: 1, count: [200, 200] }, []).flock
        .n,
    ).toBe(100);
    expect(
      e.spawn(
        { kind: "murmuration", weight: 1, count: [200, 200], exact: true },
        [],
      ).flock.n,
    ).toBe(200);
    e.setBudget(0.1);
    expect(e.budget).toBe(MIN_BUDGET);
  });
});
