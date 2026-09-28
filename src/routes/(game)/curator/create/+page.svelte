<script lang="ts">
  import CreateQuiz from "./CreateQuiz.svelte";
  import type { PageData } from "./$types";
  import PastDueBanner from "$lib/components/billing/PastDueBanner.svelte";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Host quiz — Orakl</title>
</svelte:head>

{#if data.subscription?.status === "past_due"}
  <PastDueBanner />
{/if}

<CreateQuiz
  categories={data.categories}
  categoryColors={data.categoryColors}
  presets={data.presets}
  presetLimit={data.presetLimit}
  scoringModes={data.uiFlags.QUIZ_SCORING_MODES === true}
  accessModes={data.uiFlags.QUIZ_ACCESS_MODES === true}
  maxPlayers={data.uiFlags.QUIZ_MAX_PLAYERS === true}
  quizPresets={data.uiFlags.QUIZ_PRESETS === true}
/>
