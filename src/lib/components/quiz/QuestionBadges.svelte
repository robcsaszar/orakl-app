<script lang="ts">
  import Icon from '@/lib/components/ui/Icon.svelte';
  import Badge from "$lib/components/ui/Badge.svelte";
  import { resolveDifficulty } from "@/lib/answer-variants.js";
  import { cn } from 'tailwind-variants';

  interface Props {
    difficulty?: string;
    categoryLabel?: string;
  }

  let { difficulty, categoryLabel }: Props = $props();

  const flameCount: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
</script>

<div class="flex gap-2 flex-wrap justify-between self-stretch flex-1">
  {#if categoryLabel}
    <Badge variant="category">{categoryLabel}</Badge>
  {/if}
  {#if difficulty}
    {@const variant = resolveDifficulty(difficulty)}
    <Badge variant={variant} class="transition-colors duration-200 ease-ease-in-out-quart">
      <span aria-hidden="true" class="flex gap-0.5">
        {#each Array(3) as _, i}
          <Icon name="difficulty" class={cn(["size-4 transition-opacity duration-200 ease-ease-in-out-quart", i < flameCount[difficulty] ? "opacity-100" : "opacity-30"])} />
        {/each}
      </span>
      <span class="sr-only">{difficulty}</span>
    </Badge>
  {/if}
</div>
