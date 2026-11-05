<!--
  Every sky module behind one dynamic-import boundary (map #859, decision 5).
  `+layout.svelte` imports this only inside `if (__FEATURE_SKY__)`, so with the
  build flag off the whole chunk — Background, DynamicBackground and
  clouds.png — is dropped from the bundle. Birds sit behind `__FEATURE_BIRDS__`
  as well.
-->
<script lang="ts">
import type { SkyPhase } from "@orakl/shared";
  import Background from "$lib/components/Background.svelte";
  import DynamicBackground from "$lib/components/DynamicBackground.svelte";
  import { daySeed } from "@/lib/birds/seed";
  import { windFor } from "@/lib/sky-wind";

  let { phase, dynamic }: { phase: SkyPhase; dynamic: boolean } = $props();

  // One wind for clouds and birds alike, the day's, per phase.
  const wind = $derived(windFor(daySeed(new Date()), phase).x);

  // The flocks sit behind their own build flag, inside the sky's: with
  // BIRDS off the engine, worker and sprites never enter the bundle.
  const birds = __FEATURE_BIRDS__ ? import("$lib/components/Birds.svelte") : null;
</script>

<Background timeOfDay={phase} {wind} cloudOpacity={0.5} />
{#if birds}
  {#await birds then { default: Birds }}
    <Birds timeOfDay={phase} />
  {:catch}
    <!-- the sky stays up without its birds -->
  {/await}
{/if}
{#if dynamic}
  <DynamicBackground />
{/if}
