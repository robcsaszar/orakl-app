<script lang="ts">
  import CastButton from "$lib/components/quiz/CastButton.svelte";
  import ProgressBar from "$lib/components/quiz/ProgressBar.svelte";
  import QuestionBadges from "$lib/components/quiz/QuestionBadges.svelte";
  import IdentityPill from "$lib/components/quiz/IdentityPill.svelte";

  export interface QuestionHeaderData {
    counter?: string;
    difficulty?: string;
    categoryLabel?: string;
    castButton?: boolean;
    avatarSrc?: string;
    nickname?: string;
    score?: number;
    progress?: number;
    mode?: string;
    strikes?: number;
    /** Points just earned this round — drives the delta cue + step-up count
     *  instead of an instant jump (IdentityPill). */
    lastPointsEarned?: number;
    /** Prototype toggle (mimic mode) for the IdentityPill layout. */
    pillVariant?: 1 | 2 | 3;
  }

  interface Props {
    data: QuestionHeaderData;
    showIdentity?: boolean;
  }

  let { data, showIdentity = true }: Props = $props();

  const hasIdentity = $derived(showIdentity && !!(data.avatarSrc || data.nickname || data.score !== undefined));
</script>

{#if hasIdentity}
  <!-- Rich layout: optional progress bar + identity pill + badges -->
  <div class="flex flex-col gap-8">
    <IdentityPill
      avatarSrc={data.avatarSrc}
      nickname={data.nickname}
      score={data.score}
      mode={data.mode}
      strikes={data.strikes}
      lastPointsEarned={data.lastPointsEarned}
      variant={data.pillVariant}
    />

    <!-- Badges -->
    <div class="flex flex-col gap-4">
      <QuestionBadges difficulty={data.difficulty} categoryLabel={data.categoryLabel} />
      {#if data.progress !== undefined}
        <ProgressBar class="self-stretch" progress={data.progress} label={data.counter} />
      {/if}
    </div>
  </div>
{:else}
  <!-- Generic layout: counter + badges (curator / display / multiplayer) -->
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      {#if data.counter}
        <span class="font-mono text-sm font-medium text-gray-500">{data.counter}</span>
      {/if}
      <div class="flex items-center gap-2 ml-auto">
        <QuestionBadges difficulty={data.difficulty} categoryLabel={data.categoryLabel} />
        {#if data.castButton}
          <CastButton size="sm" />
        {/if}
      </div>
    </div>
    {#if data.progress !== undefined}
      <ProgressBar class="self-stretch" progress={data.progress} label={data.counter} />
    {/if}
  </div>
{/if}
