import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Pure oklch -> sRGB -> relative luminance -> WCAG contrast ratio conversion.
function oklchToLinearSrgb(
  L: number,
  C: number,
  hDeg: number,
): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = Math.cos(h) * C;
  const b = Math.sin(h) * C;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [r, g, bl];
}

function linearToSrgb(c: number): number {
  const clamped = Math.min(1, Math.max(0, c));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function relLum(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function oklchLuminance(L: number, C: number, H: number): number {
  const [r, g, b] = oklchToLinearSrgb(L, C, H);
  return (
    0.2126 * relLum(linearToSrgb(r)) +
    0.7152 * relLum(linearToSrgb(g)) +
    0.0722 * relLum(linearToSrgb(b))
  );
}

function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Alpha-blend a *-dark token over the background in linear sRGB, as a *-dark/15 wash would.
function washLuminance(
  dark: [number, number, number],
  bg: [number, number, number],
  alpha: number,
): number {
  const [dr, dg, db] = oklchToLinearSrgb(...dark);
  const [br, bgc, bb] = oklchToLinearSrgb(...bg);
  const r = alpha * dr + (1 - alpha) * br;
  const g = alpha * dg + (1 - alpha) * bgc;
  const b = alpha * db + (1 - alpha) * bb;
  return (
    0.2126 * relLum(linearToSrgb(r)) +
    0.7152 * relLum(linearToSrgb(g)) +
    0.0722 * relLum(linearToSrgb(b))
  );
}

type Oklch = [number, number, number];

function parseOklch(value: string): Oklch {
  const match = value.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)/,
  );
  if (!match) throw new Error(`could not parse oklch value: ${value}`);
  const L = match[2] === "%" ? Number(match[1]) / 100 : Number(match[1]);
  return [L, Number(match[3]), Number(match[4])];
}

function findVar(css: string, name: string): string | null {
  const re = new RegExp(`${name}:\\s*([^;]+);`);
  const match = css.match(re);
  return match ? match[1].trim() : null;
}

const css = readFileSync(join(process.cwd(), "src/styles/global.css"), "utf-8");
const themeCss = readFileSync(
  join(process.cwd(), "packages/design-tokens/theme.css"),
  "utf-8",
);

const baseSection = `${themeCss}\n${css}`;
const lightPhaseMatch = css.match(
  /html\[data-effective-theme="light"\],\s*\[data-theme="light"\],\s*\[data-theme="morning"\],\s*html\[data-sky-phase="morning"\]\s*\{([^}]+)\}/,
);
if (!lightPhaseMatch) throw new Error("could not find light-phase block");
const lightPhaseCss = lightPhaseMatch[1];

function resolveToken(name: string): Oklch {
  const overridden = findVar(lightPhaseCss, name);
  const value = overridden ?? findVar(baseSection, name);
  if (!value) throw new Error(`token not found: ${name}`);
  return parseOklch(value);
}

const secondary50 = resolveToken("--color-secondary-50");
const bgLuminance = oklchLuminance(...secondary50);

describe("light-phase state token contrast", () => {
  it("keeps the base --color-warning token unchanged (dark phase)", () => {
    const baseWarning = findVar(baseSection, "--color-warning");
    expect(baseWarning?.replace(/\s+/g, " ")).toBe("oklch(76% 0.17 66.31)");
  });

  it("declares every overridden token in the non-inline @theme block so utilities reference var()", () => {
    // Tokens inside `@theme inline` are baked into utilities as literals and a
    // cascade override on the phase selector never reaches them.
    const nonInline = themeCss.match(/@theme\s*\{([^}]+)\}/)?.[1] ?? "";
    for (const line of lightPhaseCss.split("\n")) {
      const name = line.match(/^\s*(--color-[a-z-]+):/)?.[1];
      if (name) expect(findVar(nonInline, name), name).not.toBeNull();
    }
  });

  for (const name of ["warning", "success", "danger", "info"] as const) {
    it(`--color-${name} reaches AA (>=4.5:1) as text on secondary-50 in the light phase`, () => {
      const text = resolveToken(`--color-${name}`);
      const textLum = oklchLuminance(...text);
      const ratio = contrastRatio(textLum, bgLuminance);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it(`--color-${name} reaches AA (>=4.5:1) inside a --color-${name}-dark/15 wash on secondary-50`, () => {
      const text = resolveToken(`--color-${name}`);
      const dark = resolveToken(`--color-${name}-dark`);
      const textLum = oklchLuminance(...text);
      const washLum = washLuminance(dark, secondary50, 0.15);
      const ratio = contrastRatio(textLum, washLum);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }
});
