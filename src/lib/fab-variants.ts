import { tv } from "tailwind-variants";

/** Draggable floating trigger (feedback widget, mimic dev toolbar) — one
 *  squircle shape; the consumer supplies its own position classes. */
export const fabVariants = tv({
  base: "z-[51] flex items-center justify-center gap-1.5 rounded-2xl corner-shape-squircle border-2 p-3 shadow-lg select-none",
  variants: {
    tone: {
      neutral:
        "border-secondary/40 bg-background text-foreground-darker hover:border-secondary/70 hover:text-foreground",
      active: "border-secondary bg-secondary text-background",
      warning:
        "border-warning/40 bg-background text-warning hover:border-warning/80",
    },
  },
  defaultVariants: { tone: "neutral" },
});
