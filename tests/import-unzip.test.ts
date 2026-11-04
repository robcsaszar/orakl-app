import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  MAX_ENTRIES,
  MAX_TOTAL_BYTES,
  unzipPack,
} from "../src/lib/import-unzip";

const zip = (files: Record<string, Uint8Array>) =>
  zipSync(files).buffer as ArrayBuffer;

describe("unzipPack", () => {
  it("returns each file by path and skips directory entries", () => {
    const entries = unzipPack(
      zip({
        "questions.json": strToU8("[]"),
        "images/a.png": new Uint8Array([1, 2, 3]),
      }),
    );
    expect([...entries.keys()].sort()).toEqual([
      "images/a.png",
      "questions.json",
    ]);
    expect(entries.get("images/a.png")).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("refuses more than the entry cap", () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < MAX_ENTRIES + 1; i++)
      files[`images/${i}.png`] = new Uint8Array(1);
    expect(() => unzipPack(zip(files))).toThrow(/more than \d+ files/);
  });

  it("refuses an archive that inflates past the byte cap", () => {
    const big = new Uint8Array(Math.ceil(MAX_TOTAL_BYTES / 2) + 1);
    expect(() => unzipPack(zip({ "a.bin": big, "b.bin": big }))).toThrow(
      /larger than \d+ MB/,
    );
  });

  it("refuses bytes that are not a zip", () => {
    expect(() => unzipPack(new Uint8Array([1, 2, 3, 4]).buffer)).toThrow(
      "not a readable zip",
    );
  });
});
