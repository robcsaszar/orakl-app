import type { Rarity } from "@orakl/shared";

/**
 * Canonical tier colours for every surface that renders the rarity scale
 * (badge chips, legends), so the key always matches the badges it explains.
 * Client-side: Tailwind only generates classes it finds in this repo's source.
 */
export const RARITY_CHIP_CLASSES: Record<Rarity, string> = {
  common: "border-zinc-500/40 bg-zinc-500/10 text-zinc-200",
  rare: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  legendary: "border-violet-500/50 bg-violet-500/10 text-violet-200",
  exotic:
    "border-gold bg-gold/20 text-gold-lighter shadow-[0_0_12px_-2px] shadow-gold/40",
};
