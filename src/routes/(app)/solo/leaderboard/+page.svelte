<script lang="ts">
import { percent } from "@orakl/shared";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import SegmentedPicker from "$lib/components/ui/SegmentedPicker.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  
  import SoloGuestCta from "../SoloGuestCta.svelte";
  import { getSoloSession } from "@/lib/svelte/soloSession.svelte.js";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const s = getSoloSession();
  const claimed = $derived(page.url.searchParams.get("claimed") === "1");

  // Board metadata: label, the metric column header, and how to render the
  // metric for a row. Keeps the table generic across all five boards.
  const BOARDS = [
    { id: "score", label: "Scores", icon: "" },
    { id: "streak", label: "Streaks", icon: "flame" },
    { id: "accuracy", label: "Accuracy", icon: "" },
    { id: "speed", label: "Speed", icon: "hourglass" },
    { id: "survival", label: "Survival", icon: "shield" },
  ] as const;
  const SCOPES = [
    { id: "all-time", label: "All-time" },
    { id: "daily", label: "Today" },
    { id: "weekly", label: "This week" },
    { id: "monthly", label: "This month" },
  ] as const;
  const DIFFICULTIES = [
    { id: "easy", label: "Easy" },
    { id: "medium", label: "Medium" },
    { id: "hard", label: "Hard" },
  ] as const;

  const metricLabel = $derived(
    {
      score: "Score",
      streak: "Streak",
      accuracy: "Accuracy",
      speed: "Avg. time",
      survival: "Survived",
    }[data.board],
  );

  function accuracy(e: { correct_count: number; total_answered: number }): string {
    return e.total_answered > 0
      ? `${percent(e.correct_count, e.total_answered)}%`
      : "—";
  }
  function avgTime(e: { time_to_answer_avg_ms: number }): string {
    return e.time_to_answer_avg_ms > 0
      ? `${(e.time_to_answer_avg_ms / 1000).toFixed(1)}s`
      : "—";
  }
  function metric(e: PageData["entries"][number]): string {
    switch (data.board) {
      case "streak":
        return String(e.max_streak);
      case "accuracy":
        return accuracy(e);
      case "speed":
        return avgTime(e);
      case "survival":
        return String(e.total_answered);
      default:
        return String(e.total_score);
    }
  }

  onMount(() => {
    // The run was just linked server-side; drop the stale persisted copy.
    if (claimed) s.clearPersisted();
  });

  function buildUrl(opts: {
    board?: string;
    scope?: string;
    categoryId?: string | null;
    difficulty?: string | null;
    around?: boolean;
  }): string {
    const board = opts.board ?? data.board;
    const scope = opts.scope ?? data.scope;
    const categoryId =
      opts.categoryId === undefined ? data.categoryId : opts.categoryId;
    const difficulty =
      opts.difficulty === undefined ? data.difficulty : opts.difficulty;
    const around = opts.around ?? data.around;
    const sp = new URLSearchParams();
    if (board && board !== "score") sp.set("board", board);
    if (scope && scope !== "all-time") sp.set("scope", scope);
    if (categoryId && board !== "survival") sp.set("categoryId", categoryId);
    if (difficulty) sp.set("difficulty", difficulty);
    if (around) sp.set("around", "1");
    const q = sp.toString();
    return `/solo/leaderboard${q ? `?${q}` : ""}`;
  }

  const difficultyOptions = [{ id: null, label: "Any" }, ...DIFFICULTIES] as {
    id: (typeof DIFFICULTIES)[number]["id"] | null;
    label: string;
  }[];

  function onCategoryChange(e: Event) {
    const value = (e.currentTarget as HTMLSelectElement).value;
    goto(buildUrl({ categoryId: value || null }));
  }

  // Carry the active filters so the shared card's rank matches what's on screen.
  const shareUrl = $derived.by(() => {
    const sp = new URLSearchParams({ board: data.board, scope: data.scope });
    if (data.difficulty) sp.set("difficulty", data.difficulty);
    if (data.categoryId && data.board !== "survival")
      sp.set("categoryId", data.categoryId);
    return `/solo/leaderboard/card?${sp.toString()}`;
  });
</script>

<Metatags
  title="Oracle rankings"
  description="The Trial of the Sphinx leaderboards — scores, streaks, accuracy, speed and survival."
/>

