import { tv } from "tailwind-variants";

export const formInputVariants = tv({
  base: "rounded-2xl border backdrop-blur-xs corner-shape-squircle border-background-lighter bg-background-lighter/20 text-foreground placeholder:text-foreground-darker/25 focus-visible:placeholder:text-foreground-darker/10 border-secondary/50 focus-visible:border-secondary/0 focus-visible:ring-2 focus-visible:ring-secondary focus-visible:outline-hidden form-input p-2.5",
});

export const radioOptionClass =
  "relative flex flex-col items-center backdrop-blur-xs bg-background-lighter/10 p-5 corner-shape-squircle rounded-2xl cursor-pointer active:scale-[0.95] transition-[scale] duration-200 border-2 border-background-lighter hover:bg-secondary/10 hover:border-secondary has-checked:border-secondary has-checked:bg-secondary has-checked:text-secondary-900 has-checked:font-bold focus-within:outline-none focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:ring-2 focus-within:ring-secondary/25";
