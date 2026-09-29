<script lang="ts">
import { BADGE_ORDER, percent, toIsoTimestamp } from "@orakl/shared";
import type { Rarity } from "@orakl/shared";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import StatTile from "$lib/components/ui/StatTile.svelte";
  import Tabs from "$lib/components/ui/Tabs.svelte";
  import HistoryRow from "$lib/components/history/HistoryRow.svelte";
  import EarnedBadge from "$lib/components/results/EarnedBadge.svelte";
  import RarityLegend from "$lib/components/ui/RarityLegend.svelte";
  import SegmentedPicker from "$lib/components/ui/SegmentedPicker.svelte";
  import { goto, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  
  import { toast } from "@/lib/toast.js";
  import { formatDateShort } from "@/lib/format.js";
  
  import SoloSparkline from "./SoloSparkline.svelte";
  import { parseHistoryTab, type HistoryTab } from "./tabs";
  import { HISTORY_RANGES, type HistoryRange } from "./range";
  
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Writable deriveds: loadMore appends locally; reset to server truth when
  // `data` refreshes (curator history's pattern).
  let runs = $derived(data.runs);
  let runsNextCursor = $derived<string | null>(data.runsNextCursor);
  let runsLoading = $state(false);
  let games = $derived(data.games);
  let gamesNextCursor = $derived<string | null>(data.gamesNextCursor);
  let gamesLoading = $state(false);

  async function loadMoreRuns() {
    if (!runsNextCursor || runsLoading) return;
    runsLoading = true;
    const source = data;
    try {
      const res = await fetch(
        `/api/history/solo?cursor=${encodeURIComponent(runsNextCursor)}&range=${data.range}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = (await res.json()) as {
        entries: typeof runs;
        nextCursor: string | null;
      };
      // A reload mid-fetch (range change) reset the list; drop this page.
      if (source !== data) return;
      runs = [...runs, ...page.entries];
      runsNextCursor = page.nextCursor;
    } catch {
      toast.error("Could not load more trials");
    } finally {
      runsLoading = false;
    }
  }

  async function loadMoreGames() {
    if (!gamesNextCursor || gamesLoading) return;
    gamesLoading = true;
    const source = data;
    try {
      const res = await fetch(
        `/api/history/games?cursor=${encodeURIComponent(gamesNextCursor)}&range=${data.range}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = (await res.json()) as {
        entries: typeof games;
        nextCursor: string | null;
      };
      if (source !== data) return;
      games = [...games, ...page.entries];
      gamesNextCursor = page.nextCursor;
    } catch {
      toast.error("Could not load more games");
    } finally {
      gamesLoading = false;
    }
  }

  const tabs = [
    { key: "solo", label: "Solo" },
    { key: "multiplayer", label: "Multiplayer" },
  ] as const;

  // Default tab = the mode with the most recent play (US #2): the newest
  // solo completion vs the newest game start, normalised to the same clock.
  const recentTab = $derived.by((): HistoryTab => {
    const latestRun = data.latestRunAt;
    const latestGame = data.latestGameAt
      ? new Date(toIsoTimestamp(data.latestGameAt)).getTime()
      : null;
    if (latestGame === null) return "solo";
    if (latestRun === null) return "multiplayer";
    return latestGame > latestRun ? "multiplayer" : "solo";
  });

  const urlTab = $derived(parseHistoryTab(page.url.searchParams.get("tab")));

  // A click wins for the page's life; else the URL, else recency.
  let chosenTab = $state<HistoryTab | null>(null);
  const selectedTab: HistoryTab = $derived(chosenTab ?? urlTab ?? recentTab);

  // Shallow: the URL carries the tab for reload and deep links, but no load
  // rerun (profile's pattern).
  function selectTab(key: string) {
    chosenTab = key as HistoryTab;
    const url = new URL(page.url);
    url.searchParams.set("tab", key);
    replaceState(url, page.state);
  }

  const RANGE_LABELS: Record<HistoryRange, string> = {
    all: "All",
    "30d": "30 days",
    "7d": "7 days",
  };

  // Unlike selectTab, this reruns the loader so both lists refetch under the
  // new floor — built from location.href, since replaceState doesn't update
  // page.url (background CAUTION).
  function selectRange(range: HistoryRange) {
    const url = new URL(location.href);
    url.searchParams.set("range", range);
    url.searchParams.set("tab", selectedTab);
    goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
  }

  // Earned badges with counts + best rarity, in display order (US #14). One
  // tally across solo and multiplayer — how many times each honour was claimed.
  const earnedBadges = $derived(
    BADGE_ORDER.map((id) => ({ id, ...data.badgeTally[id] })).filter(
      (b): b is { id: (typeof BADGE_ORDER)[number]; count: number; bestRarity: Rarity } =>
        b.count !== undefined && b.count > 0,
    ),
  );

  // Accuracy across runs, oldest → newest, for the trend line (US #13).
  const trend = $derived(
    [...data.trendRuns]
      .reverse()
      .filter((r) => r.total_answered > 0)
      .map((r) => percent(r.correct_count, r.total_answered)),
  );

  const accuracy = $derived(
    data.stats.total_answered > 0
      ? `${percent(data.stats.total_correct, data.stats.total_answered)}%`
      : "—",
  );

  function dateLabel(ts: number | string): string {
    // game_sessions stamps SQLite datetime('now') strings ("YYYY-MM-DD
    // HH:MM:SS", UTC) — not ISO, so Safari rejects them and V8 reads them as
    // local time. Normalise to ISO-UTC before parsing; solo rows pass epoch ms.
    const value = typeof ts === "string" ? toIsoTimestamp(ts) : ts;
    return formatDateShort(value);
  }

  function categories(json: string): string {
    try {
      const ids = JSON.parse(json) as string[];
      const names = ids.map((id) => data.categoryName[id] ?? id);
      return names.join(", ");
    } catch {
      return "";
    }
  }

  // Lifetime focus + speed from the per-question attempt log (STATS-3).
  const focusRate = $derived(
    data.attemptStats.attempts > 0
      ? `${percent(data.attemptStats.focusRate)}%`
      : "—",
  );
  const fastest = $derived(
    data.attemptStats.fastestCorrectMs === null
      ? "—"
      : `${(data.attemptStats.fastestCorrectMs / 1000).toFixed(1)}s`,
  );

  const historyDescription = $derived(
    data.uiFlags.BADGE_DISPLAY === true
      ? "Your solo and multiplayer record, badges and personal bests."
      : "Your solo and multiplayer record and personal bests.",
  );

  function masteryPerc(
    m: { categoryId: string; correct: number; total: number } | null,
  ): string {
    if (!m) return "—";
    return `${percent(m.correct, m.total)}%`;
  }
</script>

{#snippet rangeOption(range: HistoryRange)}
  {RANGE_LABELS[range]}
{/snippet}

<Metatags
  title="Your history"
  description={historyDescription}
/>

<div class="flex flex-col gap-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-2xl font-semibold">Your history</h1>
    <p class="font-sans text-foreground-darker">
      Your record across solo trials and multiplayer quizzes.
    </p>
  </div>

  <!-- Unified badge tally: solo + multiplayer honours, above the tabs (US #4) -->
  {#if data.uiFlags.BADGE_DISPLAY === true && earnedBadges.length > 0}
    <div class="flex flex-col gap-4">
      <h2 class="text-small font-sans font-bold uppercase tracking-widest text-foreground-darker">
        Badges earned
      </h2>
      <div class="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
        {#each earnedBadges as badge (badge.id)}
          <EarnedBadge form="extended" id={badge.id} count={badge.count} rarity={badge.bestRarity} />
        {/each}
      </div>
      <p class="text-xs text-foreground-darker">
        Honours earned across solo and multiplayer: how many times you've claimed each, and the highest rarity you've reached.
      </p>
      <RarityLegend id="trials-rarity-legend" />
    </div>
  {/if}

  <Tabs
    {tabs}
    selected={selectedTab}
    onSelect={selectTab}
    label="History"
    panelClass="flex flex-col gap-3"
  >
    {#snippet panel(key)}
      {#if key === "solo"}
        {#if data.stats.runs === 0}
          <p class="text-sm text-foreground-darker">
            No trials recorded yet. <Link href="/solo/setup" intent="inline">Begin one</Link> to start your history.
          </p>
        {:else}
          <!-- Personal bests -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Runs" value={data.stats.runs} tone="neutral" />
            <StatTile label="Best score" value={data.stats.best_score} tone="secondary" />
            <StatTile label="Best streak" value={data.stats.best_streak} tone="success" />
            <StatTile label="Accuracy" value={accuracy} tone="neutral" />
          </div>

          <!-- Lifetime telemetry from the per-question log (STATS-3 / 9 / 12) -->
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Focus rate" value={focusRate} tone="neutral" />
            <StatTile label="Fastest answer" value={fastest} tone="secondary" />
            <StatTile label="Day streak" value={data.dayStreak} tone="success" />
          </div>
        {/if}

        {#if data.stats.runs > 0 && data.mastery.strongest}
          <div class="flex flex-col gap-1">
            <div class="flex items-start gap-2">
              <Icon name="star" class="mt-1" />
              <p class="text-foreground-darker">Your strongest category is <span class="text-foreground font-bold">{data.categoryName[data.mastery.strongest.categoryId] ?? data.mastery.strongest.categoryId}</span>, with <span class="text-foreground font-bold">{masteryPerc(data.mastery.strongest)}</span> accuracy.</p>
            </div>
            {#if data.mastery.weakest}
              <div class="flex items-start gap-2">
                <Icon name="candle" class="mt-1" />
                <p class="text-foreground-darker">Your weakest category is <span class="text-foreground font-bold">{data.categoryName[data.mastery.weakest.categoryId] ?? data.mastery.weakest.categoryId}</span>, with <span class="text-foreground font-bold">{masteryPerc(data.mastery.weakest)}</span> accuracy.</p>
              </div>
            {/if}
          </div>
        {/if}

        {#if trend.length >= 2}
          <div class="flex flex-col gap-2">
            <h3 class="text-small font-sans font-bold uppercase tracking-widest text-foreground-darker">
              Accuracy trend
            </h3>
            <div class="text-primary">
              <SoloSparkline values={trend} />
            </div>
            <p class="text-xs text-foreground-darker">
              Accuracy across your last {trend.length} trials, oldest to newest.
            </p>
          </div>
        {/if}

        {#if data.stats.runs > 0}
          <SegmentedPicker
            options={HISTORY_RANGES}
            selectedKey={data.range}
            onSelect={selectRange}
            label="Date range"
            variant="pill"
            option={rangeOption}
          />
        {/if}

        {#if runs.length === 0 && data.stats.runs > 0}
          <p class="text-sm text-foreground-darker">
            No trials in the last {RANGE_LABELS[data.range]}.
          </p>
        {/if}

        {#if runs.length > 0}
          <div class="flex flex-col gap-3">
            {#each runs as run (run.id)}
              {@const label = dateLabel(run.completed_at)}
              {@const cats = categories(run.category_ids)}
              <HistoryRow
                trailing={run.total_score}
                meta="{label} · {run.total_answered > 0
                  ? `${percent(run.correct_count, run.total_answered)}%`
                  : '—'} · streak {run.max_streak}"
                href="/history/solo/{run.id}"
                linkLabel="Review"
                ariaLabel="Review trial from {label}"
              >
                {#snippet title()}
                  <span class="capitalize">{cats || "Trial"}</span>
                  {#if run.mode === "endless"}
                    <Badge variant="status" tone="warning" class="inline-flex items-center gap-1">
                      <Icon name="infinity" class="size-3" /> Endless
                    </Badge>
                  {/if}
                {/snippet}
              </HistoryRow>
            {/each}
          </div>
          {#if runsNextCursor}
            <div class="flex justify-center">
              <Button variant="outline" intent="compact" onclick={loadMoreRuns} disabled={runsLoading}>
                {runsLoading ? "Loading…" : "Load more"}
              </Button>
            </div>
          {/if}
        {/if}
      {:else if key === "multiplayer"}
        {#if data.gameStats.games === 0}
          <p class="text-sm text-foreground-darker">
            No multiplayer quizzes recorded yet. <Link href="/join" intent="inline">Join one</Link> to see placements from nights you play signed in.
          </p>
        {:else}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Games" value={data.gameStats.games} tone="neutral" />
            <StatTile label="Wins" value={data.gameStats.wins} tone="secondary" />
            <StatTile label="Podiums" value={data.gameStats.podiums} tone="success" />
            <StatTile
              label="Best rank"
              value={data.gameStats.best_rank ? `#${data.gameStats.best_rank}` : "—"}
              tone="neutral"
            />
          </div>

          <SegmentedPicker
            options={HISTORY_RANGES}
            selectedKey={data.range}
            onSelect={selectRange}
            label="Date range"
            variant="pill"
            option={rangeOption}
          />

          {#if games.length === 0}
            <p class="text-sm text-foreground-darker">
              No games in the last {RANGE_LABELS[data.range]}.
            </p>
          {/if}

          <div class="flex flex-col gap-3">
            {#each games as game (game.id)}
              {@const label = dateLabel(game.started_at)}
              <HistoryRow
                title={game.quiz_name}
                trailing="#{game.rank} of {game.player_count}"
                meta="{label} · {game.final_score} pts{data.uiFlags.BADGE_DISPLAY === true
                  ? ` · ${game.badges.length} ${game.badges.length === 1 ? 'badge' : 'badges'}`
                  : ''}"
                href="/history/game/{game.id}"
                linkLabel="Review"
                ariaLabel="Review game from {label}"
              />
            {/each}
          </div>
          {#if gamesNextCursor}
            <div class="flex justify-center">
              <Button variant="outline" intent="compact" onclick={loadMoreGames} disabled={gamesLoading}>
                {gamesLoading ? "Loading…" : "Load more"}
              </Button>
            </div>
          {/if}
        {/if}
      {/if}
    {/snippet}
  </Tabs>
</div>
