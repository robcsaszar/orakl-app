<script lang="ts">
  import type { Snippet } from "svelte";
  import CategorySelector from "$lib/components/quiz-setup/CategorySelector.svelte";
  import DifficultySelector from "$lib/components/quiz-setup/DifficultySelector.svelte";
  import FieldDescription from "$lib/components/ui/partials/FieldDescription.svelte";
  import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
  import { GAME } from "data/game.settings.js";
  import type { DifficultyFilter, TimerDuration, QuestionsPerRound } from "data/game.settings.js";

  type CategoryData = {
    id: string;
    name: string;
    icon: string | null;
    count: number;
    color?: string;
  };

  let {
    categories = [],
    selectedCategories = $bindable<string[]>([]),
    difficulty = $bindable<DifficultyFilter>("all"),
    timer = $bindable<TimerDuration>(30),
    questionsPerRound = $bindable<QuestionsPerRound>(10),
    categoriesError = false,
    showQuestionsPerRound = true,
    beforeQuestionsPerRound,
    modeFields,
    maxCategories,
    lockedDifficulties,
    lockedQuestionCounts,
    onLocked,
  }: {
    categories: CategoryData[];
    selectedCategories: string[];
    difficulty: DifficultyFilter;
    timer: TimerDuration;
    questionsPerRound: QuestionsPerRound;
    categoriesError?: boolean;
    showQuestionsPerRound?: boolean;
    beforeQuestionsPerRound?: Snippet;
    modeFields?: Snippet;
    /** Guest entitlement caps/locks (omit for unrestricted users). */
    maxCategories?: number;
    lockedDifficulties?: readonly DifficultyFilter[];
    lockedQuestionCounts?: readonly QuestionsPerRound[];
    onLocked?: () => void;
  } = $props();
</script>

<!-- Categories -->
<div
  role="group"
  aria-labelledby="categories-legend"
  aria-describedby="categories-description"
  class="flex flex-col gap-4 w-full group"
  class:border-red-500={categoriesError}
>
  <legend class="text-xl" id="categories-legend">Categories</legend>
  <CategorySelector
    bind:selected={selectedCategories}
    {categories}
    descriptionId="categories-description"
    maxSelected={maxCategories}
  />
  <FieldDescription description="Choose which categories to include in this trial." id="categories-description" />
</div>

<!-- Difficulty -->
<DifficultySelector
  bind:value={difficulty}
  name="difficulty"
  description="Leave difficulty to chance, or control your fate."
  lockedOptions={lockedDifficulties}
  {onLocked}
/>

<!-- Timer -->
<RadioGroup
  options={GAME.roundConfig.timerOptions}
  bind:selected={timer}
  name="timer"
  legend="Answer time"
  description="Choose how long until time runs out for each question."
>
  {#snippet optionLabel(seconds)}
    <span class="font-mono" aria-hidden="true">{seconds}s</span>
    <span class="sr-only">{seconds} seconds</span>
  {/snippet}
</RadioGroup>

<!-- Optional slot before questions (e.g. play-mode selector that controls visibility) -->
{#if beforeQuestionsPerRound}
  {@render beforeQuestionsPerRound()}
{/if}

<!-- Questions per round -->
{#if showQuestionsPerRound}
  <RadioGroup
    options={GAME.roundConfig.questionCounts}
    bind:selected={questionsPerRound}
    name="questionsPerRound"
    legend="Questions"
    description="Choose how many questions per round."
    lockedOptions={lockedQuestionCounts}
    {onLocked}
  >
    {#snippet optionLabel(count)}
      <span class="font-mono" aria-hidden="true">{count}</span>
      <span class="sr-only">{count} questions</span>
    {/snippet}
  </RadioGroup>
{/if}

<!-- Mode-specific fields (after shared fields) -->
{#if modeFields}
  {@render modeFields()}
{/if}
