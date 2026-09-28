<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { VariantProps } from "tailwind-variants";
  import { cn, tv } from "tailwind-variants";

  const cardVariants = tv({
    base: "rounded-3xl corner-shape-squircle border-2 border-transparent flex flex-col gap-6",
    variants: {
      variant: {
        default: "border-secondary/10 bg-secondary/5",
        highlighted: "border-secondary-700 bg-secondary-900/30",
        success: "border-success bg-success/50",
        warning: "border-warning/40 bg-warning-dark/15",
        danger: "border-danger/40 bg-danger-dark/20",
        flame: "border-flame/40 bg-flame-dark/20",
        info: "border-info bg-info/50",
        rooftop: "border-secondary bg-secondary text-background",
        mezzanine: "border-secondary/10 bg-secondary/10 backdrop-blur-xs",
        ground: "border-secondary/2.5 bg-secondary-700/5 backdrop-blur-sm",
      },
      padding: {
        none: "",
        sm: "p-2",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: { variant: "default", padding: "md" },
  });
  let {
    variant = "default",
    padding = "md",
    class: className = "",
    children,
    ...props
  }: {
    variant?: VariantProps<typeof cardVariants>["variant"];
    padding?: VariantProps<typeof cardVariants>["padding"];
    class?: string;
    children?: Snippet;
  } & HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class={cn(cardVariants({ variant, padding, class: className }))} {...props}>
  {@render children?.()}
</div>
