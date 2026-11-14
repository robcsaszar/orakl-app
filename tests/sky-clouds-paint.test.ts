import { describe, expect, it } from "vitest";
import { PAINT_COLS } from "@/lib/sky-clouds";
import {
  discCells,
  FAINT,
  fillRegion,
  lineCells,
  mirrorCells,
  reflectCell,
  rimCells,
  SOLID,
  setCell,
  strokeValue,
  traceMask,
} from "@/lib/sky-clouds-paint";

const sky = 0;
const cloud = SOLID + 1;
const faint = FAINT + 1;

describe("strokeValue", () => {
  it("pools on sky and leaves solid cloud alone", () => {
    expect(strokeValue(0, sky, 1, 2)).toBe(1);
    expect(strokeValue(0, cloud, 1, 2)).toBe(0);
  });

  it("mists first at light strength, then pools", () => {
    const first = strokeValue(0, sky, 1, 1);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(1);
    expect(strokeValue(first, sky, 1, 1)).toBe(1);
  });

  it("erodes cloud a step further on each pass until it clears outright", () => {
    const a = strokeValue(0, cloud, -1, 1);
    const b = strokeValue(a, faint, -1, 1);
    const c = strokeValue(b, faint, -1, 1);
    expect(a).toBeLessThan(0);
    expect(b).toBeLessThan(a);
    expect(c).toBeLessThan(b);
    expect(strokeValue(c, faint, -1, 1)).toBe(c);
  });

  it("clears at once at full strength", () => {
    expect(strokeValue(0, cloud, -1, 3)).toBe(
      strokeValue(strokeValue(0, cloud, -1, 2), faint, -1, 2),
    );
  });

  it("leaves open sky alone when eroding", () => {
    expect(strokeValue(0, sky, -1, 2)).toBe(0);
  });

  it("undoes the other mode before it does its own", () => {
    expect(strokeValue(1, sky, -1, 2)).toBe(0);
    expect(strokeValue(-1, sky, 1, 2)).toBe(0);
  });
});

describe("setCell", () => {
  it("drops a cell at zero and reports changes only", () => {
    const cells = { "1,1": 1 };
    expect(setCell(cells, "1,1", 1)).toBe(false);
    expect(setCell(cells, "1,1", 0)).toBe(true);
    expect(cells).toEqual({});
  });
});

describe("lineCells", () => {
  it("runs from end to end with no gaps", () => {
    const cells = lineCells({ i: 2, j: 1 }, { i: 9, j: 4 });
    expect(cells[0]).toEqual({ i: 2, j: 1 });
    expect(cells.at(-1)).toEqual({ i: 9, j: 4 });
    for (let k = 1; k < cells.length; k++) {
      const a = cells[k - 1] as { i: number; j: number };
      const b = cells[k] as { i: number; j: number };
      expect(Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j))).toBe(1);
    }
  });
});

describe("discCells", () => {
  it("is one cell at size one and grows with size", () => {
    expect(discCells({ i: 5, j: 5 }, 1)).toEqual([{ i: 5, j: 5 }]);
    expect(discCells({ i: 5, j: 5 }, 3).length).toBeGreaterThan(
      discCells({ i: 5, j: 5 }, 2).length,
    );
  });
});

/** A grid of sky with a filled rectangle of cloud, hollow where `hole` says. */
function grid(
  rows: number,
  box: [number, number, number, number],
  hole?: [number, number, number, number],
) {
  const alpha = new Uint8Array(PAINT_COLS * rows);
  for (let j = box[1]; j <= box[3]; j++)
    for (let i = box[0]; i <= box[2]; i++) alpha[j * PAINT_COLS + i] = cloud;
  if (hole)
    for (let j = hole[1]; j <= hole[3]; j++)
      for (let i = hole[0]; i <= hole[2]; i++) alpha[j * PAINT_COLS + i] = sky;
  return alpha;
}

describe("fillRegion", () => {
  const rows = 20;
  const alpha = grid(rows, [10, 5, 30, 15], [18, 8, 22, 12]);

  it("finds the whole cloud from any cell of it", () => {
    const r = fillRegion(alpha, rows, { i: 11, j: 6 });
    expect(r.cloud).toBe(true);
    expect(r.cells).toHaveLength(21 * 11 - 5 * 5);
  });

  it("finds an enclosed bay as closed sky", () => {
    const r = fillRegion(alpha, rows, { i: 20, j: 10 });
    expect(r.cloud).toBe(false);
    expect(r.open).toBe(false);
    expect(r.cells).toHaveLength(25);
  });

  it("reports the sky outside as open", () => {
    expect(fillRegion(alpha, rows, { i: 0, j: 0 }).open).toBe(true);
  });
});

describe("rimCells", () => {
  const rows = 20;
  const alpha = grid(rows, [10, 5, 30, 15]);

  it("takes the outermost ring of cloud", () => {
    const rim = rimCells(alpha, rows, true);
    expect(rim).toHaveLength(2 * 21 + 2 * 9);
    expect(
      rim.every((c) => c.i === 10 || c.i === 30 || c.j === 5 || c.j === 15),
    ).toBe(true);
  });

  it("takes the ring of sky touching the cloud", () => {
    const rim = rimCells(alpha, rows, false);
    expect(rim).toHaveLength(2 * 21 + 2 * 11);
    expect(rim.every((c) => alpha[c.j * PAINT_COLS + c.i] === sky)).toBe(true);
  });
});

describe("traceMask", () => {
  it("follows transparency where the image has any", () => {
    const px = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]);
    expect(traceMask(px)).toEqual([true, false]);
  });

  it("follows brightness on an opaque image", () => {
    const px = new Uint8ClampedArray([240, 240, 240, 255, 20, 20, 20, 255]);
    expect(traceMask(px)).toEqual([true, false]);
  });
});

describe("mirrorCells", () => {
  it("flips columns and keeps rows and values", () => {
    expect(mirrorCells({ "0,3": 1, "10,4": -2 })).toEqual({
      [`${PAINT_COLS - 1},3`]: 1,
      [`${PAINT_COLS - 11},4`]: -2,
    });
  });
});

describe("reflectCell", () => {
  const rows = 20;

  it("lands left on right across an upright line", () => {
    expect(reflectCell({ i: 3, j: 7 }, 90, rows)).toEqual({
      i: PAINT_COLS - 4,
      j: 7,
    });
  });

  it("lands top on bottom across a level line", () => {
    expect(reflectCell({ i: 3, j: 2 }, 0, rows)).toEqual({ i: 3, j: rows - 3 });
  });

  it("returns a cell to itself when mirrored twice", () => {
    for (const degrees of [15, 45, 120]) {
      const once = reflectCell({ i: 22, j: 6 }, degrees, rows);
      const twice = reflectCell(once, degrees, rows);
      expect(Math.abs(twice.i - 22)).toBeLessThanOrEqual(1);
      expect(Math.abs(twice.j - 6)).toBeLessThanOrEqual(1);
    }
  });
});
