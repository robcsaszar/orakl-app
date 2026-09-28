<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLLabelAttributes } from "svelte/elements";
  import { cn, tv } from "tailwind-variants";

  const radioOptionVariants = tv({
    base: [
      "relative flex flex-col items-center backdrop-blur-xs bg-background-lighter/10 p-5 corner-shape-squircle rounded-2xl cursor-pointer active:scale-[0.95] transition-[scale] duration-200 ease-ease-in-out-sine",
      "hover:bg-secondary/10 hover:border-secondary border-2 border-background-lighter",
      "has-checked:border-secondary has-checked:bg-secondary has-checked:text-secondary-900 has-checked:font-bold",
      "focus-within:outline-none focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:ring-2 focus-within:ring-secondary/25",
    ],
    variants: {
      locked: {
        true: "border-secondary/10 bg-background/10 text-foreground-darker opacity-45 cursor-not-allowed active:scale-100 hover:border-secondary/10 hover:bg-background/10",
      },
    },
  });

  let {
    locked = false,
    class: className = "",
    children,
    ...props
  }: { locked?: boolean; class?: string; children?: Snippet } & HTMLLabelAttributes = $props();
</script>

<label class={cn(radioOptionVariants({ locked, class: className }))} {...props}>
  {@render children?.()}
</label>
