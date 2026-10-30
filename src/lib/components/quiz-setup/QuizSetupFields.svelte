<script lang="ts">
  import type { Snippet } from "svelte";
  import type { SeasonOption } from "@orakl/protocol";
  import CategorySelector from "$lib/components/quiz-setup/CategorySelector.svelte";
  import DifficultySelector from "$lib/components/quiz-setup/DifficultySelector.svelte";
  import FieldDescription from "$lib/components/ui/partials/FieldDescription.svelte";
  import CheckboxOption from "$lib/components/ui/CheckboxOption.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
  import { formatDateShort } from "@/lib/format.js";
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
    seasons = [],
    selectedCategories = $bindable<string[]>([]),
    selectedSeasons = $bindable<string[]>([]),
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
    /** Seasons offered above the categories; the group is hidden when empty. */
    seasons?: SeasonOption[];
    selectedCategories: string[];
    selectedSeasons?: string[];
    difficulty: DifficultyFilter;
    timer: TimerDuration;
    questionsPerRound: QuestionsPerRound;
    categoriesError?: boolean;
    showQuestionsPerRound?: boolean;
    beforeQuestionsPerRound?: Snippet;
    modeFields?: Snippet;
    /** Guest entitlement caps/locks (omit for unrestricted users). `maxCategories` caps Seasons and categories together. */
    maxCategories?: number;
    lockedDifficulties?: readonly DifficultyFilter[];
    lockedQuestionCounts?: readonly QuestionsPerRound[];
    onLocked?: () => void;
  } = $props();

  // At the cap, unselected Seasons lock (picks can still be swapped).
  const seasonsAtCap = $derived(
    maxCategories != null &&
      selectedSeasons.length + selectedCategories.length >= maxCategories,
  );

  function setSeason(id: string, on: boolean) {
    selectedSeasons = on
      ? [...selectedSeasons, id]
      : selectedSeasons.filter((x) => x !== id);
  }

  // `opensOn` is a calendar day (YYYY-MM-DD); build it in local time so the
  // day does not shift with the viewer's offset.
  function openingDay(opensOn: string): string {
    const [y, m, d] = opensOn.split("-").map(Number);
    return formatDateShort(new Date(y, m - 1, d));
  }
</script>

{#if maxCategories != null}
  <p class="text-sm text-foreground-darker">
    Pick up to {maxCategories} seasons or categories in total. Sign in to pick more.
  </p>
{/if}

{#if seasons.length > 0}
  <!-- Seasons -->
  <div
    role="group"
    aria-labelledby="seasons-legend"
    aria-describedby="seasons-description"
    class="flex flex-col gap-4 w-full"
  >
    <legend class="text-xl" id="seasons-legend">Seasons</legend>
    <div class="relative -mx-2">
    <div class="gap-4 p-2 bg-secondary/5 rounded-3xl border-2 border-transparent corner-shape-squircle isolate grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1">
      {#each seasons as season (season.id)}
        {@const picked = selectedSeasons.includes(season.id)}
        {@const locked = season.locked || (seasonsAtCap && !picked)}
        <CheckboxOption
          variant="tile"
          {locked}
          id={`season-${season.id}`}
          name="seasons"
          value={season.id}
          checked={picked}
          disabled={locked && !season.locked}
          readonlyLocked={season.locked}
          describedBy="seasons-description"
          onchange={(e) => setSeason(season.id, e.currentTarget.checked)}
        >
          <span class="flex items-start gap-4 flex-1 z-10">
            {#if season.color}
              <span
                class="w-1 self-stretch rounded-full shrink-0"
                style:background-color={season.color}
                aria-hidden="true"
              ></span>
            {/if}
            <span class="flex flex-col gap-1 flex-1">
              <span class="text-foreground">{season.name}</span>
              <span class="font-sans text-sm text-current">
                {#if season.locked && season.opensOn}
                  Opens {openingDay(season.opensOn)}
                {:else}
                  {season.count} {season.count === 1 ? "question" : "questions"}
                {/if}
              </span>
            </span>
            <span class="inline-flex items-center justify-center {locked ? 'opacity-70' : 'opacity-10 group-hover:opacity-30 group-has-checked:opacity-100'}">
              {#if season.icon}
                <img src={season.icon} alt="" class="size-5" />
              {:else}
                <Icon name={locked ? "lock" : "scroll"} class="size-5" />
              {/if}
            </span>
          </span>
        </CheckboxOption>
      {/each}
    </div>
    </div>
    <FieldDescription description="Limited-time sets of questions. Locked seasons are out of season or past your pick limit." id="seasons-description" />
  </div>
{/if}

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
    maxSelected={maxCategories == null ? undefined : maxCategories - selectedSeasons.length}
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
