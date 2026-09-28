<script lang="ts">
  /**
   * Curator toolbox controls (ADR 0019 route unification) — the curator's
   * only bespoke UI. Every other view (question/reveal/results/roles) is the
   * same page & component a normal player gets; this panel layers host-only
   * actions on top. One source for both surfaces: the desktop rail
   * (`(game)/+layout.svelte`) and the sub-breakpoint bottom sheet
   * (CuratorToolboxDrawer). Never shows an answer, so it's cheat-free.
   */
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import CastButton from "$lib/components/quiz/CastButton.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import type { PlayerSessionView } from "@/lib/svelte/player-session-view.js";

  let { session, compact = false }: { session: PlayerSessionView; compact?: boolean } =
    $props();

  const isManualMode = $derived(session.advanceMode === "manual");
  const isRevealed = $derived(!!session.correctAnswerId);
  const isPlaying = $derived(session.phase === "playing");
  // A fresh final_scores, "New quiz" not clicked yet — the moment it is,
  // startRoleSelection() flips phase to "role_selection" and the curator's
  // own journey routes them straight to /curator/create (quiz-journey.ts),
  // so this whole final view is never visible mid- or post-role-selection.
  const isFinal = $derived(session.phase === "final_scores");
  // Stop game only while a game is actually underway — not lobby,
  // role_selection or final_scores.
  const isGamePhase = $derived(
    session.phase === "playing" ||
      session.phase === "round_results" ||
      session.phase === "intermission",
  );
  const pendingPlayers = $derived(
    session.players.filter((p) => p.status === "pending"),
  );
  const managedPlayers = $derived(
    session.players.filter((p) => p.status !== "pending"),
  );
  const isLastQuestion = $derived(
    !!session.currentQuestion &&
      session.currentQuestion.questionIndex >=
        session.currentQuestion.totalQuestions - 1,
  );
  const nextButtonText = $derived(
    isLastQuestion ? "See final scores" : "Next question",
  );
</script>

{#if compact}
  {#if isPlaying && isManualMode && isRevealed}
    <Button
      onclick={() => session.advanceToNextQuestion()}
      variant="primary"
      intent="icon"
      aria-label={nextButtonText}
      title={nextButtonText}
    >
      <Icon name={isLastQuestion ? "wreath" : "chevron-right"} />
    </Button>
  {/if}
{:else}
<div class="flex flex-col gap-4">
  <CastButton size="sm" />

  {#if isPlaying && isManualMode && isRevealed}
    <Button
      onclick={() => session.advanceToNextQuestion()}
      variant="primary"
      intent="cta"
      class="w-full"
    >
      {nextButtonText}
    </Button>
  {/if}

  {#if isPlaying}
    <Button
      onclick={() =>
        session.isIntermission ? session.resumeGame() : session.pauseGame()}
      variant="secondary"
      class="w-full"
    >
      {session.isIntermission ? "Resume" : "Rest by the fire"}
    </Button>
  {/if}

  {#if isFinal}
    <Button
      onclick={() => session.startRoleSelection()}
      variant="secondary"
      intent="cta"
      class="w-full"
    >
      New quiz
    </Button>
    {#if !session.isObserver}
      <Button
        onclick={() => session.stopPlaying()}
        variant="outline"
        class="w-full"
      >
        Stop playing along
      </Button>
    {/if}
  {/if}

  {#if pendingPlayers.length > 0}
    <Card variant="warning">
      <h3 class="mb-2 text-sm font-medium text-warning">Pending approval</h3>
      <div class="flex flex-col gap-2">
        {#each pendingPlayers as player (player.id)}
          <div class="flex items-center justify-between rounded-xl border border-warning/40 px-3 py-2 text-sm">
            <span class="font-medium">{player.nickname}</span>
            <div class="flex gap-2">
              <Button
                onclick={() => session.approvePlayer(player.id)}
                variant="primary"
                class="px-3 py-1 text-xs"
              >
                Approve
              </Button>
              <Button
                onclick={() => session.rejectPendingPlayer(player.id)}
                variant="secondary"
                class="px-3 py-1 text-xs"
              >
                Reject
              </Button>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  <Card>
    <h3 class="mb-2 text-sm font-medium text-foreground-darker">Players</h3>
    <div class="flex flex-col gap-2">
      {#each managedPlayers as player (player.id)}
        <div class="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
          <span class="flex items-center gap-2 font-medium">
            {#if isPlaying}
              <span
                class="h-2 w-2 rounded-full {session.answeredPlayerIds.has(player.id)
                  ? 'bg-success'
                  : 'bg-warning'}"
              ></span>
            {/if}
            {player.nickname}
            {#if player.isCurator}<span class="text-xs text-secondary-300">(You)</span>{/if}
            {#if player.status === "disconnected"}<span class="text-xs text-foreground-darker">Disconnected</span>{/if}
          </span>
          {#if !player.isCurator}
            <div class="flex gap-1">
              <Button
                variant="ghost"
                intent="icon"
                onclick={() => session.removePlayer(player.id)}
                aria-label={`Remove ${player.nickname}`}
              >
                Remove
              </Button>
              <Button
                variant="ghost"
                intent="icon"
                onclick={() => session.removePlayerAndBlock(player.id)}
                aria-label={`Remove and block ${player.nickname}`}
              >
                Block
              </Button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </Card>

  <div class="flex flex-col gap-3 border-t border-border pt-4">
    {#if isGamePhase}
      <ConfirmButton
        label="Stop game"
        confirmLabel="Stop the game?"
        confirmVariant="neutral"
        progressStyle="border"
        revealDelay={400}
        onConfirm={() => session.stopGame()}
        variant="outline"
        class="w-full"
      >
        {#snippet icon()}<Icon name="x" />{/snippet}
        {#snippet confirmIcon()}<Icon name="check" />{/snippet}
      </ConfirmButton>
    {/if}
    {#if !isFinal}
      <ConfirmButton
        label="Reset to setup"
        confirmLabel="Reset to setup?"
        confirmVariant="neutral"
        progressStyle="border"
        revealDelay={400}
        onConfirm={() => session.resetToSetup()}
        variant="outline"
        class="w-full"
      >
        {#snippet icon()}<Icon name="arrow-left" />{/snippet}
        {#snippet confirmIcon()}<Icon name="check" />{/snippet}
      </ConfirmButton>
    {/if}
    <ConfirmButton
      label="Close lobby"
      confirmLabel="Close the lobby?"
      confirmVariant="danger"
      progressStyle="border"
      revealDelay={400}
      onConfirm={() => session.closeLobby()}
      variant="danger"
      class="w-full"
    >
      {#snippet icon()}<Icon name="door" />{/snippet}
      {#snippet confirmIcon()}<Icon name="check" />{/snippet}
    </ConfirmButton>
  </div>
</div>
{/if}
