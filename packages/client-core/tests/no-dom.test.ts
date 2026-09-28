import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = join(import.meta.dirname, "../src");
const FORBIDDEN = [
  'from "svelte',
  "window.",
  "document.",
  "localStorage",
  "sessionStorage",
];

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

describe("no DOM / Svelte / browser storage in client-core", () => {
  it("contains none of the forbidden strings", () => {
    const offenders: string[] = [];
    for (const file of listFiles(SRC_DIR)) {
      const contents = readFileSync(file, "utf8");
      for (const needle of FORBIDDEN) {
        if (contents.includes(needle)) {
          offenders.push(`${file}: ${needle}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
