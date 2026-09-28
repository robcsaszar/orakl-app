import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { themeCss } from "../packages/design-tokens/src/css.ts";
import { semanticColors } from "../packages/design-tokens/src/index.ts";

const themeCssPath = join(process.cwd(), "packages/design-tokens/theme.css");
const globalCssPath = join(process.cwd(), "src/styles/global.css");
const designMdPath = join(process.cwd(), "DESIGN.md");

describe("design tokens", () => {
  it("themeCss() matches the committed theme.css — drift guard", () => {
    const committed = readFileSync(themeCssPath, "utf-8");
    expect(themeCss()).toBe(committed);
  });

  it("renders semantic colours in a non-inline @theme block and palettes in @theme inline", () => {
    const css = themeCss();
    const semanticBlock =
      css.match(/(?<!inline )@theme \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const inlineBlock = css.match(/@theme inline \{([\s\S]*?)\n\}/)?.[1] ?? "";

    expect(semanticBlock).toContain("--color-success:");
    expect(semanticBlock).not.toContain("--color-primary-500:");
    expect(inlineBlock).toContain("--color-primary-500:");
    expect(inlineBlock).not.toContain("--color-success:");
  });

  it("global.css @theme blocks hold no moved token declarations", () => {
    const css = readFileSync(globalCssPath, "utf-8");
    const themeBlocks = [
      ...css.matchAll(/@theme(?: inline)? \{([\s\S]*?)\n\}/g),
    ].map((m) => m[1]);
    const combined = themeBlocks.join("\n");

    expect(combined).not.toMatch(/--color-/);
    expect(combined).not.toMatch(/--text-h/);
    expect(combined).not.toMatch(/--spacing-/);
    expect(combined).not.toMatch(/--breakpoint-/);
  });

  it("every DESIGN.md front-matter colour with a same-named token matches its value", () => {
    const designMd = readFileSync(designMdPath, "utf-8");
    const lines = designMd
      .split("\n")
      .filter((line) => /^\s+[\w-]+: "oklch/.test(line));

    let checked = 0;
    for (const line of lines) {
      const match = line.match(/^\s+([\w-]+): "(.+)"$/);
      if (!match) continue;
      const [, name, value] = match;
      if (name in semanticColors) {
        const normalize = (s: string) => s.replace(/\s+/g, " ");
        expect(
          normalize(semanticColors[name as keyof typeof semanticColors]),
        ).toBe(normalize(value));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
