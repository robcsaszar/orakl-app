<script lang="ts">
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { authorLabel } from "@orakl/shared";
  import { toast } from "@/lib/toast.js";
  import type {
    AuthoredQuestionRow,
    PublishManyResult,
  } from "@orakl/protocol";

  let {
    rows,
    open,
    onClose,
    onDone,
  }: {
    rows: AuthoredQuestionRow[];
    open: boolean;
    onClose: () => void;
    onDone: (results: PublishManyResult[]) => void;
  } = $props();

  let submitting = $state(false);

  // Grouped by author so the operator sees who wrote what, not just a count.
  const groups = $derived.by(() => {
    const byAuthor = new Map<
      string,
      { id: string; label: string; rows: AuthoredQuestionRow[] }
    >();
    for (const row of rows) {
      const key = row.created_by ?? "";
      const g = byAuthor.get(key);
      if (g) g.rows.push(row);
      else
        byAuthor.set(key, {
          id: key,
          label: authorLabel({
            id: row.created_by,
            nickname: row.author_nickname,
            email: row.author_email,
          }),
          rows: [row],
        });
    }
    return [...byAuthor.values()];
  });

  async function confirm() {
    if (submitting || rows.length === 0) return;
    submitting = true;
    try {
      const res = await fetch("/api/manage/questions/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: rows.map((r) => r.id) }),
      });
      const data = (await res.json()) as {
        results?: PublishManyResult[];
        error?: string;
      };
      if (!res.ok || !data.results) {
        toast.error(data.error ?? "Failed to promote questions");
        return;
      }
      onDone(data.results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to promote questions");
    } finally {
      submitting = false;
    }
  }
</script>

<ResponsiveOverlay
  id="bulk-promote-dialog"
  {open}
  hasTitle={true}
  panelClass="lg:max-w-[32rem]"
  bodyClass="flex flex-col gap-4"
  onClose={onClose}
>
  {#snippet title()}
    Promote {rows.length} {rows.length === 1 ? "question" : "questions"}?
  {/snippet}

  <div class="flex max-h-80 flex-col gap-3 overflow-y-auto">
    {#each groups as g (g.id)}
      <div>
        <p class="text-xs font-semibold text-foreground-darker">{g.label}</p>
        <ul class="mt-1 flex flex-col gap-1">
          {#each g.rows as row (row.id)}
            <li class="truncate text-sm" title={row.label}>{row.label}</li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="outline" intent="compact" onclick={onClose}>Cancel</Button>
      <Button variant="primary" intent="compact" disabled={submitting} onclick={confirm}>
        {submitting ? "Promoting…" : "Promote"}
      </Button>
    </div>
  {/snippet}
</ResponsiveOverlay>
