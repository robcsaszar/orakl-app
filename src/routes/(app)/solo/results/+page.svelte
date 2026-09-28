<script lang="ts">
import { computeBadgeRarity, percent } from "@orakl/shared";
import type { BadgeId, Rarity } from "@orakl/shared";
  import type { FeatureFlagName } from "@orakl/shared";
  import { getSoloSession } from "@/lib/svelte/soloSession.svelte.js";
  import CeremonyFrame from "$lib/components/results/CeremonyFrame.svelte";
  import StatTile from "$lib/components/ui/StatTile.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import ResultCard from "$lib/components/results/ResultCard.svelte";
  import QuestionFlagFollowUp from "$lib/components/results/QuestionFlagFollowUp.svelte";
  import EarnedBadge from "$lib/components/results/EarnedBadge.svelte";
  
  import SoloGuestCta from "../SoloGuestCta.svelte";
  
  import RarityLegend from "$lib/components/ui/RarityLegend.svelte";
  import Progress from '$lib/components/ui/Progress.svelte';

  // Layout data, for the flag states the board CTAs below gate on.
  let {
    data,
  }: { data: { uiFlags: Partial<Record<FeatureFlagName, boolean>> } } =
    $props();

  const s = getSoloSession();

  // Promise only what is switched on: the boards, the record, or neither.
  const soloPitch = $derived(
    data.uiFlags.SOLO_LEADERBOARDS
      ? "Sign in to save this run and claim your place on the leaderboards."
      : data.uiFlags.PLAYER_HISTORY
        ? "Sign in to save this run to your record."
        : "Sign in to keep this run.",
  );

  const fd = $derived(s.finalData);
  const catName = $derived(
    new Map(s.categories.map((c) => [c.id, c.name] as const)),
  );

  // Per-category accuracy (US #12) — derived from the server's authoritative
  // per-question results, which carry categoryId.
  const categoryStats = $derived.by(() => {
    if (!fd) return [];
    const tally = new Map<string, { correct: number; total: number }>();
    for (const r of fd.results) {
      const e = tally.get(r.categoryId) ?? { correct: 0, total: 0 };
      e.total++;
      if (r.isCorrect) e.correct++;
      tally.set(r.categoryId, e);
    }
    return [...tally.entries()]
      .map(([id, v]) => ({
        id,
        name: catName.get(id) ?? id.replace(/-/g, " "),
        correct: v.correct,
        total: v.total,
        accuracy: v.total ? percent(v.correct, v.total) : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy);
  });

  // Playful takeaways (US #14): weakest category (only meaningful across 2+),
  // and the question you hesitated longest on.
  const weakest = $derived.by(() => {
    if (categoryStats.length < 2) return null;
    return categoryStats.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
  });
  const longestHesitation = $derived.by(() => {
    if (!fd || fd.results.length === 0) return null;
    return fd.results.reduce((a, b) =>
      b.timeToAnswerMs > a.timeToAnswerMs ? b : a,
    );
  });

  // Achievement badges earned this run (flawless, focus, streak, …) —
  // server-computed and authoritative, so they match the stats tally (US #14,
  // #23, #24). Rarity is hybrid: derived from the run's conditions here.
  const badges = $derived(fd?.badges ?? []);
  /** BADGE_DISPLAY off: the card keeps its stats and drops the badges. */
  const showBadges = $derived(data.uiFlags.BADGE_DISPLAY === true);
  const badgeRarity = $derived((id: BadgeId): Rarity => {
    if (!fd) return "common";
    return computeBadgeRarity(id, {
      questionCount: fd.totalAnswered,
      timerSec: fd.timerDurationMs / 1000,
      difficulty: fd.difficulty,
    });
  });

  const avgTimeText = $derived(
    fd ? `${(fd.timeToAnswerAvgMs / 1000).toFixed(1)}s` : "—",
  );
</script>

<div class="flex flex-col gap-5 py-4">
  <CeremonyFrame
    kicker="Quiz results"
    title="The trial ends"
    subtitle="The oracle has spoken. See how you fared in the trial and try again to improve your score."
  >
    {#snippet aside()}
      <StatTile
        label="Score"
        value={s.finalData?.totalScore ?? s.score}
        tone="secondary"
      />
    {/snippet}

    <div class="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
      <div class="flex justify-center sm:justify-start">
        {#if s.avatarSrc}
          <div class="rounded-[1.6rem] corner-shape-squircle border border-primary/30 bg-primary/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <img
              src={s.avatarSrc}
              alt="Avatar"
              class="size-18"
              style="image-rendering: pixelated;"
            />
          </div>
        {/if}
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <StatTile label="Questions" value={s.finalData?.totalAnswered ?? s.results.length} tone="neutral" />
        <StatTile label="Correct" value={s.finalData?.correctCount ?? s.results.filter(r => r.correct).length} tone="success" />
        <StatTile
          label="Missed"
          value={(s.finalData?.totalAnswered ?? s.results.length) - (s.finalData?.correctCount ?? s.results.filter(r => r.correct).length)}
          tone="warning"
        />
      </div>
    </div>
  </CeremonyFrame>

  {#if fd && fd.results.length > 0}
    <CeremonyFrame kicker="Your performance" title={showBadges ? "Accolades" : "Time and accuracy"}>
      {#snippet aside()}
        <StatTile label="Best streak" value={fd.maxStreak} tone="flame" />
      {/snippet}

      <div class="flex flex-col gap-6 group">
        {#if showBadges && badges.length > 0}
          <p class="text-foreground-darker">
            Well done! You earned <span class="text-foreground font-bold">{badges.length} badge{badges.length > 1 ? "s" : ""}</span> for your performance in this trial.
          </p>
          <p class="text-foreground-darker">Rarity climbs as the trial gets harder: more questions, a shorter clock, and tougher difficulty each push it up.</p>
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap gap-2">
              {#each badges as badge (badge.id)}
                <EarnedBadge
                  id={badge.id}
                  detail={badge.detail}
                  rarity={badgeRarity(badge.id)}
                />
              {/each}
            </div>
            <RarityLegend id="solo-rarity-legend" />
          </div>
        {/if}

        <div class="grid gap-3 sm:grid-cols-2">
          <StatTile label="Avg. time" value={avgTimeText} tone="neutral" />
          <StatTile
            label="Accuracy"
            value={fd.totalAnswered > 0
              ? `${percent(fd.correctCount, fd.totalAnswered)}%`
              : "—"}
            tone="neutral"
          />
        </div>

        <!-- Per-category accuracy -->
        <div class="flex flex-col gap-4">
          <h3 class="text-lg font-bold">
            By category
          </h3>
          <ul class="flex flex-col gap-4">
            {#each categoryStats as cat (cat.id)}
              <li class="flex flex-col gap-2">
                <div class="flex items-baseline justify-between gap-4">
                  <span class="capitalize">{cat.name}</span>
                  <span class="font-mono tabular-nums font-bold text-foreground-darker">
                    {cat.correct} of {cat.total} · {cat.accuracy}%
                  </span>
                </div>
                <Progress
                  value={cat.accuracy}
                  label="{cat.name} accuracy"
                  class="h-2 bg-background"
                  barClass="bg-primary duration-500"
                />
              </li>
            {/each}
          </ul>
        </div>

        <!-- Playful takeaways (US #14) -->
        {#if weakest || longestHesitation}
          <div class="grid gap-4 sm:grid-cols-2">
            {#if longestHesitation}
              <div class="rounded-2xl bg-background px-4 py-3 flex flex-col gap-4">
                <p class="text-lg font-bold">
                  Longest deliberation
                </p>
                <div class="flex flex-col gap-2">
                  <p class="line-clamp-2 text-sm">{longestHesitation.questionText}</p>
                  <p class="text-sm text-foreground-darker">
                    You took <strong class="text-foreground">{(longestHesitation.timeToAnswerMs / 1000).toFixed(1)}s</strong> to answer this question.
                  </p>
                </div>
              </div>
            {/if}
            {#if weakest}
              <div class="rounded-2xl bg-background px-4 py-3 flex flex-col gap-4">
                <p class="text-lg font-bold">
                  Weakest category
                </p>
                <div class="flex flex-col gap-2">
                  <p class="line-clamp-2 text-sm capitalize">{weakest.name}</p>
                  <p class="text-sm text-foreground-darker">
                    You answered <strong class="text-foreground">{weakest.accuracy}%</strong> of questions in this category correctly.
                  </p>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </CeremonyFrame>
  {/if}

  <CeremonyFrame
    kicker="Your answers"
    title="Wisdom is shared"
  >
    <p class="text-foreground-darker">
      Your answers, question by question.
    </p>
    <div class="flex flex-col gap-3">
      {#each s.results as r, i}
        <div class="flex flex-col gap-2">
          <ResultCard
            index={i}
            text={r.text}
            correct={r.correct}
            selectedAnswer={r.selectedAnswer}
            correctAnswer={r.correctAnswer}
            mediaUrl={r.mediaUrl}
            postAnswerNote={r.postAnswerNote}
            source={r.source}
          />
          {#if !s.isGuest}
            <QuestionFlagFollowUp
              questionId={r.questionId}
              selectedAnswerText={r.selectedAnswer}
              alreadyFlagged={r.alreadyFlagged ?? false}
            />
          {/if}
        </div>
      {/each}
    </div>
  </CeremonyFrame>

  <div class="flex gap-2 flex-1">

    <!-- Leaderboard eligibility / conversion (US #16, #20) -->
    {#if s.isGuest}
      <SoloGuestCta
        headline="Your trial goes unrecorded"
        subline={soloPitch}
        leaderboards={data.uiFlags.SOLO_LEADERBOARDS === true}
        claimId={s.claimId}
      >
      {#snippet ternaryCta()}
        <Button type="button" variant="outline" onclick={() => s.playAgain()}>
          Play again
        </Button>
      {/snippet}
    </SoloGuestCta>
    {:else if fd?.isLeaderboardEligible && data.uiFlags.SOLO_LEADERBOARDS}
      <Card variant="success" padding="md" class="flex self-center flex-col gap-4 items-start relative isolate flex-1 overflow-hidden">
        <Icon name="horn-detail" class="size-40 text-success/25 absolute right-2 bottom-0 z-0" />
        <span class="flex items-start gap-2 text-xl text-success-light">
          <Icon name="horn" class="size-7 shrink-0" />
          Recorded on the leaderboard.
        </span>
        <div class="flex flex-col gap-2 items-start text-success-lighter">
          <p>
            Your score of <span class="font-semibold text-success-light">{fd?.totalScore}</span> is on the <Link href="/solo/leaderboard" class="font-serif text-success-light inline" intent="inline">
              leaderboard
            </Link>.
          </p>
        </div>
        <Button type="button" variant="primary" class="self-start" onclick={() => s.playAgain()}>
          Keep playing
        </Button>
      </Card>
    {:else if fd?.isStreakEligible && fd.maxStreak > 0 && data.uiFlags.SOLO_LEADERBOARDS}
      <Card variant="flame" padding="md" class="flex flex-col gap-4 items-start relative isolate flex-1 overflow-hidden">
        <Icon name="flame-detail" class="size-40 text-flame/25 absolute right-2 -bottom-1 z-0" />
        <span class="flex items-start gap-2 text-xl text-flame-light">
          <Icon name="flame" class="size-7 shrink-0" />
          Your streak was added to the leaderboard!
        </span>
        <div class="flex flex-col gap-2 items-start text-flame-lighter">
          <p>
            Congratulations! Your streak of <span class="font-semibold text-flame-light">{fd?.maxStreak}</span> has been recorded on the <Link href="/solo/leaderboard" class="font-serif text-flame-light inline" intent="inline">
              leaderboard
            </Link>
          </p>
        </div>
        <Button type="button" variant="primary" class="self-start" onclick={() => s.playAgain()}>
          Keep playing
        </Button>
      </Card>
    {:else}
      <!-- Nothing to celebrate on a board, but the page still needs a way
           onward — it is the end of a run, not a dead end. -->
      <Card variant="default" padding="md" class="flex flex-col gap-4 items-start flex-1">
        <p class="text-foreground-darker font-sans">Your trial is recorded.</p>
        <Button type="button" variant="primary" class="self-start" onclick={() => s.playAgain()}>
          Keep playing
        </Button>
      </Card>
    {/if}
  </div>
</div>
