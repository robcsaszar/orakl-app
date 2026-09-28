<script lang="ts">
  import { cn } from 'tailwind-variants';
  import Badge from "$lib/components/ui/Badge.svelte";

  interface Player {
    id: string;
    initial: string;
    nickname: string;
    avatarSrc: string;
  }

  interface Props {
    answerId: string;
    correctAnswerId: string;
    selectedAnswerId: string | null;
    players: Player[];
    proportion: string;
    /** True when nobody picked the correct answer — flags the wrong answers instead of leaving them neutral. */
    allIncorrect?: boolean;
  }

  let { answerId, correctAnswerId, selectedAnswerId, players, proportion, allIncorrect = false }: Props = $props();

  const MAX_VISIBLE = 5;
  const isCorrect = $derived(answerId === correctAnswerId);
  const isMissedByEveryone = $derived(!isCorrect && allIncorrect);
  const avatarToneClasses = $derived(
    isCorrect ? "bg-success-light text-success-dark"
    : isMissedByEveryone ? "bg-danger-light text-danger-dark"
    : "bg-gray-300 text-gray-800"
  );
  const overflowToneClasses = $derived(
    isCorrect ? "bg-success-dark text-success-light"
    : isMissedByEveryone ? "bg-danger-dark text-danger-light"
    : "bg-gray-800 text-gray-300"
  );
  const badgeToneClasses = $derived(
    isCorrect ? "bg-success-light text-success-dark"
    : isMissedByEveryone ? "bg-danger-light text-danger-dark"
    : "bg-gray-300 text-gray-800"
  );
  const visiblePlayers = $derived(players.slice(0, MAX_VISIBLE));
  const overflowCount = $derived(Math.max(0, players.length - MAX_VISIBLE));
</script>

<div class="isolate flex items-center flex-nowrap gap-2">
  <div class="flex flex-nowrap items-center">
    {#each visiblePlayers as p, i (p.id)}
      <span class="relative inline-flex h-8 w-8 shrink-0" style="margin-left: {i === 0 ? 0 : -8}px; z-index: {20 - i}">
        {#if p.avatarSrc}
          <img src={p.avatarSrc} alt={p.nickname} title={p.nickname} class="size-8" style="image-rendering: pixelated;" />
        {:else}
          <span class={cn(["flex h-8 w-8 items-center justify-center rounded-2xl corner-shape-squircle text-sm font-bold", avatarToneClasses])} title={p.nickname}>{p.initial}</span>
        {/if}
      </span>
    {/each}
    {#if overflowCount > 0}
      <span class={cn(["flex h-8 w-8 items-center justify-center rounded-2xl corner-shape-squircle text-sm font-bold", overflowToneClasses])} style="margin-left: -8px; z-index: 0">+{overflowCount}</span>
    {/if}
  </div>
   {#if proportion !== "0%"}
    <Badge class={cn(["z-100 tracking-tight", badgeToneClasses])}>{proportion}</Badge>
  {/if}
</div>
