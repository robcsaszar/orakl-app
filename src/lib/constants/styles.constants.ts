import { tv } from "tailwind-variants";

export const avatarVariants = tv({
  base: "[image-rendering:pixelated]",
  variants: {
    size: {
      sm: "h-6 w-6",
      md: "h-8 w-8",
      lg: "h-16 w-16",
    },
  },
  defaultVariants: { size: "md" },
});

export const avatarFallbackVariants = tv({
  base: "flex items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300",
  variants: {
    size: {
      sm: "h-6 w-6 text-xs",
      md: "h-8 w-8 text-sm",
      lg: "h-16 w-16 text-lg",
    },
  },
  defaultVariants: { size: "md" },
});

export const checkboxOptionVariants = tv({
  base: [
    "group flex cursor-pointer gap-2 corner-shape-squircle border-2 backdrop-blur-xs transition-colors duration-200 ease-ease-in-out-quart",
    "focus-within:outline-hidden focus-within:ring-2 focus-within:ring-secondary focus-within:ring-offset-2 focus-within:ring-offset-background has-checked:focus-within:ring-secondary/50",
  ],
  variants: {
    variant: {
      row: "items-center rounded-lg px-3 py-2 border-secondary/10 bg-background/20 hover:border-secondary has-checked:border-secondary has-checked:bg-secondary-800/30",
      tile: "isolate relative flex-col self-stretch flex-1 md:flex-none rounded-2xl px-3 py-2 bg-background/20 text-foreground-darker border-secondary/10 hover:bg-secondary-700/20 hover:border-secondary has-checked:border-secondary has-checked:bg-secondary-800/30 has-checked:text-secondary",
    },
    locked: {
      true: "opacity-45 cursor-not-allowed hover:bg-background/20 hover:border-secondary/10",
    },
  },
  defaultVariants: { variant: "row" },
});

export const playerRowVariants = tv({
  base: "flex items-center justify-between rounded-xl border px-4 py-3",
  variants: {
    variant: {
      default: "border-gray-700",
      leader: "border-violet-500 bg-violet-950/30",
      winner: "border-amber-500 bg-amber-950/30",
    },
  },
  defaultVariants: { variant: "default" },
});
