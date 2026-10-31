import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { unzipPack } from "../src/lib/import-unzip";

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

  it("refuses more than 500 entries", () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < 501; i++) files[`images/${i}.png`] = new Uint8Array(1);
    expect(() => unzipPack(zip(files))).toThrow("more than 500 files");
  });

  it("refuses an archive that inflates past 60 MB", () => {
    const big = new Uint8Array(31 * 1024 * 1024);
    expect(() => unzipPack(zip({ "a.bin": big, "b.bin": big }))).toThrow(
      "larger than 60 MB",
    );
  });

  it("refuses bytes that are not a zip", () => {
    expect(() => unzipPack(new Uint8Array([1, 2, 3, 4]).buffer)).toThrow(
      "not a readable zip",
    );
  });
});
