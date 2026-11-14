<script lang="ts">
  import { onMount } from "svelte";
  import { showSky, skyKeyAt, skyLab } from "@/lib/sky-colours-lab.svelte";

  onMount(() => {
    // What the clock shows now: a phase, or a time of day made in the sky controls.
    const shown = () => skyLab.showing ?? document.documentElement.dataset.skyPhase;

    // Apply client phase immediately to override SSR value
    showSky(skyKeyAt(new Date().getHours()));

    const interval = setInterval(() => {
      const key = skyKeyAt(new Date().getHours());
      if (key !== shown()) showSky(key);
    }, 30000);

    return () => clearInterval(interval);
  });
</script>
