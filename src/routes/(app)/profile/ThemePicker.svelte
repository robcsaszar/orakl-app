<script lang="ts">
import { PHASE_COLORS, PHASE_TIMES, SKY_PHASES, THEME_LABELS, getSkyPhase } from "@orakl/shared";
import type { SkyPhase, ThemeMode } from "@orakl/shared";

import { applyTheme } from "$lib/theme-helpers.js";
import { toast } from "$lib/toast.js";
import SegmentedPicker from "$lib/components/ui/SegmentedPicker.svelte";

interface Props {
  currentMode: ThemeMode;
}

let { currentMode }: Props = $props();

const skyPhases = SKY_PHASES;
const phaseColors = PHASE_COLORS;
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
        {@const [top, bot] = phaseColors[phase]}
        <span
          class="flex h-10 w-full rounded-lg corner-shape-squircle border-2 border-background"
          style="background: linear-gradient(to bottom, {top}, {bot})"
          aria-hidden="true"
        ></span>
        <span>{phaseLabels[phase]}</span>
        <span class="text-foreground-darker font-sans text-sm group-aria-checked:text-background">
          {phaseTimes[phase]}
        </span>
      {/snippet}
    </SegmentedPicker>
  </div>
</div>
