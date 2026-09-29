<script lang="ts">
import { percent } from "@orakl/shared";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import StatTile from "$lib/components/ui/StatTile.svelte";
  import Progress from "$lib/components/ui/Progress.svelte";
  import CeremonyFrame from "$lib/components/results/CeremonyFrame.svelte";
  import ResultCard from "$lib/components/results/ResultCard.svelte";
  import QuestionFlagFollowUp from "$lib/components/results/QuestionFlagFollowUp.svelte";
  import EarnedBadge from "$lib/components/results/EarnedBadge.svelte";
  import RarityLegend from "$lib/components/ui/RarityLegend.svelte";
  
  import { formatDateShort } from "@/lib/format.js";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const alreadyFlagged = $derived(new Set(data.alreadyFlaggedIds));

  const accuracy = $derived(
    data.run.totalAnswered > 0
      ? `${percent(data.run.correctCount, data.run.totalAnswered)}%`
      : "—",
  );
  const avgTime = $derived(
    data.run.timeToAnswerAvgMs > 0
      ? `${(data.run.timeToAnswerAvgMs / 1000).toFixed(1)}s`
      : "—",
  );

  const showBadges = $derived(data.uiFlags.BADGE_DISPLAY === true);

  // Per-category accuracy, same shape as live solo results.
  const categoryStats = $derived(
    data.categoryStats
      .map((cat) => ({
        ...cat,
        accuracy: cat.total ? percent(cat.correct, cat.total) : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy),
  );

  // Playful takeaways, same as live solo results: weakest category (only
  // meaningful across 2+), and the question with the longest deliberation.
  const weakest = $derived.by(() => {
    if (categoryStats.length < 2) return null;
    return categoryStats.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
  });
  const longestHesitation = $derived.by(() => {
    const timed = data.review.filter((r) => r.timeToAnswerMs > 0);
    if (timed.length === 0) return null;
    return timed.reduce((a, b) => (b.timeToAnswerMs > a.timeToAnswerMs ? b : a));
  });

  function dateLabel(ts: number): string {
    return formatDateShort(ts);
  }
</script>

<Metatags title="Trial review" description="A past Trial of the Sphinx run." />

<h1 class="sr-only">Trial review</h1>

<div class="flex flex-col gap-5 py-4">
  <CeremonyFrame
    kicker="Trial review"
    title="The trial ends"
    subtitle="{dateLabel(data.run.completedAt)}{data.run.categories.length > 0 ? ` · ${data.run.categories.join(', ')}` : ''}"
  >
    {#snippet aside()}
      <StatTile label="Score" value={data.run.totalScore} tone="secondary" />
    {/snippet}

    {#if data.run.mode === "endless"}
      <Badge variant="status" tone="warning" class="inline-flex items-center gap-1 self-start">
        <Icon name="infinity" class="size-3" /> Endless
      </Badge>
    {/if}

    <div class="grid gap-3 sm:grid-cols-3">
      <StatTile label="Questions" value={data.run.totalAnswered} tone="neutral" />
      <StatTile label="Correct" value={data.run.correctCount} tone="success" />
      <StatTile
        label="Missed"
        value={data.run.totalAnswered - data.run.correctCount}
        tone="warning"
      />
    </div>
  </CeremonyFrame>

  <CeremonyFrame kicker="Your performance" title={showBadges ? "Accolades" : "Time and accuracy"}>
    {#snippet aside()}
      <StatTile label="Best streak" value={data.run.maxStreak} tone="flame" />
    {/snippet}

    <div class="flex flex-col gap-6 group">
      {#if showBadges && data.badges.length > 0}
        <h2 class="text-small font-sans font-bold uppercase tracking-widest text-foreground-darker">
          Badges earned
        </h2>
        <p class="text-foreground-darker">
          Well done! You earned <span class="text-foreground font-bold">{data.badges.length} badge{data.badges.length > 1 ? "s" : ""}</span> for your performance in this trial.
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2">
            {#each data.badges as badge (badge.id)}
              <EarnedBadge id={badge.id} rarity={badge.rarity} />
            {/each}
          </div>
          <RarityLegend id="trial-review-rarity-legend" />
        </div>
      {/if}

      <div class="grid gap-3 sm:grid-cols-2">
        <StatTile label="Avg. time" value={avgTime} tone="neutral" />
        <StatTile label="Accuracy" value={accuracy} tone="neutral" />
      </div>

      {#if categoryStats.length > 1}
        <div class="flex flex-col gap-4">
          <h3 class="text-lg font-bold">
            By category
          </h3>
          <ul class="flex flex-col gap-4">
            {#each categoryStats as cat (cat.categoryId)}
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
      {/if}

      {#if weakest || longestHesitation}
        <div class="grid gap-4 sm:grid-cols-2">
          {#if longestHesitation}
            <div class="rounded-2xl bg-background px-4 py-3 flex flex-col gap-4">
              <p class="text-lg font-bold">
                Longest deliberation
              </p>
              <div class="flex flex-col gap-2">
                <p class="line-clamp-2 text-sm">
                  {longestHesitation.questionText ?? `Question ${longestHesitation.questionPosition + 1}`}
                </p>
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

  <CeremonyFrame kicker="Your answers" title="Wisdom is shared">
    {#if data.review.length > 0}
      <div class="flex flex-col gap-4">
        {#each data.review as q (q.questionPosition)}
          <div class="flex flex-col gap-2">
            <ResultCard
              index={q.questionPosition}
              text={q.questionText ?? `Question ${q.questionPosition + 1}`}
              correct={q.isCorrect}
              selectedAnswer={q.selectedAnswerText}
              correctAnswer={q.correctAnswerText ?? "—"}
              mediaUrl={q.mediaUrl ?? undefined}
              postAnswerNote={q.postAnswerNote ?? undefined}
              source={q.source ?? undefined}
            />
            {#if q.questionId}
              <QuestionFlagFollowUp
                questionId={q.questionId}
                selectedAnswerText={q.selectedAnswerText}
                alreadyFlagged={alreadyFlagged.has(q.questionId)}
              />
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-sm text-foreground-darker">
        No per-question detail was recorded for this run.
      </p>
    {/if}
  </CeremonyFrame>
</div>
