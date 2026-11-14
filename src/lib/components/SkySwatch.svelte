<!--
  A small picture of one sky phase: its gradient, and over it the swatch's
  items back to front (sun, moon, sparkle, stars, clouds, shooting stars,
  birds). Size it with `class` (a width; the box keeps its 32:35 shape).
-->
<script lang="ts">
  import type { SkyPhase } from "@orakl/shared";
  import { cn } from "tailwind-variants";
  import { mulberry32 } from "$lib/birds/rng.js";
  import { SCENE_H, SCENE_W, skySwatch } from "$lib/sky-colours-lab.svelte.js";

  let { phase, class: className = "w-16" }: { /** A sky phase, or the id of a time of day made in the sky controls. */ phase: SkyPhase | (string & {}); class?: string } = $props();

  // Unique per instance: the same phase can be on the page twice.
  const uid = $props.id();

  const stops = $derived(skySwatch(phase).stops);
  const scene = $derived(skySwatch(phase).scene);

  /** A small cloud's puffs from its seed: a flat base and a few bumps along it, as [cx, cy, rx, ry]. */
  function puffs(seed: number): [number, number, number, number][] {
    const rng = mulberry32(seed);
    const list: [number, number, number, number][] = [[0, 1.4, 6.5, 2]];
    const bumps = 3 + Math.floor(rng.next() * 2);
    for (let i = 0; i < bumps; i++) {
      const at = (i + 0.5) / bumps;
      const r = 1.8 + rng.next() * 1.6;
      list.push([-5 + at * 10 + (rng.next() - 0.5), 0.6 - r * 0.45, r * 1.15, r]);
    }
    return list;
  }
</script>

<span
  class={cn("relative flex aspect-[32/35] overflow-hidden rounded-lg corner-shape-squircle border-2 border-background", className)}
  aria-hidden="true"
>
  <svg viewBox="0 0 {SCENE_W} {SCENE_H}" class="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="{uid}-sky" x1="0" y1="0" x2="0" y2="1">
        {#each stops.colors as color, i}
          <stop offset="{stops.offsets[i]}%" stop-color={color} />
        {/each}
      </linearGradient>
      <mask id="{uid}-moon" maskUnits="userSpaceOnUse" x="-6" y="-6" width="12" height="12">
        <circle r="5" fill="white" />
        <circle cx="2.4" cy="-1.8" r="4.2" fill="black" />
      </mask>
      <linearGradient id="{uid}-streak" gradientUnits="userSpaceOnUse" x1="-15" y1="0" x2="0" y2="0">
        <stop offset="0" stop-color="white" stop-opacity="0" />
        <stop offset="1" stop-color="white" stop-opacity="0.95" />
      </linearGradient>
    </defs>
    <rect width={SCENE_W} height={SCENE_H} fill="url(#{uid}-sky)" />
    {#each scene as it}
      <g transform="translate({it.x} {it.y}) rotate({it.turn}) scale({it.size})">
        {#if it.kind === "sun"}
          <circle r="13" fill="white" opacity="0.2" />
          <circle r="7" fill="#f7f3e3" />
        {:else if it.kind === "moon"}
          <circle r="5" fill="#e0dfea" mask="url(#{uid}-moon)" />
        {:else if it.kind === "sparkle"}
          <path d="M0 -4.5 Q0.5 -0.5 4.5 0 Q0.5 0.5 0 4.5 Q-0.5 0.5 -4.5 0 Q-0.5 -0.5 0 -4.5Z" fill="white" opacity="0.95" />
        {:else if it.kind === "star"}
          <circle r="0.7" fill="white" opacity="0.9" />
        {:else if it.kind === "cloud"}
          <g fill="white" opacity="0.85">
            {#each puffs(it.seed) as [cx, cy, rx, ry]}
              <ellipse {cx} {cy} {rx} {ry} />
            {/each}
          </g>
        {:else if it.kind === "streak"}
          <!-- The end is a hair off level: a gradient has no size on a line that is exactly flat. -->
          <path d="M-15 0 L0 0.01" stroke="url(#{uid}-streak)" stroke-width="0.9" stroke-linecap="round" fill="none" />
          <circle r="0.8" fill="white" />
        {:else if it.kind === "birds"}
          <g fill="none" stroke="#1c2233" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" opacity="0.75">
            <path d="M-5 0 Q-3.5 -1.8 -2.5 0 Q-1.5 -1.8 0 0" />
            <path d="M1.5 2.6 Q2.6 1.3 3.4 2.6 Q4.2 1.3 5.3 2.6" />
          </g>
        {/if}
      </g>
    {/each}
  </svg>
</span>
