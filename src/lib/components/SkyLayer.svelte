<!--
  Every sky module behind one dynamic-import boundary (map #859, decision 5).
  `+layout.svelte` imports this only inside `if (__FEATURE_SKY__)`, so with the
  build flag off the whole chunk — Background, Birds, DynamicBackground and
  clouds.png — is dropped from the bundle.
-->
<script lang="ts">
import type { SkyPhase } from "@orakl/shared";
  import Background from "$lib/components/Background.svelte";
  import Birds from "$lib/components/Birds.svelte";
  import DynamicBackground from "$lib/components/DynamicBackground.svelte";

  let { phase, dynamic }: { phase: SkyPhase; dynamic: boolean } = $props();
</script>

<Background timeOfDay={phase} windSpeed={0.5} cloudOpacity={0.5} />
<Birds timeOfDay={phase} flockSize={48} wanderers={5} transiting={4} />
{#if dynamic}
  <DynamicBackground />
{/if}