<div class="flex flex-col gap-6">
  {#if claimed}
    <Card variant="success" padding="md" class="flex flex-row items-center gap-2 text-sm text-success-light">
      <Icon name="wreath" class="size-5 shrink-0" />
      Your run is saved and now stands on the rankings.
    </Card>
  {/if}

  <div class="flex flex-wrap items-start justify-between gap-2">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold">Oracle rankings</h1>
      <p class="text-sm text-foreground-darker">
        {SCOPES.find((x) => x.id === data.scope)?.label}
        {BOARDS.find((x) => x.id === data.board)?.label.toLowerCase()} from completed
        trials.
      </p>
    </div>
    {#if !s.isGuest}
      <div class="flex items-center gap-3">
        {#if data.userRank}
          <Link href={shareUrl} class="flex items-center gap-1 text-sm">
            <Icon name="top-right" class="size-4" /> Share rank
          </Link>
        {/if}
        {#if data.uiFlags.PLAYER_HISTORY}
          <Link href="/history" class="text-sm">Your history</Link>
        {/if}
      </div>
    {/if}
  </div>

  {#if s.isGuest && s.claimId}
    <SoloGuestCta
      leaderboards={data.uiFlags.SOLO_LEADERBOARDS === true}
      headline="You just played as a guest"
      subline="Sign in to save that run and claim your place here."
      claimId={s.claimId}
    />
  {/if}

  <!-- Your standing: shown when ranked, with percentile (LB-4 / LB-13). -->
  {#if !s.isGuest && data.userRank}
    <Card padding="md" class="flex flex-row flex-wrap items-center justify-between gap-2 text-sm">
      <span class="text-foreground-darker">
        Your rank: <span class="font-bold text-foreground">#{data.userRank}</span>
        {#if data.percentile}
          <span class="text-foreground-darker"> · top {data.percentile}%</span>
        {/if}
        of {data.eligibleCount}
      </span>
      <Link
        href={buildUrl({ around: !data.around })}
        samePageHint={false}
        showCurrent={false}
        class="text-sm"
      >
        {data.around ? "Show top of board" : "Show players around me"}
      </Link>
    </Card>
  {/if}

  <div class="flex flex-col gap-3">
    <!-- Board -->
    <SegmentedPicker
      variant="pill"
      label="Leaderboard type"
      options={BOARDS}
      optionKey={(b) => b.id}
      selectedKey={data.board}
      hrefFor={(b) => buildUrl({ board: b.id })}
    >
      {#snippet option(b)}
        {#if b.icon}<Icon name={b.icon} class="size-4" />{/if}
        {b.label}
      {/snippet}
    </SegmentedPicker>

    <!-- Scope + difficulty + category -->
    <div class="flex flex-wrap items-center gap-3">
      <SegmentedPicker
        variant="pill"
        label="Time range"
        options={SCOPES}
        optionKey={(sc) => sc.id}
        selectedKey={data.scope}
        hrefFor={(sc) => buildUrl({ scope: sc.id })}
      >
        {#snippet option(sc)}{sc.label}{/snippet}
      </SegmentedPicker>

      <SegmentedPicker
        variant="pill"
        label="Difficulty"
        options={difficultyOptions}
        optionKey={(d) => d.id ?? "any"}
        selectedKey={data.difficulty ?? "any"}
        hrefFor={(d) => buildUrl({ difficulty: d.id })}
      >
        {#snippet option(d)}{d.label}{/snippet}
      </SegmentedPicker>

      {#if data.board !== "survival"}
        <div class="ml-auto">
          <Select
            id="leaderboard-category"
            label="Filter by category"
            hideLabel
            name="category"
            size="compact"
            value={data.categoryId ?? ""}
            onchange={onCategoryChange}
          >
            <option value="">All categories</option>
            {#each data.categories as cat (cat.id)}
              <option value={cat.id}>{cat.name}</option>
            {/each}
          </Select>
        </div>
      {/if}
    </div>
  </div>

  {#if data.entries.length === 0}
    <p class="text-sm text-foreground-darker">
      No completed trials yet. Be the first to seal your name.
    </p>
  {:else}
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-white/10 text-left text-foreground-darker">
          <th class="pb-2 pr-4">#</th>
          <th class="pb-2 pr-4">Name</th>
          <th class="pb-2 pr-4 text-right">{metricLabel}</th>
          <th class="pb-2 pr-4 text-right">Accuracy</th>
          <th class="pb-2 text-right">Avg. time</th>
        </tr>
      </thead>
      <tbody>
        {#each data.entries as entry (entry.user_id)}
          <tr
            class="border-b border-white/5 hover:bg-white/5 {entry.user_id ===
            data.viewerId
              ? 'bg-primary/10'
              : ''}"
          >
            <td class="py-2 pr-4 text-foreground-darker">{entry.rank}</td>
            <td class="py-2 pr-4 font-medium">{entry.nickname}</td>
            <td class="py-2 pr-4 text-right font-mono tabular-nums">
              {#if data.board === "streak"}
                <span class="inline-flex items-center justify-end gap-1 text-flame">
                  <Icon name="flame" class="size-4" />{entry.max_streak}
                </span>
              {:else}
                {metric(entry)}
              {/if}
            </td>
            <td class="py-2 pr-4 text-right text-foreground-darker tabular-nums">
              {accuracy(entry)}
            </td>
            <td class="py-2 text-right text-foreground-darker tabular-nums">
              {avgTime(entry)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
