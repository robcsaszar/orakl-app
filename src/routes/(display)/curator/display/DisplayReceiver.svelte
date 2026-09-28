<script lang="ts">
import { avatars } from "@orakl/shared";
  import { onDestroy, onMount, untrack } from "svelte";
  import { page } from "$app/state";
  import type { Player } from "@orakl/protocol";
  
  import { type TimerState } from "@orakl/client-core";
  import { isDisplayMock } from "@/lib/svelte/mimicContext.svelte.js";
  import { curatorStore } from "@/lib/svelte/curatorStore.store.js";
  import { createDisplaySession } from "@/lib/svelte/displaySession.svelte.js";
  import QuizDisplay from "./QuizDisplay.svelte";
  import JoinView from "./JoinView.svelte";
  import CeremonyFrame from "$lib/components/results/CeremonyFrame.svelte";
  import StatTile from "$lib/components/ui/StatTile.svelte";
  import CeremonyLeaderboard from "$lib/components/results/CeremonyLeaderboard.svelte";

  interface Props {
    displayToken: string;
  }

  let { displayToken = "" }: Props = $props();

  const mock = isDisplayMock();
  const avatarSrcMap = new Map(avatars.map((a) => [a.id, a.src]));

  // Deep session controller — owns the WS lifecycle and ServerMessage
  // routing. See displaySession.svelte.ts. Token is fixed for the page's
  // lifetime, so the init-time read is intentional.
  // svelte-ignore state_referenced_locally
  const session = createDisplaySession({ mock, displayToken });

  // Read-only mirrors of controller state, named to match the template below
  // (which is unchanged) — mock mode writes through `session.state.*` directly.
  let currentView = $derived(session.state.currentView);
  let questionType = $derived(session.state.questionType);
  let currentQuestion = $derived(session.state.currentQuestion);
  let answers = $derived(session.state.answers);
  let timeRemaining = $derived(session.state.timeRemaining);
  let timerDuration = $derived(session.state.timerDuration);
  let totalQuestions = $derived(session.state.totalQuestions);
  let currentQuestionIndex = $derived(session.state.currentQuestionIndex);
  let correctAnswerId = $derived(session.state.correctAnswerId);
  let playerAnswerMap = $derived(session.state.playerAnswerMap);
  let matchItems = $derived(session.state.matchItems);
  let answerRevealed = $derived(session.state.answerRevealed);
  let postAnswerNote = $derived(session.state.postAnswerNote);
  let players = $derived(session.state.players);
  let answeredPlayerIds = $derived(session.state.answeredPlayerIds);
  let sortedPlayers = $derived(session.state.sortedPlayers);
  let roleSelectionActive = $derived(session.state.roleSelectionActive);
  let roleSelectionTimeRemaining = $derived(
    session.state.roleSelectionTimeRemaining,
  );
  let quizName = $derived(session.state.quizName);
  let description = $derived(session.state.description);
  let initError = $derived(session.state.initError);
  let isIntermission = $derived(session.state.isIntermission);
  let lobbyEnded = $derived(session.state.lobbyEnded);
  let lobbyCode = $derived(session.state.lobbyCode);

  const questionCounter = $derived(`${currentQuestionIndex + 1} / ${totalQuestions}`);
  const timerFraction = $derived(timeRemaining / timerDuration);
  const isTimerLow = $derived(timeRemaining <= 5);
  const timerState = $derived.by<TimerState>(() => {
    if (answerRevealed) return "correct";
    if (timeRemaining <= 0) return "timeout";
    return isTimerLow ? "low" : "counting";
  });
  // Hoisted before answerCountText so the memoized length is reused instead of re-filtering on every player:answered event
  const connectedPlayers = $derived(players.filter((p) => p.role !== "observer"));
  const answerCountText = $derived(
    `${answeredPlayerIds.size} / ${connectedPlayers.length} answered`,
  );
  const observerCount = $derived(
    sortedPlayers.filter((player) => player.role === "observer").length,
  );
  const showObserverTile = $derived(page.data.uiFlags?.ROLE_SELECTION === true);
  const statTileGridClass = $derived(
    `mx-auto grid w-full max-w-4xl gap-3 ${showObserverTile ? "md:grid-cols-3" : "md:grid-cols-2"}`,
  );

  function hasPlayerAnswered(playerId: string) {
    return answeredPlayerIds.has(playerId);
  }

  function getAvatarSrc(avatarId: string): string {
    return avatarSrcMap.get(avatarId) ?? "";
  }

  // Mock mode: sync all WS-driven state from curatorStore + URL params
  $effect(() => {
    if (!mock) return;
    const dview = page.url.searchParams.get("dview") ?? "waiting";
    const paramState = page.url.searchParams.get("state") ?? "unanswered";
    const store = $curatorStore;

    const showing = paramState === "correct" || paramState === "incorrect" || paramState === "timeout";
    const revealed = showing && dview === "question";
    const q = store.currentQuestion;

    untrack(() =>
      session.applyMockState({
        view: dview === "final" ? "final" : dview === "question" ? "question" : "waiting",
        question: q ? { ...q, timeRemaining: store.timeRemaining, serverTs: Date.now() } as Parameters<typeof session.applyMockState>[0]["question"] : null,
        timerDuration: store.timerDuration,
        answerRevealed: revealed,
        correctAnswerId: revealed ? store.correctAnswerId : "",
        playerAnswerMap: revealed ? store.playerAnswerMap : {},
        answeredPlayerIds: store.answeredPlayerIds,
        players: store.players as unknown as Player[],
        lobbyCode: "MIMIC1",
      }),
    );
  });

  onMount(async () => {
    await session.connect();
  });

  onDestroy(() => {
    session.destroy();
  });
