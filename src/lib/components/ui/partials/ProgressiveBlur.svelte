<script lang="ts">
  import { cn } from "tailwind-variants";

  let {
    direction = "up",
    showNoise = true,
    maxBlur = 20,
    class: className = "",
  }: {
    direction?: "up" | "down";
    showNoise?: boolean;
    /** Radius of the strongest layer, px. The ramp below scales to it. */
    maxBlur?: number;
    class?: string;
  } = $props();

  const isUp = $derived(direction === "up");
  const edgeMask = $derived(
    `linear-gradient(${isUp ? "to bottom" : "to top"}, black 30%, transparent 100%)`
  );

  // Hand-tuned ramp — near-doubling, easing off at the top. Scaled to `maxBlur`
  // rather than listed in px so a caller can only change the strength, never
  // the curve.
  const BLUR_RAMP = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 20];
  const RAMP_TOP = BLUR_RAMP[BLUR_RAMP.length - 1];

  const blurProgression = $derived(
    BLUR_RAMP.map((step) => `${(step * maxBlur) / RAMP_TOP}px`)
  );

  function getBlurLayer(level: number, totalLayers: number, up: boolean) {
    const dir = up ? "to top" : "to bottom";
    const slice = 100 / totalLayers;
    const start = level * slice;
    const mid1 = (level + 1) * slice;
    const mid2 = (level + 2) * slice;
    const end = (level + 3) * slice;
    const mask = `linear-gradient(${dir}, transparent ${start}%, black ${mid1}%, black ${mid2}%, transparent ${end}%)`;
    return { mask, blur: blurProgression[level] };
  }

  const blurLayers = $derived(
    blurProgression.map((_, i) => getBlurLayer(i, blurProgression.length, isUp))
  );
</script>

<div
  class={cn("pointer-events-none absolute inset-0 isolate overflow-hidden", className)}
  aria-hidden="true"
>
  <div class="bg-background/10 absolute inset-0" style={`mask-image: ${edgeMask};`}></div>
  {#each blurLayers as layer, idx}
    <div
      class="absolute inset-0"
      style={`mask-image: ${layer.mask}; z-index: ${idx + 1}; backdrop-filter: blur(${layer.blur});`}
    ></div>
  {/each}
  {#if showNoise}
    <div class="bg-noise-10 absolute inset-0 z-[9] opacity-50" style={`mask-image: ${edgeMask};`}></div>
  {/if}
</div>
