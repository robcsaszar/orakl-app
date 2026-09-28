<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn, tv } from "tailwind-variants";

  const badgeVariants = tv({
    base: "px-2 py-0.5 text-xs font-bold uppercase tracking-widest rounded-xl corner-shape-squircle font-sans select-none",
    variants: {
      variant: {
        default: "bg-secondary/20 text-foreground-darker",
        primary: "bg-primary text-background",
        secondary: "bg-secondary text-background",
        easy: "bg-success text-success-dark",
        medium: "bg-warning text-warning-dark",
        hard: "bg-danger text-danger-dark",
        category: "bg-secondary-300 text-background",
        all: "bg-transparent text-foreground-darker",
        pill: "rounded-full bg-background-lighter px-3 py-1 text-sm font-medium normal-case tracking-normal",
        host: "rounded-full bg-secondary/40 text-secondary-200 normal-case tracking-normal",
        observer: "rounded-full bg-background-lighter text-foreground-darker normal-case tracking-normal",
        count: "rounded-full bg-background-lighter px-3 py-1 text-sm font-medium normal-case tracking-normal",
        "count-active": "rounded-full bg-secondary text-background px-3 py-1 text-sm font-bold normal-case tracking-normal",
        status: "rounded-lg bg-background-lighter text-foreground-darker font-medium normal-case tracking-normal",
      },
      // Colour for status pills (admin tables); only takes effect with variant="status".
      tone: { neutral: "", primary: "", success: "", warning: "", danger: "", info: "" },
    },
    compoundVariants: [
      { variant: "status", tone: "primary", class: "bg-primary/15 text-primary" },
      { variant: "status", tone: "success", class: "bg-success/15 text-success" },
      { variant: "status", tone: "warning", class: "bg-warning/15 text-warning" },
      { variant: "status", tone: "danger", class: "bg-danger/15 text-danger" },
      { variant: "status", tone: "info", class: "bg-info/15 text-info" },
    ],
    defaultVariants: { variant: "default", tone: "neutral" },
  });

  let {
    variant = "default",
    tone = "neutral",
    class: className = "",
    children,
    ...props
  }: {
    variant?: VariantProps<typeof badgeVariants>["variant"];
    tone?: VariantProps<typeof badgeVariants>["tone"];
    class?: string;
    children?: Snippet;
  } & HTMLAttributes<HTMLSpanElement> = $props();
</script>

<span class={cn(badgeVariants({ variant, tone, class: className }))} {...props}>
  {@render children?.()}
</span>
