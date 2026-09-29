<script lang="ts">
import { RARITY_LABELS, RARITY_ORDER } from "@orakl/shared";
import { RARITY_METAL_CLASSES } from "$lib/rarity-classes";
  
  import { cn } from "tailwind-variants";
  import Icon from "./Icon.svelte";
  import FieldDescription from "./partials/FieldDescription.svelte";

  let {
    id,
    icon,
  }: {
    id: string;
    icon?: "info" | "question" | "candle" | "bulbs";
  } = $props();
</script>

<!-- Rarity ladder, lowest to highest, behind the field-description toggle. -->
<FieldDescription {id} {icon}>
  {#snippet description()}
    <div class="flex flex-wrap items-center gap-1.5">
      {#each RARITY_ORDER as r, i (r)}
        <span
          class={cn(
            "inline-flex items-center gap-1.5 text-xs font-bold font-sans uppercase tracking-wider text-(--ink)",
            RARITY_METAL_CLASSES[r],
          )}
        >
          <span
            aria-hidden="true"
            class={cn(
              "size-3.5 rounded-full shadow-[inset_0_-1px_2px_var(--deep)] bg-[radial-gradient(circle_at_34%_28%,var(--hi)_0%,transparent_38%),radial-gradient(circle,var(--lt)_0%,var(--md)_55%,var(--dk)_100%)]",
              r === "exotic" && "opal",
            )}
          ></span>
          {RARITY_LABELS[r]}
        </span>
        {#if i < RARITY_ORDER.length - 1}
          <span aria-hidden="true">
            <Icon name="chevron-right" class="text-foreground-darker" />
          </span>
        {/if}
      {/each}
    </div>
  {/snippet}
</FieldDescription>

<style>
  /* Opal ring, same conic stops as the exotic coin edge. */
  .opal {
    border: 1.5px solid transparent;
    background:
      radial-gradient(circle at 34% 28%, var(--hi) 0%, transparent 38%) padding-box,
      radial-gradient(circle, var(--lt) 0%, var(--md) 55%, var(--dk) 100%) padding-box,
      conic-gradient(
        from 20deg,
        oklch(88% 0.09 330),
        oklch(88% 0.09 250),
        oklch(90% 0.09 180),
        oklch(92% 0.09 100),
        oklch(88% 0.09 30),
        oklch(88% 0.09 330)
      ) border-box;
  }
</style>
