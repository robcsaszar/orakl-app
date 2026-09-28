<script lang="ts">
  import { tick } from "svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import PlayerRow from "$lib/components/ui/PlayerRow.svelte";
  import { getLobbyTitle } from "@/lib/lobby-titles.js";
  import type { Npc } from "@/lib/npcs.js";
  import type { PlayerData, PlayerSessionView } from "@/lib/svelte/player-session-view.js";
  import SoloOpponentCard from "./SoloOpponentCard.svelte";

  let {
    curator,
    session,
    me,
    others,
    soloNpc,
    onSaveNickname,
  }: {
    curator: boolean;
    session: PlayerSessionView;
    me: PlayerData | undefined;
    others: PlayerData[];
    soloNpc?: Npc;
    onSaveNickname?: (playerId: string, nickname: string) => void;
  } = $props();

  // ── Curator-only: inline rename state (edit nickname / remove / block) ──
  let editingPlayerId = $state<string | null>(null);
  let editingValue = $state("");
  let editingPlayerNickname = $state("");
  let editingInputRef = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);

  function startEditPlayer(playerId: string, nickname: string) {
    editingPlayerId = playerId;
    editingValue = nickname;
    editingPlayerNickname = nickname;
  }

  async function returnFocusToPencil(nickname: string) {
    await tick();
    document
      .querySelector<HTMLButtonElement>(
        `[aria-label="Edit nickname for ${nickname}"]`,
      )
      ?.focus();
  }

  function cancelEditPlayer() {
    editingPlayerId = null;
    returnFocusToPencil(editingPlayerNickname);
  }

  function saveEditPlayer(playerId: string) {
    const trimmed = editingValue.trim();
    editingPlayerId = null;
    returnFocusToPencil(editingPlayerNickname);
    if (!trimmed) return;
    onSaveNickname?.(playerId, trimmed);
  }

  $effect(() => {
    if (editingPlayerId) editingInputRef?.focus();
  });
</script>

{#snippet row(player: PlayerData)}
  {@const title = getLobbyTitle(player.nickname)}
  {#snippet badge()}
    <span class="flex items-center gap-2">
      <span
        class="size-2 rounded-full {player.status === 'active' ? 'bg-success' : 'bg-foreground-darker'}"
        aria-hidden="true"
      ></span>
      {#if player.isCurator}
        <Badge variant="host">Host</Badge>
      {/if}
      {#if player.role === "observer"}
        <Badge variant="observer">Observer</Badge>
      {/if}
    </span>
  {/snippet}
  {#snippet nameEditor()}
    <Input
      type="text"
      id="nickname-{player.id}"
      name="nickname-{player.id}"
      label=""
      size="sm"
      bind:inputRef={editingInputRef}
      bind:value={editingValue}
      onkeydown={(e) => {
        if (e.key === "Enter") saveEditPlayer(player.id);
        if (e.key === "Escape") cancelEditPlayer();
      }}
      maxlength={20}
      aria-label={`Edit nickname for ${player.nickname}`}
    />
  {/snippet}
  {#snippet actions()}
    {#if editingPlayerId !== player.id}
      <Button
        variant="ghost"
        intent="icon"
        onclick={() => session.removePlayer(player.id)}
        aria-label={`Remove ${player.nickname}`}
        class="hover:text-danger-light hover:bg-danger"
      >
        <Icon name="close" class="size-5" />
      </Button>
      <Button
        variant="ghost"
        intent="icon"
        onclick={() => session.removePlayerAndBlock(player.id)}
        aria-label={`Remove and block ${player.nickname}`}
        class="hover:text-danger-light hover:bg-danger"
      >
        <Icon name="ban" class="size-5" />
      </Button>
      <Button
        variant="ghost"
        intent="icon"
        onclick={() => startEditPlayer(player.id, player.nickname)}
        aria-label={`Edit nickname for ${player.nickname}`}
      >
        <Icon name="edit" class="size-5" />
      </Button>
    {:else}
      <div class="flex gap-1">
        <Button
          variant="ghost"
          intent="icon"
          onclick={() => saveEditPlayer(player.id)}
          aria-label={`Save nickname for ${player.nickname}`}
          class="hover:text-success-light hover:bg-success"
        >
          <Icon name="check" class="size-5" />
        </Button>
        <Button
          variant="ghost"
          intent="icon"
          onclick={cancelEditPlayer}
          aria-label={`Cancel edit for ${player.nickname}`}
          class="hover:text-danger-light hover:bg-danger"
        >
          <Icon name="x" class="size-5" />
        </Button>
      </div>
    {/if}
  {/snippet}
  <PlayerRow
    nickname={player.nickname}
    avatarSrc={session.getAvatarSrc(player.avatar) || undefined}
    prefix={title.prefix}
    suffix={title.suffix}
    name={curator && editingPlayerId === player.id ? nameEditor : undefined}
    badge={curator ? badge : undefined}
    actions={curator && !player.isCurator ? actions : undefined}
  />
{/snippet}

{#if me}
  {@render row(me)}
{/if}

<div class="flex items-center gap-4 text-sm font-semibold font-sans uppercase tracking-widest text-foreground-darker/40">
  <div class="flex-1 h-0.5 bg-linear-90 from-0% from-transparent to-100% to-secondary/20"></div>
  versus
  <div class="flex-1 h-0.5 bg-linear-270 from-0% from-transparent to-100% to-secondary/20"></div>
</div>

{#if others.length === 0 && !curator}
  <SoloOpponentCard npc={soloNpc as Npc} />
{:else}
  <ul class="flex flex-col gap-2">
    {#each others as player (player.id)}
      <li>{@render row(player)}</li>
    {/each}
  </ul>
{/if}
