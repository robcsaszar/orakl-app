<script lang="ts">
import { percent, toIsoTimestamp } from "@orakl/shared";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import CeremonyFrame from "$lib/components/results/CeremonyFrame.svelte";
  import CeremonyLeaderboard from "$lib/components/results/CeremonyLeaderboard.svelte";
  import StatTile from "$lib/components/ui/StatTile.svelte";
  import ResultCard from "$lib/components/results/ResultCard.svelte";
  import QuestionFlagFollowUp from "$lib/components/results/QuestionFlagFollowUp.svelte";
  import EarnedBadge from "$lib/components/results/EarnedBadge.svelte";
  import RarityLegend from "$lib/components/ui/RarityLegend.svelte";
  
  import { formatDateShort } from "@/lib/format.js";
  
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const alreadyFlagged = $derived(new Set(data.alreadyFlaggedIds));

  const accuracy = $derived(
    data.stats.accuracy === null
      ? "—"
      : `${percent(data.stats.accuracy)}%`,
  );
  const avgTime = $derived(
    data.stats.avgTimeMs === null
      ? "—"
      : `${(data.stats.avgTimeMs / 1000).toFixed(1)}s`,
  );

  function dateLabel(s: string): string {
    // game_sessions stamps SQLite datetime('now') strings ("YYYY-MM-DD
    // HH:MM:SS", UTC) — not ISO, so Safari rejects them and V8 reads them as
    // local time. Normalise to ISO-UTC before parsing.
    return formatDateShort(toIsoTimestamp(s));
  }

  // Rows without a stored avatar (games before #1281 shipped) resolve
  // avatarSrc to "", so PlayerRow falls back to its default quietly.
  const leaderboardPlayers = $derived(
    data.standings.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      score: s.score,
      rank: s.rank,
      avatarSrc: s.avatarSrc,
      role: s.role ?? undefined,
    })),
  );
  const viewerResultId = $derived(
    data.standings.find((s) => s.isViewer)?.id ?? null,
  );

</script>

<Metatags title="Night review" description="A past multiplayer quiz night." />

<h1 class="sr-only">Night review</h1>

<div class="flex flex-col gap-5">
  <CeremonyFrame
    kicker="Final standings"
    title="Night review"
    subtitle={`${dateLabel(data.game.startedAt)} · ${data.game.quizName}`}
  >
    <CeremonyLeaderboard players={leaderboardPlayers} currentPlayerId={viewerResultId} />
  </CeremonyFrame>

  <CeremonyFrame
    kicker="Your performance"
    title={data.uiFlags.BADGE_DISPLAY === true ? "Accolades" : "Time and accuracy"}
  >
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Score" value={data.game.finalScore} tone="secondary" />
        <StatTile
          label="Rank"
          value={`#${data.game.rank} of ${data.game.playerCount}`}
          tone="neutral"
        />
        <StatTile label="Accuracy" value={accuracy} tone="neutral" />
        <StatTile label="Avg. time" value={avgTime} tone="neutral" />
      </div>

      {#if data.uiFlags.BADGE_DISPLAY === true && data.badges.length > 0}
        <div class="flex flex-col gap-2">
          <h2 class="text-sm font-bold uppercase tracking-widest text-foreground-darker">
            Badges earned
          </h2>
          <div class="flex flex-wrap gap-2">
            {#each data.badges as badge (badge.id)}
              <EarnedBadge id={badge.id} rarity={badge.rarity} />
            {/each}
          </div>
          <RarityLegend id="night-review-rarity-legend" />
        </div>
      {/if}
    </div>
  </CeremonyFrame>

  <CeremonyFrame kicker="Your answers" title="Wisdom is shared">
    {#if data.breakdown}
      <div class="flex flex-col gap-4">
        {#each data.breakdown as q (q.questionIndex)}
          <div class="flex flex-col gap-2">
            <ResultCard
              index={q.questionIndex}
              text={q.questionText ?? `Question ${q.questionIndex + 1}`}
              correct={q.isCorrect}
              selectedAnswer={q.selectedAnswerText ?? null}
              correctAnswer={q.correctAnswerText ?? "—"}
              mediaUrl={q.mediaUrl}
              postAnswerNote={q.postAnswerNote}
              source={q.source}
            />
            {#if q.questionId}
              <QuestionFlagFollowUp
                questionId={q.questionId}
                selectedAnswerText={q.selectedAnswerText ?? null}
                alreadyFlagged={alreadyFlagged.has(q.questionId)}
              />
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-foreground-darker">
        No per-question detail was recorded for this game.
      </p>
    {/if}
  </CeremonyFrame>
</div>
