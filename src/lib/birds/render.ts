import { basis, type SkyEvent } from "./event";
import { buildLocal, type Detail, layoutFor, MAX_VERTS } from "./model";
import type { Species } from "./species";
import { BEATS, FRAME, FRAME_SPAN, SpriteAtlas } from "./sprites";
import { project, type View, Z_NEAR } from "./view";

export type Rgb = [number, number, number];

/** A 2D context on the page's canvas or on an OffscreenCanvas in a worker. */
export type Ctx2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

/** What one sky phase does to a bird's colour. */
export interface Palette {
  /** Silhouette colour. */
  body: Rgb;
  /** Colour distant birds fade toward (the sky behind them). */
  fog: Rgb;
  /** Strength of per-face shading, 0 = flat silhouette. */
  lit: number;
}

/** Projected wingspan below which a bird is a single pixel. */
export const LOD_DOT = 1.2;
/** Projected wingspan below which a bird is a short stroke; from here a sprite. */
export const LOD_LINE = 2.5;
/** Frames with more birds than this keep every species a sprite a bit longer. */
const CROWD = 600;
/** Depth of the cloud layer: birds beyond it draw on the far canvas, behind the clouds. */
export const LAYER_DEPTH = 70;
/** Projected wingspan from which the body is a lofted mesh, not two cards. */
export const LOD_MESH = 36;
/** Depth where atmospheric fade begins and the span over which it saturates. */
const FOG_NEAR = 30;
const FOG_SPAN = 450;
const FOG_MAX = 0.85;

// Sun: high, slightly behind the viewer.
const LX = 0.3 / Math.hypot(0.3, 1, -0.35);
const LY = 1 / Math.hypot(0.3, 1, -0.35);
const LZ = -0.35 / Math.hypot(0.3, 1, -0.35);

/** Fraction of the way from body colour to sky colour at depth z. */
export function fogAt(z: number): number {
  const t = (z - FOG_NEAR) / FOG_SPAN;
  return t <= 0 ? 0 : t >= FOG_MAX ? FOG_MAX : t;
}

/** Projected wingspan in CSS pixels. */
export function spanPx(view: View, species: Species, z: number): number {
  return (species.span * view.f) / z;
}

/**
 * Canvas 2D renderer. Gathers every bird across the active events, sorts far
 * to near, and draws each at one of five levels of detail by projected size:
 * a pixel, a stroke along the wings, a pre-rendered sprite (one `drawImage`
 * under an affine for heading, bank and foreshortening), the posed card
 * model, or the lofted mesh, the last two with per-face shading. Nothing is
 * allocated per frame once the buffers have grown.
 */
export class BirdRenderer {
  private readonly local = new Float32Array(MAX_VERTS * 3);
  private readonly world = new Float32Array(MAX_VERTS * 3);
  private readonly screen = new Float32Array(MAX_VERTS * 2);
  private readonly b = new Float32Array(9);
  private readonly pt = new Float32Array(4);
  private readonly colors = new Map<number, string>();
  private readonly sprites = new SpriteAtlas();
  private ids = new Uint32Array(256);
  private depth = new Float32Array(256);
  private order = new Uint32Array(256);
  private count = 0;
  private lastStyle = "";

  private grow(n: number): void {
    if (n <= this.ids.length) return;
    let size = this.ids.length;
    while (size < n) size *= 2;
    this.ids = new Uint32Array(size);
    this.depth = new Float32Array(size);
    this.order = new Uint32Array(size);
  }

  private color(r: number, g: number, b: number, a: number): string {
    const key =
      ((r & 255) << 16) | ((g & 255) << 8) | (b & 255) | ((a * 31) << 24);
    let s = this.colors.get(key);
    if (s === undefined) {
      if (this.colors.size > 4096) this.colors.clear();
      s =
        a >= 0.99
          ? `rgb(${r},${g},${b})`
          : `rgba(${r},${g},${b},${a.toFixed(2)})`;
      this.colors.set(key, s);
    }
    return s;
  }

