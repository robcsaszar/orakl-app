import type { Rarity } from "@orakl/shared";

/**
 * Tier → metal for every surface that renders the rarity scale (badge obols,
 * legend): common bronze, rare silver, legendary gold, exotic platinum. Each
 * entry sets the `--hi/--lt/--md/--dk/--deep/--ink` stops the obol paints with.
 * Client-side: Tailwind only generates classes it finds in this repo's source.
 */
export const RARITY_METAL_CLASSES: Record<Rarity, string> = {
  common:
    "metal-bronze [--hi:var(--color-bronze-lighter)] [--lt:var(--color-bronze-light)] [--md:var(--color-bronze)] [--dk:var(--color-bronze-dark)] [--deep:var(--color-bronze-darker)] [--ink:var(--color-bronze-light)]",
  rare: "metal-silver [--hi:var(--color-silver-lightest)] [--lt:var(--color-silver-light)] [--md:var(--color-silver)] [--dk:var(--color-silver-dark)] [--deep:var(--color-silver-darker)] [--ink:var(--color-silver-light)]",
  legendary:
    "metal-gold [--hi:var(--color-gold-lightest)] [--lt:var(--color-gold-light)] [--md:var(--color-gold)] [--dk:var(--color-gold-dark)] [--deep:var(--color-gold-darker)] [--ink:var(--color-gold-light)]",
  exotic:
    "metal-platinum [--hi:var(--color-platinum-lightest)] [--lt:var(--color-platinum-light)] [--md:var(--color-platinum)] [--dk:var(--color-platinum-dark)] [--deep:var(--color-platinum-darker)] [--ink:var(--color-platinum-lighter)]",
};
