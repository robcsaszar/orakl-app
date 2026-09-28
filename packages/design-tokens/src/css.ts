import {
  breakpoints,
  colors,
  container,
  fontWeight,
  semanticColors,
  spacing,
  text,
  tracking,
} from "./index.ts";

function declarations(
  prefix: string,
  values: Record<string, string>,
): string[] {
  return Object.entries(values).map(
    ([key, value]) => `  --${prefix}-${key}: ${value};`,
  );
}

function textDeclarations(): string[] {
  const lines: string[] = [];
  for (const [key, token] of Object.entries(text)) {
    lines.push(`  --text-${key}: ${token.value};`);
    if (token.lineHeight)
      lines.push(`  --text-${key}--line-height: ${token.lineHeight};`);
    if ("fontWeight" in token)
      lines.push(`  --text-${key}--font-weight: ${token.fontWeight};`);
    if (token.letterSpacing)
      lines.push(`  --text-${key}--letter-spacing: ${token.letterSpacing};`);
  }
  return lines;
}

/**
 * Renders the design tokens as the two `@theme` blocks Tailwind v4 expects:
 * semantic colours in a non-inline `@theme` (so utilities reference
 * `var(--color-*)` and phase overrides cascade), everything else in
 * `@theme inline`.
 */
export function themeCss(): string {
  const semanticBlock = [
    "@theme {",
    ...declarations("color", semanticColors),
    "}",
  ].join("\n");

  const inlineBlock = [
    "@theme inline {",
    ...declarations("color", colors),
    "",
    ...textDeclarations(),
    "",
    ...declarations("font-weight", fontWeight),
    "",
    ...declarations("tracking", tracking),
    "",
    ...declarations("container", container),
    "",
    ...declarations("breakpoint", breakpoints),
    "",
    ...declarations("spacing", spacing),
    "}",
  ].join("\n");

  return `${semanticBlock}\n\n${inlineBlock}\n`;
}
