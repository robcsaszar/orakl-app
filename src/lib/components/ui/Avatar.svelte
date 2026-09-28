<script lang="ts">
  import type { VariantProps } from "tailwind-variants";
  import { cn } from "tailwind-variants";
  import { avatarVariants, avatarFallbackVariants } from "@/lib/constants/styles.constants";

  let {
    src,
    alt = "",
    size = "md",
    fallbackInitial,
    class: className = "",
  }: {
    src?: string;
    alt?: string;
    size?: VariantProps<typeof avatarVariants>["size"];
    fallbackInitial?: string;
    class?: string;
  } = $props();
</script>

{#if src}
  <img {src} {alt} class={cn(avatarVariants({ size, class: className }))} />
{:else}
  <span class={cn(avatarFallbackVariants({ size, class: className }))}>
    {fallbackInitial ?? "?"}
  </span>
{/if}
