<script lang="ts">
import { BADGES, RARITY_LABELS } from "@orakl/shared";
import { RARITY_CHIP_CLASSES } from "$lib/rarity-classes";
import type { BadgeId, Rarity } from "@orakl/shared";
  import Icon from "$lib/components/ui/Icon.svelte";
  
  import { cn } from "tailwind-variants";

  let {
    id,
    detail,
    count,
    rarity = "common",
  }: {
    id: BadgeId;
    /** Per-run detail line (results screen). */
    detail?: string;
    /** Times earned across runs (trials tally). Shown as "×N" when > 1. */
    count?: number;
    /** Rarity tier reached — drives the chip colour and tier label. */
    rarity?: Rarity;
  } = $props();

  const meta = $derived(BADGES[id]);

  // Native tooltip names the tier + what the badge is + this run's detail. The
  // visible legend explains *why* the tier rises; this names it on hover.
  const tip = $derived(
    [`${meta.label} · ${RARITY_LABELS[rarity]}`, meta.description, detail]
      .filter(Boolean)
      .join(" — "),
  );
</script>

<span
  class={cn(
    "flex flex-col items-baseline gap-2 rounded-2xl corner-shape-squircle border-2 px-3 py-1.5",
    RARITY_CHIP_CLASSES[rarity],
  )}
  title={tip}
>
  <div class="flex gap-2 items-center">
    <Icon name={meta.icon} class="shrink-0" />
    <span class="font-bold">{meta.label}</span>
  </div>
  {#if count !== undefined && count > 1}
    <span class="font-mono text-sm tabular-nums opacity-80">×{count}</span>
  {/if}
  {#if detail}
    <span class="text-xs font-sans opacity-70">{detail}</span>
  {/if}
</span>