  private fill(ctx: Ctx2D, style: string): void {
    if (style !== this.lastStyle) {
      ctx.fillStyle = style;
      ctx.strokeStyle = style;
      this.lastStyle = style;
    }
  }

  /**
   * Draws every bird: those beyond `LAYER_DEPTH` on `far` (behind the
   * clouds) when a far context is given, the rest on `near`.
   */
  draw(
    near: Ctx2D,
    view: View,
    dpr: number,
    events: readonly SkyEvent[],
    palette: Palette,
    far: Ctx2D | null = null,
  ): void {
    near.setTransform(dpr, 0, 0, dpr, 0, 0);
    near.clearRect(0, 0, view.w, view.h);
    if (far) {
      far.setTransform(dpr, 0, 0, dpr, 0, 0);
      far.clearRect(0, 0, view.w, view.h);
    }
    this.lastStyle = "";
    if (events.length === 0) return;

    // Gather visible birds. An id packs event (12 bits), flock (4), bird (16).
    let total = 0;
    for (const e of events) for (const f of e.flocks) total += f.n;
    this.grow(total);
    let n = 0;
    const ids = this.ids;
    const depth = this.depth;
    const pt = this.pt;
    for (let ei = 0; ei < events.length; ei++) {
      const flocks = events[ei].flocks;
      for (let fi = 0; fi < flocks.length; fi++) {
        const f = flocks[fi];
        for (let i = 0; i < f.n; i++) {
          const z = f.pz[i];
          if (z < Z_NEAR) continue;
          project(view, f.px[i], f.py[i], z, pt);
          const m = spanPx(view, f.species, z) + 8;
          if (
            pt[0] < -m ||
            pt[0] > view.w + m ||
            pt[1] < -m ||
            pt[1] > view.h + m
          ) {
            continue;
          }
          ids[n] = (ei << 20) | (fi << 16) | i;
          depth[n] = z;
          n++;
        }
      }
    }
    this.count = n;
    if (n === 0) return;
    const order = this.order.subarray(0, n);
    for (let i = 0; i < n; i++) order[i] = i;
    order.sort((a, b) => depth[b] - depth[a]);

    // Stroke-LOD birds with the same colour and width go into one path:
    // a murmuration of thousands becomes a handful of stroke calls.
    let batchKey = -1;
    let batchWidth = 0;
    let batchCtx: Ctx2D = far ?? near;
    const flush = () => {
      if (batchKey < 0) return;
      batchCtx.lineWidth = batchWidth;
      batchCtx.stroke();
      batchKey = -1;
    };

    // A crowded frame (a big murmuration) keeps birds sprites a bit longer:
    // 2000 posed models would be 8000 polygon fills.
    const crowd = n > CROWD ? 1.6 : 1;

    near.lineCap = "round";
    if (far) far.lineCap = "round";
    // Far to near: the far canvas fills first, then one switch to the near.
    let ctx: Ctx2D = far ?? near;
    for (let k = 0; k < n; k++) {
      const id = ids[order[k]];
      const f = events[id >>> 20].flocks[(id >>> 16) & 0xf];
      const i = id & 0xffff;
      const z = f.pz[i];
      if (far && ctx === far && z <= LAYER_DEPTH) {
        flush();
        this.lastStyle = "";
        ctx = near;
      }
      const span = spanPx(view, f.species, z) * f.size[i];
      const modelFrom = f.species.modelFrom * crowd;
      // Small birds quantise the fade so neighbours share a batch or a strip.
      const fog = span < modelFrom ? Math.round(fogAt(z) * 6) / 6 : fogAt(z);
      const r = Math.round(
        palette.body[0] + (palette.fog[0] - palette.body[0]) * fog,
      );
      const g = Math.round(
        palette.body[1] + (palette.fog[1] - palette.body[1]) * fog,
      );
      const bl = Math.round(
        palette.body[2] + (palette.fog[2] - palette.body[2]) * fog,
      );

      if (span < LOD_DOT) {
        if (span < 0.4) continue;
        flush();
        project(view, f.px[i], f.py[i], z, pt);
        this.fill(ctx, this.color(r, g, bl, Math.min(1, span)));
        ctx.fillRect(pt[0] - 0.5, pt[1] - 0.5, 1, 1);
        continue;
      }

      basis(f.vx[i], f.vy[i], f.vz[i], this.b);
      const b = this.b;
      const cr = Math.cos(f.roll[i]);
      const sr = Math.sin(f.roll[i]);
      // Roll about forward: right' = R cos ρ + U sin ρ, up' = U cos ρ − R sin ρ.
      const rx = b[3] * cr + b[6] * sr;
      const ry = b[4] * cr + b[7] * sr;
      const rz = b[5] * cr + b[8] * sr;

      if (span < LOD_LINE) {
        // Wing spread shrinks as the wings beat up or down, or tuck.
        const a = f.species.flapAmp[0] * Math.sin(f.phase[i]) * f.flap[i];
        const half =
          (f.species.span / 2) *
          f.size[i] *
          Math.cos(a) *
          (1 - 0.55 * f.tuck[i]);
        project(
          view,
          f.px[i] - rx * half,
          f.py[i] - ry * half,
          z - rz * half,
          pt,
        );
        project(
          view,
          f.px[i] + rx * half,
          f.py[i] + ry * half,
          z + rz * half,
          pt,
          2,
        );
        // Colour (six fade steps) and half-pixel width make the batch key.
        const width = Math.max(0.8, Math.round(span * 0.14 * 2) / 2);
        const key = ((r & 255) << 16) | ((g & 255) << 8) | (bl & 255);
        const widthKey = key * 64 + Math.round(width * 2);
        if (widthKey !== batchKey) {
          flush();
          this.fill(ctx, this.color(r, g, bl, 1));
          ctx.beginPath();
          batchKey = widthKey;
          batchWidth = width;
          batchCtx = ctx;
        }
        ctx.moveTo(pt[0], pt[1]);
        ctx.lineTo(pt[2], pt[3]);
        continue;
      }

      if (span < modelFrom) {
        flush();
        this.drawSprite(ctx, view, dpr, f, i, b, rx, ry, r, g, bl, palette.lit);
        continue;
      }

      flush();
      this.drawModel(
        ctx,
        view,
        f.species,
        f,
        i,
        rx,
        ry,
        rz,
        cr,
        sr,
        r,
        g,
        bl,
        palette.lit,
        span >= LOD_MESH ? "mesh" : "card",
      );
    }
    flush();
  }

