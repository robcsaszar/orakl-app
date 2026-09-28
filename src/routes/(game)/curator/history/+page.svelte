<script lang="ts">
import { toIsoTimestamp } from "@orakl/shared";
  import type { PageData } from "./$types";
  import Button from "$lib/components/ui/Button.svelte";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import HistoryRow from "$lib/components/history/HistoryRow.svelte";
  import { toast } from "@/lib/toast.js";
  import { formatDateShort } from "@/lib/format.js";

  let { data }: { data: PageData } = $props();

  // Writable deriveds: loadMore appends locally; reset to server truth when
  // `data` refreshes.
  let entries = $derived(data.entries);
  let nextCursor = $derived<string | null>(data.nextCursor);
  let loading = $state(false);

  function formatDate(iso: string): string {
    return formatDateShort(toIsoTimestamp(iso));
  }

  function winnerLabel(winners: string[]): string {
    if (winners.length === 0) return "No results";
    return winners.length === 1 ? `Winner: ${winners[0]}` : `Winners: ${winners.join(", ")}`;
  }

  function metaLabel(entry: (typeof entries)[number]): string {
    const parts = [
      formatDate(entry.started_at),
      `${entry.player_count} ${entry.player_count === 1 ? "player" : "players"}`,
      `${entry.total_questions} ${entry.total_questions === 1 ? "question" : "questions"}`,
    ];
    if (entry.top_score !== null) parts.push(`top ${entry.top_score}`);
    return parts.join(" · ");
  }

  async function loadMore() {
    if (!nextCursor || loading) return;
    loading = true;
    try {
      const res = await fetch(
        `/api/curator/history?cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = (await res.json()) as {
        entries: typeof entries;
        nextCursor: string | null;
      };
      entries = [...entries, ...page.entries];
      nextCursor = page.nextCursor;
    } catch {
      toast.error("Could not load more history");
    } finally {
      loading = false;
    }
  }
</script>

<Metatags title="History" description="Past games you've hosted, with winners and top scores." />

<div class="flex flex-col gap-6">
  <h1 class="text-2xl font-semibold">History</h1>

  {#if entries.length === 0}
    <p class="text-foreground-darker font-sans">No games recorded yet. Completed games will appear here.</p>
  {:else}
    <div class="flex flex-col gap-3">
      {#each entries as entry (entry.id)}
        <HistoryRow
          title={entry.quiz_name}
          trailing={winnerLabel(entry.winners)}
          meta={metaLabel(entry)}
          href="/curator/history/{entry.id}"
          linkLabel="View results"
          ariaLabel="View results for {entry.quiz_name}"
        />
      {/each}
    </div>

    {#if nextCursor}
      <div class="flex justify-center">
        <Button variant="outline" intent="compact" onclick={loadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </Button>
      </div>
    {/if}
  {/if}
</div>