</script>

<div class="flex h-full min-h-0 flex-col px-12 py-8">
  <!-- Header -->
  <header class="flex items-center justify-between">
    <div class="flex flex-col gap-1">
      <div class="text-xl font-bold tracking-tight">Orakl</div>
      {#if quizName}
        <div class="mt-1">
          <h1 class="text-3xl font-bold">{quizName}</h1>
          {#if description}
            <p class="mt-1 text-sm text-foreground-darker">{description}</p>
          {/if}
        </div>
      {/if}
    </div>
  </header>

  <!-- Intermission banner (curator paused the game) -->
  {#if isIntermission && !lobbyEnded && !initError}
    <div class="mt-4 rounded-2xl border border-warning/40 bg-warning-dark/15 px-6 py-3 text-center" role="status" aria-live="polite">
      <p class="text-xl font-semibold text-warning-light">Resting by the fire</p>
      <p class="text-sm text-foreground-darker">The quiz is paused.</p>
    </div>
  {/if}

  <!-- Error -->
  {#if initError}
    <div class="flex flex-1 items-center justify-center" role="alert">
      <p class="text-2xl text-danger">{initError}</p>
    </div>
  {:else if lobbyEnded}
    <div class="flex flex-1 items-center justify-center" role="status" aria-live="polite">
      <p class="text-2xl text-foreground-darker">The quiz has ended.</p>
    </div>
  {:else if currentView === "waiting"}
    <div class="flex min-h-0 flex-1 flex-col items-center">
      <JoinView {lobbyCode} {players} avatarSrc={getAvatarSrc} />
    </div>
  {:else if currentView === "loading"}
    <div class="flex flex-1 items-center justify-center" role="status" aria-live="polite">
      <p class="text-2xl text-foreground-darker">Starting quiz…</p>
    </div>
  {/if}

  <!-- Question View -->
  {#if currentView === "question"}
    <div class="flex min-h-0 flex-1 flex-col pt-8">
      {#snippet displayPlayerBar()}
        {#if answerRevealed}
          <div class="flex items-center gap-4 pt-2">
            <span class="font-mono text-sm text-foreground-darker">{answerCountText}</span>
            <div class="flex gap-2">
              {#each connectedPlayers as player (player.id)}
                {#if player.avatar && getAvatarSrc(player.avatar)}
                  <img
                    src={getAvatarSrc(player.avatar)}
                    class="h-8 w-8 transition-[filter,opacity] duration-300 {hasPlayerAnswered(player.id) ? '' : 'grayscale opacity-50'}"
                    alt={player.nickname}
                    style="image-rendering: pixelated;"
                  />
                {/if}
              {/each}
            </div>
          </div>
        {/if}
      {/snippet}

      <QuizDisplay
        data={{
          questionType,
          text: currentQuestion?.text ?? "",
          answers,
          matchItems,
          mediaUrl: currentQuestion?.mediaUrl,
          mediaType: currentQuestion?.mediaType,
          correctAnswerId,
          timerState,
          timeRemaining,
          timerFraction,
          counter: questionCounter,
          difficulty: currentQuestion?.difficulty,
          categoryLabel: currentQuestion?.categoryId?.replace(/-/g, " "),
          postAnswerNote,
        }}
        variant="display"
        playerBar={displayPlayerBar}
      />
    </div>
  {/if}

  <!-- Final View -->
  {#if currentView === "final"}
    <div class="flex min-h-0 flex-1 flex-col justify-center-safe gap-6 py-8 overflow-hidden">
      <!-- shrink-0: the leaderboard below is the frame that gives way -->
      <div class="shrink-0">
      <CeremonyFrame
        kicker="Final standings"
        title={quizName ? `${quizName} enters the vault` : "The chronicle is sealed"}
        subtitle="The room can hold on this board while the next rite is prepared."
        align="center"
      >
        <div class={statTileGridClass}>
          <StatTile label="Players" value={sortedPlayers.length} tone="neutral" />
          {#if showObserverTile}
            <StatTile label="Observers" value={observerCount} tone="warning" />
          {/if}
          <StatTile
            label="Next state"
            value={roleSelectionActive ? `${roleSelectionTimeRemaining}s` : "Awaiting curator"}
            tone="secondary"
          />
        </div>
      </CeremonyFrame>
      </div>

      <!-- The frame's own overflow-hidden lets it shrink; this wrapper is
           the flex item that hands it the remaining height. -->
      <div class="flex min-h-0 w-full max-w-6xl flex-1 flex-col self-center">
        <CeremonyFrame kicker="Leaderboard" title="Order of the hall">
          <CeremonyLeaderboard
            players={sortedPlayers}
            showObserverBadge={page.data.uiFlags?.ROLE_SELECTION === true}
            columns={2}
          />
        </CeremonyFrame>
      </div>
    </div>
  {/if}
</div>
