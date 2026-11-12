<script lang="ts">
import { QuizResultsPageSchema } from "@orakl/protocol";
import { computeBadgeRarity } from "@orakl/shared";
import { Either, Schema } from "effect";
import type { BadgeId, Rarity } from "@orakl/shared";
  import { invalidateAll } from "$app/navigation";
  import { getQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import CeremonyFrame from "$lib/components/results/CeremonyFrame.svelte";
  import StatTile from "$lib/components/ui/StatTile.svelte";
  import CeremonyLeaderboard from "$lib/components/results/CeremonyLeaderboard.svelte";
  import ResultCard from "$lib/components/results/ResultCard.svelte";
  import QuestionFlagFollowUp from "$lib/components/results/QuestionFlagFollowUp.svelte";
  import EarnedBadge from "$lib/components/results/EarnedBadge.svelte";
  import RarityLegend from "$lib/components/ui/RarityLegend.svelte";
  import Button from "@/lib/components/ui/Button.svelte";
  import type { PageData } from "./$types";
  import Card from "@/lib/components/ui/Card.svelte";
  import Icon from '@/lib/components/ui/Icon.svelte';
  import Link from "@/lib/components/ui/Link.svelte";
  import { toast } from "@/lib/toast.js";
  
  import {
    performanceFromBreakdown,
    stoppedAfterCopy,
  } from "$lib/results-metrics";

  // Build-level PLAYER_EMOTES flag: the import() sits inside the guard, so
  // with __FEATURE_PLAYER_EMOTES__ false the gesture layer never enters the
  // bundle.
  const emoteLayer = __FEATURE_PLAYER_EMOTES__
    ? import("$lib/components/quiz/EmoteReactionLayer.svelte")
    : null;

  const session = getQuizSession();
  let { data: loaded }: { data: PageData } = $props();
  /** A refreshed copy of the load, tied to the load it refreshed so a newer load wins. */
  let refreshed = $state.raw<{ base: PageData; value: PageData } | null>(null);
  const data = $derived(
    refreshed && refreshed.base === loaded ? refreshed.value : loaded,
  );
  /** BADGE_DISPLAY off: the card keeps score and rank and drops the badges. */
  const showBadges = $derived(data.uiFlags.BADGE_DISPLAY === true);
  /** ROLE_SELECTION off: no observers exist, so their tile and row badge go. */
  const roleSelection = $derived(data.uiFlags.ROLE_SELECTION === true);

  const alreadyFlagged = $derived(new Set(data.alreadyFlaggedIds));

  /** The lobby is gone: the saved game, read-only — no socket, no emotes, no next quiz. */
  const archived = $derived(data.archived === true);

  // The socket delivers this player's breakdown per-connection at
  // final_scores (game-connection-handler.ts), ahead of the page-load data —
  // which reads game_results and is the only source on a refresh or from
  // history, since persistence is fire-and-forget from game-store.ts.
  // An archived page has no socket: the saved row is the only source.
  const breakdown = $derived(
    archived ? data.breakdown : (session.myBreakdown ?? data.breakdown),
  );

  $effect(() => {
    if (data.claimed) toast.success("Your results are saved to your new account.");
  });

  // game_results may not be written yet when this page loads (persist from
  // final_scores is fire-and-forget) — canFlag/alreadyFlaggedIds come back
  // false/empty until it exists. Reload the load once the row is ready; a
  // load that already saw the row (slow arrival, or a refresh) needs no
  // reload, so this only fires when the signal arrives after loading.
  let reloadedForResults = false;
  $effect(() => {
    if (session.resultsReadyCount > 0 && !reloadedForResults) {
      reloadedForResults = true;
      invalidateAll();
    }
  });

  // A socket flap can swallow the live results-ready frame: reload when the
  // socket returns, and once when the tab wakes without the breakdown row.
  // Fetches the results itself rather than invalidating the load: a failed
  // refresh must leave the live page and its socket in place.
  async function refreshResults() {
    const base = loaded;
    try {
      const res = await fetch(
        `/api/quiz/results${data.claimed ? "?claimed=1" : ""}`,
      );
      // The game moved on while the socket was down: the layout's phase
      // effect takes the page there, so there is nothing to refresh.
      if (res.status === 409) return;
      if (!res.ok) throw new Error(String(res.status));
      const decoded = Schema.decodeUnknownEither(QuizResultsPageSchema)(
        await res.json(),
      );
      if (Either.isLeft(decoded)) throw new Error("malformed");
      refreshed = { base, value: { ...loaded, ...decoded.right } };
    } catch {
      toast.error("Could not refresh your results. Showing what we have.");
    }
  }

  let wasReconnecting = false;
  $effect(() => {
    const reconnecting = session.isReconnecting;
    if (wasReconnecting && !reconnecting) refreshResults();
    wasReconnecting = reconnecting;
  });

  let reloadedOnVisible = false;
  function onVisibilityChange() {
    if (
      archived ||
      document.visibilityState !== "visible" ||
      reloadedOnVisible ||
      data.breakdown !== null
    )
      return;
    reloadedOnVisible = true;
    refreshResults();
  }

  let waitingToastId: string | number | undefined;

  $effect(() => {
    if (!archived && !data.claimed && !data.isAnonymousPlayer && !session.isCurator) {
      waitingToastId = toast.loading("Waiting for curator to start the next quiz.", { duration: Infinity });
      return () => {
        if (waitingToastId !== undefined) toast.dismiss(waitingToastId);
      };
    }
  });

  // The roster as it stood at game end (roles included) — a later role flip
  // (e.g. curator "Stop playing along") must not move rows on this podium.
  const finalPlayers = $derived(
    data.standings
      ? data.standings.map((s, index) => ({
          id: String(index),
          nickname: s.nickname,
          avatar: s.avatarId ?? "",
          score: s.score,
          rank: s.rank,
          role: s.role ?? ("player" as const),
          isCurator: false,
        }))
      : [...session.finalRoster].sort((a, b) => b.score - a.score),
  );
  /** The caller's row: the session's player, or the saved game's own row. */
  const currentPlayerId = $derived(
    data.standings
      ? String(data.standings.findIndex((s) => s.isViewer))
      : session.playerId,
  );
  const isObserver = $derived(
    data.standings
      ? data.standings.some((s) => s.isViewer && s.role === "observer")
      : session.isObserver,
  );

  // A non-participating curator ("NPC") isn't a spectator the way a regular
  // observer is — a regular observer is still shown, marked apart from the
  // contest (see CeremonyLeaderboard's showObserverBadge); the curator's row
  // has nothing to rank at all when they're not playing along.
  const leaderboardPlayers = $derived(
    finalPlayers
      .filter((p) => !(p.isCurator && p.role === "observer"))
      .map((p) => ({
        ...p,
        avatarSrc: session.getAvatarSrc(p.avatar),
      })),
  );

  // Own badges only — the server enriches this player's final-scores frame;
  // rarity is derived client-side from the run params (never stored).
  const badgeRarity = $derived((id: BadgeId): Rarity => {
    if (!session.badgeRun) return "common";
    return computeBadgeRarity(id, session.badgeRun);
  });

  const performance = $derived(
    isObserver ? null : performanceFromBreakdown(breakdown),
  );

  /** Observers see the results page's emotes but cannot send; no answered rule applies. */
  const canEmote = $derived(
    session.phase === "final_scores" &&
      !session.isObserver &&
      session.pickedEmotes.length > 0,
  );

  // An archived page has no session nickname: the viewer's saved row has it.
  const claimNickname = $derived(
    archived
      ? (data.standings?.find((s) => s.isViewer)?.nickname ?? "")
      : (session.nickname ?? ""),
  );

  const standingsSubtitle = $derived(
    archived
      ? `Ranks settle by score${roleSelection ? ", with observers marked apart from the contest" : ""}. This lobby has ended. Its chronicle is kept.`
      : `${session.stoppedAfter ? `${stoppedAfterCopy(session.stoppedAfter.served)} ` : ""}Ranks settle by score${roleSelection ? ", with observers marked apart from the contest" : ""}. The vault will open for the next quiz shortly.`,
  );
</script>

<svelte:head><title>Final standings — Orakl</title></svelte:head>
<svelte:document onvisibilitychange={onVisibilityChange} />

{#snippet content()}
<div class="flex flex-col gap-5 py-4">
  <CeremonyFrame
    kicker="Final standings"
    title="The round ends"
    subtitle={standingsSubtitle}
  >
    {#snippet aside()}
      {#if finalPlayers.length > 0}
      <div class="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Players"
          value={finalPlayers.filter((p) => p.role !== "observer")
            .length}
          tone="warning"
        />
        {#if roleSelection}
          <StatTile
            label="Observers"
            value={finalPlayers.filter((p) => p.role === "observer")
              .length}
            tone="neutral"
          />
        {/if}
      </div>
      {/if}
    {/snippet}

    <CeremonyLeaderboard
      players={leaderboardPlayers}
      {currentPlayerId}
      showObserverBadge={roleSelection}
    />
  </CeremonyFrame>

  {#if data.hostAllowance}
    <Card variant="info">
      <div class="flex flex-col gap-1" role="status">
        {#if data.hostAllowance.counted}
          <p class="text-sm font-sans">
            Free game {data.hostAllowance.used} of {data.hostAllowance.limit} this
            year · {data.hostAllowance.left} left ·
            <Link href="/profile#host" intent="inline">Subscribe to host without limits</Link>
          </p>
        {:else}
          <p class="text-sm font-sans">
            {#if data.hostAllowance.limit > 0}
              This game did not count against your {data.hostAllowance.limit} free
              games.
            {:else}
              This game did not count.
            {/if}
          </p>
        {/if}
      </div>
    </Card>
  {/if}

  {#if performance}
    <CeremonyFrame kicker="Your performance" title={showBadges ? "Accolades" : "Time and accuracy"}>
      {#snippet aside()}
        <StatTile label="Best streak" value={performance.bestStreak} tone="flame" />
      {/snippet}

      <div class="flex flex-col gap-6 group">
        {#if showBadges}
          {#if session.myBadges.length > 0}
            <div class="flex flex-col gap-4">
              <p class="text-foreground-darker">
                You earned <span class="text-foreground font-bold">{session.myBadges.length} badge{session.myBadges.length > 1 ? "s" : ""}</span> for your performance in this quiz.
              </p>
              <div class="flex flex-wrap gap-2">
                {#each session.myBadges as badge (badge.id)}
                  <EarnedBadge
                    id={badge.id}
                    detail={badge.detail}
                    rarity={badgeRarity(badge.id)}
                  />
                {/each}
              </div>
              <RarityLegend id="quiz-results-rarity-legend" />
            </div>
            {#if data.isAnonymousPlayer && !data.claimed}
              <p class="text-foreground-darker text-sm">
                Sign in to keep these badges. They are lost when you leave.
              </p>
            {/if}
          {:else}
            <p class="text-foreground-darker">No badges earned this round.</p>
          {/if}
        {/if}

        {#if performance.answered === 0}
          <p class="text-foreground-darker">You did not answer any questions this round.</p>
        {:else}
          <div class="grid gap-3 sm:grid-cols-3">
            <StatTile label="Questions" value={performance.answered} tone="neutral" />
            <StatTile label="Correct" value={performance.correct} tone="success" />
            <StatTile label="Missed" value={performance.missed} tone="warning" />
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <StatTile label="Avg. time" value={performance.avgTimeText} tone="neutral" />
            <StatTile label="Accuracy" value={performance.accuracyText} tone="neutral" />
          </div>
        {/if}
      </div>
    </CeremonyFrame>
  {/if}

  {#if data.isAnonymousPlayer && !data.claimed}
    <Card variant="rooftop" class="relative isolate overflow-hidden">
      <div class="flex gap-4 justify-between flex-col md:flex-row">
        <div class="flex flex-col gap-1">
          <p class="font-semibold text-2xl">Create an account to keep these results</p>
          <p class="text-background-lighter">
            {showBadges ? "Your results and badges" : "Your results"} will be saved to your profile.
          </p>
        </div>
        <Button
          href="/signup?claim=1&nickname={encodeURIComponent(claimNickname)}"
          variant="secondary-inverted"
          intent="cta"
          class="self-end"
        >
          Create account
        </Button>
      </div>
      <div class="absolute -bottom-2 -left-5 text-secondary-600/50 pointer-events-none -z-10">
        <Icon name="orakl" class="size-xs -rotate-27" />
      </div>
    </Card>
  {/if}

  {#if breakdown && breakdown.length > 0}
    <CeremonyFrame kicker="Your answers" title="Wisdom is shared">
      <p class="text-foreground-darker">
        Review the questions you answered this round, see which ones you got
        right or wrong, and learn the correct answers.
      </p>
      <div class="flex flex-col gap-3">
        {#each breakdown as q (q.questionIndex)}
          <div class="flex flex-col gap-2">
            <ResultCard
              index={q.questionIndex}
              text={q.questionText ?? `Question ${q.questionIndex + 1}`}
              correct={q.isCorrect}
              selectedAnswer={q.selectedAnswerText ?? null}
              correctAnswer={q.correctAnswerText ?? "—"}
              mediaUrl={q.mediaUrl}
              mediaCredit={q.mediaCredit}
              questionId={q.questionId ?? undefined}
              postAnswerNote={q.postAnswerNote}
              source={q.source}
            />
            {#if q.questionId && data.canFlag}
              <QuestionFlagFollowUp
                questionId={q.questionId}
                selectedAnswerText={q.selectedAnswerText ?? null}
                alreadyFlagged={alreadyFlagged.has(q.questionId)}
              />
            {/if}
          </div>
        {/each}
      </div>
    </CeremonyFrame>
  {/if}
</div>
{/snippet}

{#if emoteLayer && !archived}
  <!-- Pending branch renders the results bare, so SSR HTML carries the full
       page and only the emote gesture wrapper arrives with the chunk. -->
  {#await emoteLayer}
    {@render content()}
  {:then { default: EmoteReactionLayer }}
    <EmoteReactionLayer
      pickedEmotes={session.pickedEmotes}
      emoteSrc={(id) => session.getEmoteSrc(id)}
      emoteStillSrc={(id) => session.getEmoteStillSrc(id)}
      emoteTitle={(id) => session.getEmoteTitle(id)}
      activeEmotes={session.activeEmotes}
      selfPlayerId={session.playerId}
      {canEmote}
      mode="wrapper"
      onSend={(emoteId, x, y) => session.sendEmote(emoteId, x, y)}
    >
      {#snippet children()}
        {@render content()}
      {/snippet}
    </EmoteReactionLayer>
  {:catch}
    {@render content()}
  {/await}
{:else}
  {@render content()}
{/if}
