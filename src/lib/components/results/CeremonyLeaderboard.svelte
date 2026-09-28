<script lang="ts">
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import PlayerRow from "$lib/components/ui/PlayerRow.svelte";
  import { getLobbyTitle } from "@/lib/lobby-titles.js";

  export interface CeremonyLeaderboardEntry {
    id: string;
    nickname: string;
    score: number;
    /** Stored rank (shared only on games stored before ranks became distinct); list position when absent. */
    rank?: number;
    role?: "player" | "observer";
    avatarSrc?: string;
  }

  let {
    players,
    currentPlayerId = null,
    columns = 1,
    showObserverBadge = true,
    onRemove,
    onRemoveAndBlock,
    class: className = "",
  }: {
    players: CeremonyLeaderboardEntry[];
    currentPlayerId?: string | null;
    columns?: 1 | 2;
    showObserverBadge?: boolean;
    onRemove?: ((playerId: string) => void) | null;
    onRemoveAndBlock?: ((playerId: string) => void) | null;
    class?: string;
  } = $props();
</script>

<ul class={`grid gap-3 ${columns === 2 ? "xl:grid-cols-2" : ""} ${className}`}>
  {#each players as player, index (player.id)}
    {@const title = getLobbyTitle(player.nickname)}
    <li>
    <PlayerRow
      rank={player.rank ?? index + 1}
      nickname={player.nickname}
      avatarSrc={player.avatarSrc}
      score={player.score}
      prefix={title.prefix}
      suffix={title.suffix}
    >
      {#snippet badge()}
        {#if player.id === currentPlayerId}
        <Badge variant="medium">You</Badge>
        {/if}
        {#if showObserverBadge && player.role === "observer"}
          <Badge variant="medium">Observer</Badge>
        {/if}
      {/snippet}
      {#snippet actions()}
        {#if onRemove}
          <Button
            type="button"
            variant="ghost"
            intent="icon"
            class="size-10 rounded-full border border-danger/25 bg-danger/8 text-danger-lighter hover:border-danger/45 hover:bg-danger/12"
            onclick={() => onRemove!(player.id)}
            aria-label={`Remove ${player.nickname}`}
            data-tooltip={`Remove ${player.nickname}`}
          >
            <Icon name="x" class="size-4" />
          </Button>
        {/if}
        {#if onRemoveAndBlock}
          <Button
            type="button"
            variant="ghost"
            intent="icon"
            class="size-10 rounded-full border border-danger/35 bg-danger/12 text-danger-lighter hover:border-danger/50 hover:bg-danger/18"
            onclick={() => onRemoveAndBlock!(player.id)}
            aria-label={`Remove and block ${player.nickname}`}
            data-tooltip={`Remove and block ${player.nickname}`}
          >
            <Icon name="ban" class="size-4" />
          </Button>
        {/if}
      {/snippet}
    </PlayerRow>
    </li>
  {:else}
    <li class="text-foreground-darker">Standings are still arriving.</li>
  {/each}
</ul>