  /**
   * One `drawImage` from the species' strip: the frame by wingbeat phase (or
   * the glide), rotated to the projected heading, the body axis scaled by
   * its foreshortening and the wing axis by the projected right vector, so a
   * banking or oncoming bird still reads.
   */
  private drawSprite(
    ctx: Ctx2D,
    view: View,
    dpr: number,
    f: SkyEvent["flock"],
    i: number,
    b: Float32Array,
    rx: number,
    ry: number,
    r: number,
    g: number,
    bl: number,
    lit: number,
  ): void {
    const sp = f.species;
    const atlas = this.sprites.get(sp, r, g, bl, lit);
    const z = f.pz[i];
    const s = view.f / z;
    // Projected forward and right, per metre; z slope ignored (small).
    const fx = b[0];
    const fy = -b[1];
    const fl = Math.sqrt(fx * fx + fy * fy);
    const cos = fl > 1e-4 ? fx / fl : 1;
    const sin = fl > 1e-4 ? fy / fl : 0;
    const along = Math.max(0.2, fl);
    const rl = Math.sqrt(rx * rx + ry * ry);
    const across =
      Math.max(0.15, rl / atlas.rightScale) * (1 - 0.55 * f.tuck[i]);
    const m = (sp.span / FRAME_SPAN) * s * dpr * f.size[i];
    project(view, f.px[i], f.py[i], z, this.pt);
    const frame =
      f.flap[i] < 0.5
        ? BEATS
        : Math.floor((f.phase[i] / (Math.PI * 2)) * BEATS) % BEATS;
    ctx.setTransform(
      cos * along * m,
      sin * along * m,
      -sin * across * m,
      cos * across * m,
      this.pt[0] * dpr,
      this.pt[1] * dpr,
    );
    ctx.drawImage(
      atlas.canvas,
      frame * FRAME,
      0,
      FRAME,
      FRAME,
      -FRAME / 2,
      -FRAME / 2,
      FRAME,
      FRAME,
    );
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private drawModel(
    ctx: Ctx2D,
    view: View,
    sp: Species,
    f: SkyEvent["flock"],
    i: number,
    rx: number,
    ry: number,
    rz: number,
    cr: number,
    sr: number,
    cr8: number,
    cg8: number,
    cb8: number,
    lit: number,
    detail: Detail,
  ): void {
    const local = this.local;
    const world = this.world;
    const screen = this.screen;
    const b = this.b;
    const nv = buildLocal(
      sp,
      f.phase[i],
      f.flap[i],
      local,
      Math.abs(f.roll[i]) / 0.6,
      detail,
      f.tuck[i],
    );
    const ux = b[6] * cr - b[3] * sr;
    const uy = b[7] * cr - b[4] * sr;
    const uz = b[8] * cr - b[5] * sr;
    const px = f.px[i];
    const py = f.py[i];
    const pz = f.pz[i];
    const size = f.size[i];
    for (let v = 0; v < nv; v++) {
      const x = local[v * 3] * size;
      const y = local[v * 3 + 1] * size;
      const z = local[v * 3 + 2] * size;
      const wx = px + b[0] * x + ux * y + rx * z;
      const wy = py + b[1] * x + uy * y + ry * z;
      const wz = pz + b[2] * x + uz * y + rz * z;
      world[v * 3] = wx;
      world[v * 3 + 1] = wy;
      world[v * 3 + 2] = wz;
      project(view, wx, wy, wz, screen, v * 2);
    }

    const layout = layoutFor(sp, detail);
    for (let p = 0; p < layout.polys.length; p++) {
      const poly = layout.polys[p];
      const n = poly.length;
      // Face normal by Newell's method (a bent wing gets its average facing)
      // and centroid, for culling and shading.
      let nx = 0;
      let ny = 0;
      let nz = 0;
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (let k = 0; k < n; k++) {
        const v = poly[k];
        const w = poly[k + 1 < n ? k + 1 : 0];
        const x0 = world[v * 3];
        const y0 = world[v * 3 + 1];
        const z0 = world[v * 3 + 2];
        const x1 = world[w * 3];
        const y1 = world[w * 3 + 1];
        const z1 = world[w * 3 + 2];
        nx += (y0 - y1) * (z0 + z1);
        ny += (z0 - z1) * (x0 + x1);
        nz += (x0 - x1) * (y0 + y1);
        cx += x0;
        cy += y0;
        cz += z0;
      }
      const body = p < layout.bodyPolys;
      // The camera sits at the origin: a closed-surface face whose outward
      // normal points away from it is hidden.
      if (body && layout.culled && nx * cx + ny * cy + nz * cz > 0) continue;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const dot = (nx * LX + ny * LY + nz * LZ) / nl;
      // Cards are double-sided; the mesh is lit on top, shaded underneath.
      const ndl = body && layout.culled ? Math.max(0, dot) : Math.abs(dot);
      const k = 1 + lit * (0.8 * ndl - 0.4);
      const r = Math.min(255, Math.round(cr8 * k));
      const g = Math.min(255, Math.round(cg8 * k));
      const bl = Math.min(255, Math.round(cb8 * k));
      this.fill(ctx, this.color(r, g, bl, 1));
      ctx.beginPath();
      ctx.moveTo(screen[poly[0] * 2], screen[poly[0] * 2 + 1]);
      for (let k = 1; k < n; k++) {
        ctx.lineTo(screen[poly[k] * 2], screen[poly[k] * 2 + 1]);
      }
      ctx.closePath();
      ctx.fill();
      // Mesh faces share edges; a hairline stroke hides the anti-aliasing seams.
      if (body && layout.culled) {
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }
  }

  /** Birds drawn in the last frame. */
  get drawn(): number {
    return this.count;
  }
}
