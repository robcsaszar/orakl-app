<script lang="ts">
import { PHASE_CONFIG, SKY_SCHEDULE } from "@orakl/shared";
import type { SkyPhase } from "@orakl/shared";
  import { onMount } from "svelte";

  onMount(() => {
    function getSkyPhase(hour: number): SkyPhase {
      for (const phase in SKY_SCHEDULE) {
        const [start, end] = (SKY_SCHEDULE as Record<string, [number, number]>)[phase];
        if (start > end) {
          if (hour >= start || hour < end) return phase as SkyPhase;
        } else {
          if (hour >= start && hour < end) return phase as SkyPhase;
        }
      }
      return "night";
    }

    function applyPhase(newPhase: SkyPhase) {
      document.documentElement.dataset.skyPhase = newPhase;
      document.documentElement.dataset.effectiveTheme = PHASE_CONFIG[newPhase].starOpacity > 0 ? "dark" : "light";
    }

    // Apply client phase immediately to override SSR value
    applyPhase(getSkyPhase(new Date().getHours()));

    const interval = setInterval(() => {
      const newPhase = getSkyPhase(new Date().getHours());
      if (newPhase !== document.documentElement.dataset.skyPhase) {
        applyPhase(newPhase);
      }
    }, 30000);

    return () => clearInterval(interval);
  });
</script>
