<script lang="ts">
import { BADGES, RARITY_LABELS } from "@orakl/shared";
import { RARITY_METAL_CLASSES } from "$lib/rarity-classes";
import type { BadgeId, Rarity } from "@orakl/shared";
  import Icon from "$lib/components/ui/Icon.svelte";

  let {
    id,
    detail,
    count,
    rarity = "common",
    form = "compact",
  }: {
    id: BadgeId;
    /** Per-run detail line (results screen). Compact form shows it in the tooltip. */
    detail?: string;
    /** Times earned across runs (trials tally). Extended form shows "×N" when > 1. */
    count?: number;
    /** Rarity tier reached — picks the metal of the obol. */
    rarity?: Rarity;
    /** Compact: coin + name, tooltip on focus. Extended: adds tier, description and count. */
    form?: "compact" | "extended";
  } = $props();

  const meta = $derived(BADGES[id]);

  // Compact form: the global tooltip names the tier, what the badge is and this
  // run's detail.
  const tip = $derived(
    [`${meta.label} · ${RARITY_LABELS[rarity]}`, meta.description, detail]
      .filter(Boolean)
      .join(" · "),
  );
</script>

<!-- Focusable so the global tooltip opens on keyboard focus and tap. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<span
  class="obol {form} {RARITY_METAL_CLASSES[rarity]}"
  class:exotic={rarity === "exotic"}
  role={form === "compact" ? "img" : undefined}
  aria-label={form === "compact" ? tip : undefined}
  tabindex={form === "compact" ? 0 : undefined}
  data-tooltip={form === "compact" ? tip : undefined}
>
  <span class="emblem" aria-hidden="true">
    <span class="glyph"><Icon name={meta.icon} class="size-full" /></span>
    {#if rarity === "exotic"}<span class="sheen"></span>{/if}
  </span>
  {#if form === "extended" && count !== undefined && count > 1}
    <span class="tally">×{count}</span>
  {/if}
  <span class="text">
    {#if form === "extended"}
      <span class="tier">{RARITY_LABELS[rarity]}</span>
    {/if}
    <span class="name">{meta.label}</span>
    {#if form === "extended"}
      <span class="desc">{meta.description}</span>
    {/if}
  </span>
</span>

<style>
  .obol {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    --size: 2.25rem;
    --glyph: var(--dk);
  }
  .obol.compact {
    min-height: 2.75rem;
  }
  .obol:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
    border-radius: 999px;
  }
  .metal-bronze,
  .metal-silver {
    --glyph: var(--deep);
  }
  .obol.extended {
    --size: 4rem;
    align-items: flex-start;
    gap: 0.875rem;
    width: 100%;
  }
  .emblem {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    overflow: hidden;
    background:
      radial-gradient(circle at 34% 28%, var(--hi) 0%, transparent 38%),
      radial-gradient(circle at 50% 50%, var(--lt) 0%, var(--md) 55%, var(--dk) 100%);
    box-shadow:
      inset 0 1px 1px var(--hi),
      inset 0 -2px 3px var(--deep),
      0 2px 3px oklch(0% 0 0 / 0.5),
      0 6px 14px -6px oklch(0% 0 0 / 0.6);
  }
  /* reeded edge */
  .emblem::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: repeating-conic-gradient(var(--dk) 0 3deg, var(--lt) 3deg 6deg);
    -webkit-mask: radial-gradient(circle, transparent 62%, #000 63%);
    mask: radial-gradient(circle, transparent 62%, #000 63%);
    opacity: 0.55;
  }
  .compact .emblem::before {
    background: repeating-conic-gradient(var(--dk) 0 6deg, var(--lt) 6deg 12deg);
  }
  /* raised inner rim */
  .emblem::after {
    content: "";
    position: absolute;
    inset: 14%;
    border-radius: 50%;
    box-shadow:
      inset 0 1px 0 var(--deep),
      0 1px 0 var(--hi);
  }
  .glyph {
    display: block;
    width: 52%;
    height: 52%;
    color: var(--glyph);
    filter: drop-shadow(0 1px 0 var(--hi)) drop-shadow(0 -0.5px 0 var(--deep));
    z-index: 1;
  }
  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .name {
    font-family: var(--albertus-nova);
    font-weight: 700;
    line-height: 1.15;
    color: var(--color-foreground);
    text-wrap: balance;
  }
  .extended .name {
    font-size: 1.125rem;
  }
  .extended .text {
    padding-top: 0.25rem;
  }
  .tier {
    font-family: var(--geist);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink);
    margin-bottom: 0.125rem;
  }
  .desc {
    font-family: var(--geist);
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--color-foreground-darker);
    margin-top: 0.25rem;
    text-wrap: pretty;
  }
  .tally {
    position: absolute;
    left: calc(var(--size) - 0.875rem);
    top: calc(var(--size) - 1rem);
    font-family: var(--geist-mono);
    font-size: 0.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    padding: 0.0625rem 0.3125rem;
    border-radius: 999px;
    color: var(--deep);
    background: linear-gradient(180deg, var(--hi), var(--lt));
    box-shadow:
      0 0 0 1.5px var(--color-background),
      inset 0 -1px 0 var(--dk);
    z-index: 4;
  }

  /* Exotic: opal inlay on the reeded edge tells platinum apart from silver. */
  .exotic .emblem::before {
    background: conic-gradient(
      from 20deg,
      oklch(88% 0.09 330),
      oklch(88% 0.09 250),
      oklch(90% 0.09 180),
      oklch(92% 0.09 100),
      oklch(88% 0.09 30),
      oklch(88% 0.09 330)
    );
    opacity: 0.9;
  }

  /* Exotic: a slow light sweep. Translates a wide overlay clipped by the emblem. */
  .sheen {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -100%;
    width: 300%;
    z-index: 3;
    pointer-events: none;
    background: linear-gradient(115deg, transparent 40%, oklch(100% 0 0 / 0.55) 50%, transparent 60%);
    mix-blend-mode: soft-light;
    transform: translateX(30%);
  }
  @media (prefers-reduced-motion: no-preference) {
    .sheen {
      animation: sweep 5s cubic-bezier(0.23, 1, 0.32, 1) infinite;
    }
  }
  @keyframes sweep {
    0% {
      transform: translateX(30%);
    }
    40%,
    100% {
      transform: translateX(-30%);
    }
  }
</style>
