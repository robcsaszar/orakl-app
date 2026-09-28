<script lang="ts">
import { RARITY_CHIP_CLASSES, RARITY_LABELS, RARITY_ORDER } from "@orakl/shared";
  
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
            "rounded-2xl corner-shape-squircle border-2 px-2 py-0.5 text-xs font-bold font-sans uppercase tracking-wider",
            RARITY_CHIP_CLASSES[r],
          )}
        >
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
