import { PAINT_COLS, type PaintCells } from "@/lib/sky-clouds";

/** Alpha above which a grid cell reads as cloud. */
export const SOLID = 40;
/** Alpha above which a grid cell still holds faint cloud. */
export const FAINT = 4;

/** A cell of the paint grid, as drawn. */
export interface Cell {
  i: number;
  j: number;
}

/** 1 pools cloud in, -1 erodes it. */
export type PaintMode = 1 | -1;
/** How far one pass goes: 1 light, 2 normal, 3 full. */
export type PaintStrength = 1 | 2 | 3;

/**
 * A cell's value after one pass of the brush over it. Adding undoes a cut
 * before it pools; eroding undoes paint before it cuts. Light mists or thins,
 * normal pools or erodes, full clears at once; a later pass over what still
 * shows goes one step further. `alpha` is what the cloud shows at the cell.
 */
export function strokeValue(
  current: number,
  alpha: number,
  mode: PaintMode,
  strength: PaintStrength,
): number {
  if (mode > 0) {
    if (current < 0) return 0;
    if (alpha > SOLID) return current;
    return strength === 1 ? (current >= 0.5 ? 1 : 0.5) : 1;
  }
  if (current > 0) return 0;
  if (alpha <= FAINT) return current;
  if (strength === 3) return -2;
  if (current === 0) return strength === 1 ? -0.5 : -1;
  return current === -0.5 ? -1 : -2;
}

/** Writes a cell's value, or drops the cell at 0. Returns whether anything changed. */
export function setCell(
  cells: PaintCells,
  key: string,
  value: number,
): boolean {
  const current = cells[key] ?? 0;
  if (value === current) return false;
  if (value === 0) delete cells[key];
  else cells[key] = value;
  return true;
}

/** The grid cells on the straight run from `a` to `b`, ends included. */
export function lineCells(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = [];
  let { i, j } = a;
  const dx = Math.abs(b.i - i);
  const dy = -Math.abs(b.j - j);
  const sx = i < b.i ? 1 : -1;
  const sy = j < b.j ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ i, j });
    if (i === b.i && j === b.j) return out;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      i += sx;
    }
    if (e2 <= dx) {
      err += dx;
      j += sy;
    }
  }
}

/** The cells a round brush `size` cells across covers, centred on `c`. */
export function discCells(c: Cell, size: number): Cell[] {
  const rad = size - 1;
  const out: Cell[] = [];
  for (let dj = -rad; dj <= rad; dj++) {
    for (let di = -rad; di <= rad; di++) {
      if (di * di + dj * dj <= rad * rad + 0.5)
        out.push({ i: c.i + di, j: c.j + dj });
    }
  }
  return out;
}

/**
 * The connected region of like cells around `start`: cloud (anything above
 * `FAINT`) or sky. `open` is true when the region touches the grid's edge.
 */
export function fillRegion(
  alpha: Uint8Array,
  rows: number,
  start: Cell,
): { cells: Cell[]; cloud: boolean; open: boolean } {
  const isCloud = (i: number, j: number) =>
    (alpha[j * PAINT_COLS + i] as number) > FAINT;
  const cloud = isCloud(start.i, start.j);
  const seen = new Uint8Array(PAINT_COLS * rows);
  const stack = [start];
  const cells: Cell[] = [];
  let open = false;
  seen[start.j * PAINT_COLS + start.i] = 1;
  while (stack.length) {
    const c = stack.pop() as Cell;
    cells.push(c);
    if (c.i === 0 || c.i === PAINT_COLS - 1 || c.j === 0 || c.j === rows - 1)
      open = true;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const i = c.i + di;
      const j = c.j + dj;
      if (
        i < 0 ||
        i >= PAINT_COLS ||
        j < 0 ||
        j >= rows ||
        seen[j * PAINT_COLS + i] ||
        isCloud(i, j) !== cloud
      )
        continue;
      seen[j * PAINT_COLS + i] = 1;
      stack.push({ i, j });
    }
  }
  return { cells, cloud, open };
}

/** The cloud's rim: its outermost cells (`inside`), or the sky cells touching it. */
export function rimCells(
  alpha: Uint8Array,
  rows: number,
  inside: boolean,
): Cell[] {
  const cloud = (i: number, j: number) =>
    i >= 0 &&
    i < PAINT_COLS &&
    j >= 0 &&
    j < rows &&
    (alpha[j * PAINT_COLS + i] as number) > SOLID;
  const out: Cell[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < PAINT_COLS; i++) {
      if (cloud(i, j) !== inside) continue;
      const touches = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([di = 0, dj = 0]) => cloud(i + di, j + dj) !== inside);
      const inGrid =
        inside ||
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([di = 0, dj = 0]) => cloud(i + di, j + dj));
      if (touches && inGrid) out.push({ i, j });
    }
  }
  return out;
}

/**
 * Which cells of an image are cloud, from its pixels at grid size (RGBA):
 * transparency decides where the image has any, brightness otherwise.
 */
export function traceMask(rgba: Uint8ClampedArray): boolean[] {
  const n = rgba.length / 4;
  const lum = new Float32Array(n);
  let hasAlpha = false;
  let lo = 255;
  let hi = 0;
  for (let p = 0; p < n; p++) {
    if ((rgba[p * 4 + 3] as number) < 250) hasAlpha = true;
    lum[p] =
      0.3 * (rgba[p * 4] as number) +
      0.59 * (rgba[p * 4 + 1] as number) +
      0.11 * (rgba[p * 4 + 2] as number);
    lo = Math.min(lo, lum[p] as number);
    hi = Math.max(hi, lum[p] as number);
  }
  const mid = (lo + hi) / 2;
  return Array.from({ length: n }, (_, p) =>
    hasAlpha ? (rgba[p * 4 + 3] as number) > 128 : (lum[p] as number) > mid,
  );
}

/** The painted cells mirrored left to right. */
export function mirrorCells(cells: PaintCells): PaintCells {
  return Object.fromEntries(
    Object.entries(cells).map(([key, v]) => {
      const [i = 0, j = 0] = key.split(",").map(Number);
      return [`${PAINT_COLS - 1 - i},${j}`, v];
    }),
  );
}

/**
 * A cell mirrored across a line through the middle of the grid. `degrees` is
 * the line's angle: 90 is upright, so left lands on right.
 */
export function reflectCell(c: Cell, degrees: number, rows: number): Cell {
  const a = (degrees * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = -Math.sin(a);
  const dx = c.i + 0.5 - PAINT_COLS / 2;
  const dy = c.j + 0.5 - rows / 2;
  const along = dx * ux + dy * uy;
  return {
    i: Math.floor(PAINT_COLS / 2 + 2 * along * ux - dx),
    j: Math.floor(rows / 2 + 2 * along * uy - dy),
  };
}
