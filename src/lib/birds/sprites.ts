import { basis } from "./event";
import { buildLocal, layoutFor, MAX_VERTS } from "./model";
import type { Species } from "./species";

/** Frame edge, px. */
export const FRAME = 64;
/** Wingspan drawn into a frame, px. */
export const FRAME_SPAN = 52;
/** Wingbeat frames per atlas; frame `BEATS` is the gliding pose. */
export const BEATS = 16;
export const FRAMES = BEATS + 1;

const CACHE_MAX = 64;

// Same sun as the model renderer.
const LX = 0.3 / Math.hypot(0.3, 1, -0.35);
const LY = 1 / Math.hypot(0.3, 1, -0.35);
const LZ = -0.35 / Math.hypot(0.3, 1, -0.35);

export type AtlasCanvas = HTMLCanvasElement | OffscreenCanvas;

export interface Atlas {
  canvas: AtlasCanvas;
  /** Screen length of the canonical right vector per metre of span: the
   * foreshortening already baked into the frames' wing axis. */
  rightScale: number;
}

function makeCanvas(w: number, h: number): AtlasCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Pre-rendered birds for the mid distances: one strip per species and
 * colour of sixteen wingbeat frames plus a glide, drawn once from the same
 * model and shading the close-range renderer uses, from the canonical view
 * of a bird crossing left to right. Drawing a bird is then one `drawImage`
 * under an affine transform for its heading, bank and foreshortening.
 */
export class SpriteAtlas {
  private readonly cache = new Map<string, Atlas>();
  private readonly local = new Float32Array(MAX_VERTS * 3);
  private readonly world = new Float32Array(MAX_VERTS * 3);
  private readonly b = new Float32Array(9);

  /** The strip for a species in a colour (lazily baked, bounded cache). */
  get(sp: Species, r: number, g: number, b: number, lit: number): Atlas {
    // 32 levels per channel: a palette easing over two seconds bakes a few
    // dozen strips at most, each a fraction of a millisecond.
    const key = `${sp.id}:${r >> 3}:${g >> 3}:${b >> 3}:${Math.round(lit * 8)}`;
    let atlas = this.cache.get(key);
    if (atlas) return atlas;
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value as string;
      this.cache.delete(oldest);
    }
    atlas = this.bake(sp, (r >> 3) << 3, (g >> 3) << 3, (b >> 3) << 3, lit);
    this.cache.set(key, atlas);
    return atlas;
  }

  private bake(
    sp: Species,
    r: number,
    g: number,
    b: number,
    lit: number,
  ): Atlas {
    const canvas = makeCanvas(FRAME * FRAMES, FRAME);
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    const bs = this.b;
    basis(1, 0, 0, bs);
    const rightScale = Math.hypot(bs[3], bs[4]);
    if (!ctx) return { canvas, rightScale };
    const k = FRAME_SPAN / sp.span;
    const layout = layoutFor(sp, "card");
    const local = this.local;
    const world = this.world;
    for (let frame = 0; frame < FRAMES; frame++) {
      const glide = frame === BEATS;
      const phase = glide ? 0 : (frame / BEATS) * Math.PI * 2;
      const nv = buildLocal(sp, phase, glide ? 0 : 1, local, 0, "card", 0);
      // Canonical view: camera on +z, bird flying +x, flight up tilted
      // toward the viewer, orthographic. Screen x = world x, y = −world y.
      const ox = frame * FRAME + FRAME / 2;
      const oy = FRAME / 2;
      for (let v = 0; v < nv; v++) {
        const x = local[v * 3];
        const y = local[v * 3 + 1];
        const z = local[v * 3 + 2];
        world[v * 3] = bs[0] * x + bs[6] * y + bs[3] * z;
        world[v * 3 + 1] = bs[1] * x + bs[7] * y + bs[4] * z;
        world[v * 3 + 2] = bs[2] * x + bs[8] * y + bs[5] * z;
      }
      for (const poly of layout.polys) {
        let nx = 0;
        let ny = 0;
        let nz = 0;
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i] * 3;
          const c = poly[(i + 1) % poly.length] * 3;
          nx += (world[a + 1] - world[c + 1]) * (world[a + 2] + world[c + 2]);
          ny += (world[a + 2] - world[c + 2]) * (world[a] + world[c]);
          nz += (world[a] - world[c]) * (world[a + 1] + world[c + 1]);
        }
        const nl = Math.hypot(nx, ny, nz) || 1;
        const ndl = Math.abs((nx * LX + ny * LY + nz * LZ) / nl);
        const shade = 1 + lit * (0.8 * ndl - 0.4);
        ctx.fillStyle = `rgb(${Math.min(255, Math.round(r * shade))},${Math.min(255, Math.round(g * shade))},${Math.min(255, Math.round(b * shade))})`;
        ctx.beginPath();
        for (let i = 0; i < poly.length; i++) {
          const a = poly[i] * 3;
          const sx = ox + world[a] * k;
          const sy = oy - world[a + 1] * k;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    return { canvas, rightScale };
  }
}
