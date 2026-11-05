<script lang="ts">
import { PHASE_TIMES, SKY_PHASES, THEME_LABELS, getSkyPhase } from "@orakl/shared";
import type { SkyPhase, ThemeMode } from "@orakl/shared";

import { applyTheme } from "$lib/theme-helpers.js";
import { toast } from "$lib/toast.js";
import SegmentedPicker from "$lib/components/ui/SegmentedPicker.svelte";
import { PHASE_STOPS } from "$lib/constants/phase-stops.constants.js";

interface Props {
  currentMode: ThemeMode;
}

let { currentMode }: Props = $props();

const skyPhases = SKY_PHASES;
const phaseLabels = THEME_LABELS;
const phaseTimes = PHASE_TIMES;

const hour = new Date().getHours();
const phase = getSkyPhase(hour);
const hh = String(hour).padStart(2, "0");
const coreModes: { mode: ThemeMode; desc: string }[] = [
  { mode: "system", desc: "Device preference" },
  { mode: "dark", desc: "Starry night sky" },
  { mode: "light", desc: "Bright morning sky" },
  { mode: "dynamic", desc: `Now ${hh}:00 · ${THEME_LABELS[phase]}` },
];

/** Swatch box, in viewBox units (32:35). */
const SWATCH_W = 64;
const SWATCH_H = 70;

/**
 * What each phase's swatch shows over its sky gradient: the sun (with halo) or
 * the crescent moon at `body`, and `stars` as [x, y, r]. Positions are in
 * swatch viewBox units; a y past SWATCH_H leaves the sun half set.
 */
const SWATCH_SCENE: Record<
  SkyPhase,
  { body: { kind: "sun" | "moon"; x: number; y: number }; stars: [number, number, number][] }
> = {
  night: {
    body: { kind: "moon", x: 25, y: 29 },
    stars: [[11.5, 19, 0.7], [42, 13, 0.8], [55, 37, 0.7], [24, 45.5, 0.6]],
  },
  dawn: { body: { kind: "sun", x: 32, y: 73.5 }, stars: [[13.8, 16, 0.6]] },
  morning: { body: { kind: "sun", x: 32, y: 54 }, stars: [] },
  noon: { body: { kind: "sun", x: 32, y: 16 }, stars: [] },
  evening: { body: { kind: "sun", x: 32, y: 45.5 }, stars: [] },
  sunset: { body: { kind: "sun", x: 32, y: 73.5 }, stars: [] },
  dusk: {
    body: { kind: "moon", x: 37.5, y: 34 },
    stars: [[46, 17.5, 0.7], [18, 27, 0.5]],
  },
};

let activeMode: ThemeMode = $state("system");

$effect(() => {
  activeMode = currentMode;
});

async function selectTheme(mode: ThemeMode) {
  activeMode = mode;
  const toastId = toast.loading("Applying\u2026");
  try {
    await applyTheme(mode);
    toast.success("Theme updated.", { id: toastId });
  } catch {
    toast.error("Failed to update theme.", { id: toastId });
  }
}
</script>

<div class="flex flex-col gap-4" id="theme-picker">
  <!-- Core modes -->
  <SegmentedPicker
    label="Theme"
    options={coreModes}
    optionKey={(m) => m.mode}
    selectedKey={activeMode}
    onSelect={(m) => selectTheme(m.mode)}
    class="grid grid-cols-2 gap-2 sm:grid-cols-4"
  >
    {#snippet option({ mode, desc })}
      <span class="font-bold text-current">{phaseLabels[mode]}</span>
      <span class="text-foreground-darker leading-tight font-sans text-sm group-aria-checked:text-background">{desc}</span>
    {/snippet}
  </SegmentedPicker>

  <!-- Time-of-day override section -->
  <div class="flex flex-col gap-2">
    <p class="font-bold">Fixed time of day</p>
    <SegmentedPicker label="Fixed time of day" options={skyPhases} selectedKey={activeMode} onSelect={selectTheme}>
      {#snippet option(phase)}
        {@const stops = PHASE_STOPS[phase]}
        {@const scene = SWATCH_SCENE[phase]}
        <span
          class="relative flex w-16 aspect-[32/35] overflow-hidden rounded-lg corner-shape-squircle border-2 border-background"
          aria-hidden="true"
        >
          <svg viewBox="0 0 {SWATCH_W} {SWATCH_H}" class="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="swatch-sky-{phase}" x1="0" y1="0" x2="0" y2="1">
                {#each stops.colors as color, i}
                  <stop offset="{stops.offsets[i]}%" stop-color={color} />
                {/each}
              </linearGradient>
              <mask id="swatch-moon-{phase}" maskUnits="userSpaceOnUse" x="-6" y="-6" width="12" height="12">
                <circle r="5" fill="white" />
                <circle cx="2.4" cy="-1.8" r="4.2" fill="black" />
              </mask>
            </defs>
            <rect width={SWATCH_W} height={SWATCH_H} fill="url(#swatch-sky-{phase})" />
            {#each scene.stars as [x, y, r]}
              <circle cx={x} cy={y} {r} fill="white" opacity="0.9" />
            {/each}
            <g transform="translate({scene.body.x} {scene.body.y})">
              {#if scene.body.kind === "sun"}
                <circle r="13" fill="white" opacity="0.2" />
                <circle r="7" fill="#f7f3e3" />
              {:else}
                <circle r="5" fill="#e0dfea" mask="url(#swatch-moon-{phase})" />
              {/if}
            </g>
          </svg>
        </span>
        <span>{phaseLabels[phase]}</span>
        <span class="text-foreground-darker font-sans text-sm group-aria-checked:text-background">
          {phaseTimes[phase]}
        </span>
      {/snippet}
    </SegmentedPicker>
  </div>
</div>
