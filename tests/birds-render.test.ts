import { describe, expect, it } from "vitest";
import { basis } from "@/lib/birds/event";
import { buildLocal, layoutFor, MAX_VERTS } from "@/lib/birds/model";
import { fogAt, LOD_DOT, LOD_LINE, spanPx } from "@/lib/birds/render";
import { SPECIES } from "@/lib/birds/species";
import { halfWidthAt, makeView, project, worldYAt } from "@/lib/birds/view";

describe("view", () => {
  const v = makeView(1280, 800);

  it("projects the optical axis to the screen centre", () => {
    const out = [0, 0];
    project(v, 0, 0, 100, out);
    expect(out).toEqual([640, 400]);
  });

  it("frustum helpers invert the projection", () => {
    const out = [0, 0];
    const z = 80;
    project(v, halfWidthAt(v, z), worldYAt(v, z, 0), z, out);
    expect(out[0]).toBeCloseTo(1280);
    expect(out[1]).toBeCloseTo(0);
    project(v, -halfWidthAt(v, z), worldYAt(v, z, 1), z, out);
    expect(out[0]).toBeCloseTo(0);
    expect(out[1]).toBeCloseTo(800);
  });

  it("clamps the focal length so phones get a wider field of view", () => {
    expect(makeView(390, 800).f).toBe(480);
    expect(makeView(1920, 1080).f).toBe(960);
  });
});

describe("levels of detail", () => {
  const v = makeView(1280, 800);

  it("a goose is a dot far away, a stroke, then a sprite, then a model up close", () => {
    expect(spanPx(v, SPECIES.goose, 1300)).toBeLessThan(LOD_DOT);
    const far = spanPx(v, SPECIES.goose, 700);
    expect(far).toBeGreaterThan(LOD_DOT);
    expect(far).toBeLessThan(LOD_LINE);
    const mid = spanPx(v, SPECIES.goose, 150);
    expect(mid).toBeGreaterThan(LOD_LINE);
    expect(mid).toBeLessThan(SPECIES.goose.modelFrom);
    expect(spanPx(v, SPECIES.goose, 40)).toBeGreaterThan(
      SPECIES.goose.modelFrom,
    );
  });

  it("fog grows with depth and never fully hides a bird", () => {
    expect(fogAt(10)).toBe(0);
    expect(fogAt(200)).toBeGreaterThan(0);
    expect(fogAt(200)).toBeLessThan(fogAt(400));
    expect(fogAt(5000)).toBeLessThan(1);
  });
});

