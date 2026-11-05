import type { Species, SpeciesId } from "./species";

/** Upper bound on vertices a species model can produce. */
export const MAX_VERTS = 160;

/** Segments around each body ring of the close-range mesh. */
const RING = 8;

/** `card`: two flat body cards (mid distance). `mesh`: lofted body rings (close). */
export type Detail = "card" | "mesh";

export interface Layout {
  verts: number;
  /** Vertex index lists, body polygons first, then the right and left wing. */
  polys: Uint16Array[];
  /** How many leading polygons belong to the body. */
  bodyPolys: number;
  /** Body polygons form a closed surface: skip the ones facing away. */
  culled: boolean;
}

const layouts: Partial<Record<`${SpeciesId}:${Detail}`, Layout>> = {};

function cardLayout(sp: Species): Layout {
  const k = sp.plan.length / 2;
  const planN = k * 2 - 2;
  const profN = sp.profile.length / 2;
  const wingN = sp.wing.length / 2;
  const seq = (start: number, n: number) =>
    Uint16Array.from({ length: n }, (_, i) => start + i);
  return {
    verts: planN + profN + wingN * 2,
    polys: [
      seq(0, planN),
      seq(planN, profN),
      seq(planN + profN, wingN),
      seq(planN + profN + wingN, wingN),
    ],
    bodyPolys: 2,
    culled: false,
  };
}

function meshLayout(sp: Species): Layout {
  const stations = sp.body.length;
  const bodyN = stations * RING;
  const wingN = sp.wing.length / 2;
  const polys: Uint16Array[] = [];
  for (let i = 0; i < stations - 1; i++) {
    for (let j = 0; j < RING; j++) {
      const a = i * RING + j;
      const b = i * RING + ((j + 1) % RING);
      polys.push(Uint16Array.of(a, b, b + RING, a + RING));
    }
  }
  const seq = (start: number, n: number) =>
    Uint16Array.from({ length: n }, (_, i) => start + i);
  polys.push(seq(bodyN, wingN), seq(bodyN + wingN, wingN));
  return {
    verts: bodyN + wingN * 2,
    polys,
    bodyPolys: polys.length - 2,
    culled: true,
  };
}

/** Polygon layout for a species at a detail level (cached). */
export function layoutFor(sp: Species, detail: Detail): Layout {
  const key = `${sp.id}:${detail}` as const;
  let l = layouts[key];
  if (!l) {
    l = detail === "mesh" ? meshLayout(sp) : cardLayout(sp);
    layouts[key] = l;
  }
  return l;
}

/**
 * Writes the posed model (xyz triples) for one bird into `out` in its local
 * frame, matching `layoutFor(sp, detail)`. `flap` blends the gliding pose (0)
 * with a full wingbeat (1) at wingbeat `phase`; `turn` (0..1, from the bank
 * angle) fans the tail. Returns the vertex count.
 *
 * The beat is asymmetric: the downstroke is the slow power stroke, the
 * upstroke is quick with the hand folded back and twisted. The body rises
 * a little on the downstroke and sinks on the upstroke, and pitches nose-up
 * with it — a few percent of body length, as on a real bird. `tuck` (0..1)
 * draws the wings in against the body for a stoop.
 */
export function buildLocal(
  sp: Species,
  phase: number,
  flap: number,
  out: Float32Array,
  turn = 0,
  detail: Detail = "card",
  tuck = 0,
): number {
  const L = sp.length;
  const S = sp.span / 2;
  const glide = 1 - flap;
  // Warp the phase: faster through the upstroke, slower on the downstroke.
  const psi = phase + 0.3 * Math.sin(phase);
  const s1 = Math.sin(psi);
  const s2 = Math.sin(psi - 0.7);
  const bob = -0.025 * L * s1 * flap;
  // Small-angle pitch: nose up on the downstroke.
  const pitch = 0.03 * s1 * flap;
  const fan = 1 + sp.tailFan * Math.min(1, turn);
  let o = 0;

  if (detail === "mesh") {
    for (const [x, w0, h, yc] of sp.body) {
      const w = x <= sp.tailStart ? w0 * fan : w0;
      for (let j = 0; j < RING; j++) {
        const a = ((j + 0.5) / RING) * Math.PI * 2;
        out[o++] = x * L;
        out[o++] = (yc + h * Math.sin(a)) * L + bob + x * L * pitch;
        out[o++] = w * Math.cos(a) * L;
      }
    }
  } else {
    const plan = sp.plan;
    const k = plan.length / 2;
    for (let i = 0; i < k; i++) {
      const x = plan[i * 2];
      const z = x <= sp.tailStart ? plan[i * 2 + 1] * fan : plan[i * 2 + 1];
      out[o++] = x * L;
      out[o++] = bob + x * L * pitch;
      out[o++] = z * L;
    }
    for (let i = k - 2; i >= 1; i--) {
      const x = plan[i * 2];
      const z = x <= sp.tailStart ? plan[i * 2 + 1] * fan : plan[i * 2 + 1];
      out[o++] = x * L;
      out[o++] = bob + x * L * pitch;
      out[o++] = -z * L;
    }
    const prof = sp.profile;
    for (let i = 0; i < prof.length; i += 2) {
      out[o++] = prof[i] * L;
      out[o++] = prof[i + 1] * L + bob + prof[i] * L * pitch;
      out[o++] = 0;
    }
  }

  // Arm pivots at the shoulder; the hand pivots at the wrist with a lag so
  // the wing bows, sweeps back (folds) and twists on the upstroke.
  const a1 =
    sp.glidePose[0] * glide +
    glide * 0.04 * Math.sin(phase) +
    flap * (sp.flapAmp[0] * s1 + 0.08);
  const a2 = sp.glidePose[1] * glide + flap * sp.flapAmp[1] * s2;
  const up = Math.max(0, -s1);
  const fold = flap * up * sp.fold * L;
  const twist = flap * sp.twist * Math.cos(psi);
  const c1 = Math.cos(a1);
  const n1 = Math.sin(a1);
  const c12 = Math.cos(a1 + a2);
  const n12 = Math.sin(a1 + a2);
  const wristZ = sp.wrist * S;
  const handLen = S - wristZ;
  const wing = sp.wing;
  // Tucked wings: span pulled in, hand swept back along the body.
  const spanK = 1 - 0.55 * tuck;
  const sweep = tuck * 0.4 * L;

  for (let side = 1; side >= -1; side -= 2) {
    for (let i = 0; i < wing.length; i += 2) {
      let x = wing[i] * L;
      const z = wing[i + 1] * S * spanK;
      const wz = wristZ * spanK;
      if (z <= wz) {
        out[o++] = x - sweep * (z / wz) * 0.5;
        out[o++] = z * n1 + bob;
        out[o++] = side * z * c1;
      } else {
        const dz = z - wz;
        const frac = handLen > 0 ? dz / (handLen * spanK) : 0;
        x -= fold * frac + sweep * (0.5 + frac);
        out[o++] = x;
        out[o++] = wz * n1 + dz * n12 + x * twist * frac + bob;
        out[o++] = side * (wz * c1 + dz * c12);
      }
    }
  }
  return o / 3;
}
