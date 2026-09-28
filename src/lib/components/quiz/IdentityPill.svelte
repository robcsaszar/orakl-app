<script lang="ts">
  import Card from '@/lib/components/ui/Card.svelte';
  import Icon from "@/lib/components/ui/Icon.svelte";
  import { GAME } from "data/game.settings";
  import { cn } from "tailwind-variants";

  interface Props {
    avatarSrc?: string;
    nickname?: string;
    score?: number;
    mode?: string;
    strikes?: number;
    /** Points just earned this round — drives the delta cue and a step-up
     *  count instead of an instant jump. */
    lastPointsEarned?: number;
    /** Prototype toggle (mimic mode): 1 = compact inline, 2 = prev→new
     *  equation, 3 = split total/round segments. Defaults to 1. */
    variant?: 1 | 2 | 3;
  }

  let {
    avatarSrc,
    nickname,
    score,
    mode,
    strikes,
    lastPointsEarned,
    variant = 1,
  }: Props = $props();

  const isEndless = $derived(mode === "endless" && strikes !== undefined);
  const prevScore = $derived(Math.max(0, (score ?? 0) - (lastPointsEarned ?? 0)));
  const fmt = (n: number) => n.toLocaleString();

  // svelte-ignore state_referenced_locally
  let displayScore = $state(Math.max(0, (score ?? 0) - (lastPointsEarned ?? 0)));
  let activeDelta = $state<number | null>(null);
  let stepTimer: ReturnType<typeof setInterval> | undefined;
  let deltaTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const earned = lastPointsEarned ?? 0;
    const target = score ?? 0;
    clearInterval(stepTimer);
    clearTimeout(deltaTimer);
    if (earned <= 0) {
      displayScore = target;
      activeDelta = null;
      return;
    }

    displayScore = prevScore;
    activeDelta = earned;
    deltaTimer = setTimeout(() => {
      activeDelta = null;
    }, 1800);

    const steps = Math.min(earned, 20);
    const stepMs = 600 / steps;
    let step = 0;
    stepTimer = setInterval(() => {
      step++;
      displayScore =
        step >= steps ? target : Math.round(prevScore + (earned * step) / steps);
      if (step >= steps) clearInterval(stepTimer);
    }, stepMs);

    return () => {
      clearInterval(stepTimer);
      clearTimeout(deltaTimer);
    };
  });
</script>

{#snippet avatar()}
  {#if avatarSrc}
    <img
      src={avatarSrc}
      alt="Player avatar"
      class="size-7 shrink-0"
      style="image-rendering: pixelated;"
      loading="eager"
      fetchpriority="high"
      decoding="async"
    />
  {:else if nickname}
    <span
      class="size-7 shrink-0 flex items-center justify-center rounded-full bg-secondary-200 text-sm font-bold text-background select-none"
      aria-hidden="true"
    >
      {nickname[0].toUpperCase()}
    </span>
  {/if}
{/snippet}

{#snippet hearts()}
  {#if isEndless}
    <div class="flex shrink-0 items-center gap-1">
      {#each Array(GAME.endless.lives) as _, i}
        <Icon
          name="heart"
          class={cn(["size-4", i < (strikes ?? 0) ? "text-gray-500" : "text-danger"])}
        />
      {/each}
    </div>
  {/if}
{/snippet}

<Card variant="mezzanine" padding="sm">
  <div class="flex items-center gap-2.5 min-w-0">
    {@render avatar()}
    {#if nickname}
      <span class="min-w-0 flex-1 truncate text-sm">{nickname}</span>
    {/if}

    {#if variant === 2}
      <div
        class="flex shrink-0 items-center gap-1.5 font-mono tabular-nums"
        aria-label="Score: {fmt(displayScore)}"
      >
        {#if activeDelta !== null}
          <span class="text-sm text-foreground-darker/50">{fmt(prevScore)}</span>
          <Icon name="chevron-right" class="size-3 text-foreground-darker/40" />
        {/if}
        <span class="flex items-center gap-1 text-primary">
          <Icon name="rhombus" class="size-3" />
          <span class="text-lg font-bold">{fmt(displayScore)}</span>
        </span>
        {#if activeDelta !== null}
          <span class="text-sm font-bold text-success-light">+{fmt(activeDelta)}</span>
        {/if}
      </div>
    {:else if variant === 3}
      <div
        class="flex shrink-0 items-center gap-2"
        aria-label="Score: {fmt(displayScore)}"
      >
        <div class="flex items-baseline gap-1 text-primary">
          <span class="text-[10px] font-medium uppercase tracking-wide text-foreground-darker/50">total</span>
          <span class="font-mono text-lg font-bold tabular-nums">{fmt(displayScore)}</span>
        </div>
        {#if activeDelta !== null}
          <span class="flex items-baseline gap-1 rounded-full bg-success/20 px-2 py-0.5">
            <span class="text-[10px] font-medium uppercase tracking-wide text-success-light/70">round</span>
            <span class="font-mono text-sm font-bold tabular-nums text-success-light">+{fmt(activeDelta)}</span>
          </span>
        {/if}
      </div>
    {:else}
      <div
        class="flex shrink-0 items-center gap-2 font-mono tabular-nums"
        aria-label="Score: {fmt(displayScore)}"
      >
        {#if activeDelta !== null}
          <span class="text-sm font-bold text-success-light">+{fmt(activeDelta)}</span>
        {/if}
        <span class="flex items-center gap-1 text-primary">
          <Icon name="rhombus" class="size-3" />
          <span class="text-lg font-bold">{fmt(displayScore)}</span>
        </span>
      </div>
    {/if}

    {@render hearts()}
  </div>
</Card>