describe("model", () => {
  const out = new Float32Array(MAX_VERTS * 3);

  /** Vertex index range [start, end) of card polygon `p` in buildLocal order. */
  function range(sp: (typeof SPECIES)["goose"], p: number): [number, number] {
    const poly = layoutFor(sp, "card").polys[p];
    return [poly[0], poly[0] + poly.length];
  }

  it("every species fits the vertex buffer and its layouts at both details", () => {
    for (const sp of Object.values(SPECIES)) {
      for (const detail of ["card", "mesh"] as const) {
        const n = buildLocal(sp, 0.3, 1, out, 0, detail);
        const layout = layoutFor(sp, detail);
        expect(n).toBeLessThanOrEqual(MAX_VERTS);
        expect(layout.verts).toBe(n);
        for (const poly of layout.polys) {
          for (const v of poly) expect(v).toBeLessThan(n);
        }
      }
    }
  });

  it("the body mesh is closed with outward-facing rings", () => {
    const sp = SPECIES.goose;
    buildLocal(sp, 0, 0, out, 0, "mesh");
    const layout = layoutFor(sp, "mesh");
    // A belly-side face (centroid below the axis) must have a downward normal.
    let checked = 0;
    for (let p = 0; p < layout.bodyPolys; p++) {
      const poly = layout.polys[p];
      let ny = 0;
      let nz = 0;
      let cy = 0;
      for (let k = 0; k < poly.length; k++) {
        const v = poly[k];
        const w = poly[(k + 1) % poly.length];
        ny += (out[v * 3 + 2] - out[w * 3 + 2]) * (out[v * 3] + out[w * 3]);
        nz += (out[v * 3] - out[w * 3]) * (out[v * 3 + 1] + out[w * 3 + 1]);
        cy += out[v * 3 + 1];
      }
      if (cy < -0.04 && Math.abs(nz) < Math.abs(ny)) {
        expect(ny).toBeLessThan(0);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("wings mirror across the body and the tip rises and falls with the beat", () => {
    const sp = SPECIES.goose;
    buildLocal(sp, Math.PI / 2, 1, out);
    const [rs, re] = range(sp, 2);
    const [ls] = range(sp, 3);
    // The tip is the right-wing vertex furthest out along z.
    let tip = rs;
    for (let v = rs; v < re; v++)
      if (out[v * 3 + 2] > out[tip * 3 + 2]) tip = v;
    const mirror = ls + (tip - rs);
    expect(out[tip * 3 + 2]).toBeGreaterThan(0);
    expect(out[mirror * 3 + 2]).toBeCloseTo(-out[tip * 3 + 2]);
    expect(out[mirror * 3 + 1]).toBeCloseTo(out[tip * 3 + 1]);
    expect(out[tip * 3 + 1]).toBeGreaterThan(0);
    buildLocal(sp, -Math.PI / 2, 1, out);
    expect(out[tip * 3 + 1]).toBeLessThan(0);
  });

  it("the hand folds back on the upstroke", () => {
    const sp = SPECIES.gull;
    const [rs, re] = range(sp, 2);
    buildLocal(sp, Math.PI / 2, 1, out);
    let tip = rs;
    for (let v = rs; v < re; v++)
      if (out[v * 3 + 2] > out[tip * 3 + 2]) tip = v;
    const downX = out[tip * 3];
    buildLocal(sp, -Math.PI / 2, 1, out);
    expect(out[tip * 3]).toBeLessThan(downX);
  });

  it("the tail fans out in a bank", () => {
    const sp = SPECIES.raptor;
    const [ps, pe] = range(sp, 0);
    buildLocal(sp, 0, 0, out, 0);
    let flat = 0;
    for (let v = ps; v < pe; v++)
      flat = Math.max(flat, Math.abs(out[v * 3 + 2]));
    buildLocal(sp, 0, 0, out, 1);
    let fanned = 0;
    for (let v = ps; v < pe; v++)
      fanned = Math.max(fanned, Math.abs(out[v * 3 + 2]));
    expect(fanned).toBeGreaterThan(flat * 1.5);
  });

  it("gliding holds the species pose instead of beating", () => {
    const sp = SPECIES.gull;
    const a = new Float32Array(MAX_VERTS * 3);
    const b = new Float32Array(MAX_VERTS * 3);
    buildLocal(sp, 0, 0, a);
    buildLocal(sp, Math.PI, 0, b);
    // Only the slow glide sway differs, and only a little.
    for (let i = 0; i < a.length; i++)
      expect(Math.abs(a[i] - b[i])).toBeLessThan(0.02);
  });
});

describe("flight basis", () => {
  it("is orthonormal, with right = forward × up tilted toward the viewer", () => {
    const out = new Float32Array(9);
    basis(1, 0, 0, out);
    const dot = (a: number, b: number) =>
      out[a] * out[b] + out[a + 1] * out[b + 1] + out[a + 2] * out[b + 2];
    expect(dot(0, 0)).toBeCloseTo(1);
    expect(dot(3, 3)).toBeCloseTo(1);
    expect(dot(6, 6)).toBeCloseTo(1);
    expect(dot(0, 3)).toBeCloseTo(0);
    expect(dot(0, 6)).toBeCloseTo(0);
    expect(dot(3, 6)).toBeCloseTo(0);
    // Flying left to right the right wing points away and up: the viewer
    // sees the underside and spread wings, not an edge-on profile.
    expect(out[5]).toBeGreaterThan(0);
    expect(out[4]).toBeGreaterThan(0);
    // Flying toward the viewer, the bird's right is screen right.
    basis(0, 0, -1, out);
    expect(out[3]).toBeCloseTo(1);
  });

  it("falls back to +x when stationary", () => {
    const out = new Float32Array(9);
    basis(0, 0, 0, out);
    expect(out[0]).toBe(1);
  });
});
