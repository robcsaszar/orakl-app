<script lang="ts">
  import { GAME } from "data/game.settings.js";
  import type { DifficultyFilter } from "data/game.settings.js";
  import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
  import Icon from '@/lib/components/ui/Icon.svelte';
  import { cn } from 'tailwind-variants';

  let {
    value = $bindable<DifficultyFilter>("all"),
    name = "difficulty",
    description,
    lockedOptions,
    onLocked,
  }: {
    value?: DifficultyFilter;
    name?: string;
    description?: string;
    lockedOptions?: readonly DifficultyFilter[];
    onLocked?: (option: DifficultyFilter) => void;
  } = $props();

  const flameCount: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

  //TODO: AB test between showing 3 stars with opacity vs showing only the number of stars for the difficulty
</script>

<RadioGroup
  options={GAME.roundConfig.difficultyOptions}
  bind:selected={value!}
  {name}
  legend="Difficulty"
  {description}
  {lockedOptions}
  {onLocked}
>
  {#snippet optionLabel(d)}
    {#if d === "all"}
      <span aria-hidden="true"><Icon name="shuffle" /></span>
    {:else}
    <!-- Show a star per difficulty level -->
      <span aria-hidden="true" class="flex gap-0.5">
        {#each Array(flameCount[d]) as _}
          <Icon name="difficulty" />
        {/each}
      </span>

      <!-- Three stars every time but opacity changes based on difficulty -->
      <!-- <span aria-hidden="true" class="flex gap-0.5">
        {#each Array(3) as _, i}
          <Icon name="difficulty" class={cn(i < flameCount[d] ? "opacity-100" : "opacity-20")} />
        {/each}
      </span> -->
    {/if}
    <span class="sr-only">
      {d === "all" ? "All difficulties" : d.charAt(0).toUpperCase() + d.slice(1)}
    </span>
  {/snippet}
</RadioGroup>
