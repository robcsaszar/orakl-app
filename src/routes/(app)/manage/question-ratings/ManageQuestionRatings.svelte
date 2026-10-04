<script lang="ts">
  import {
    tableFeatures,
    rowSortingFeature,
    rowPaginationFeature,
    renderSnippet,
    type ColumnDef,
  } from "@svgrid/grid";
  import DataGrid from "$lib/components/ui/DataGrid.svelte";
  import QuestionForm from "$lib/components/questions/QuestionForm.svelte";
  import type {
    QuestionFormCategory,
    QuestionFormQuestion,
  } from "$lib/components/questions/question-form.js";
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import { toast } from "@/lib/toast.js";
  import type { QuestionRatingRow } from "@orakl/protocol";

  const PAGE_SIZE = 20;

  let {
    initial,
    initialHasMore,
    initialPage,
    canPublish,
  }: {
    initial: QuestionRatingRow[];
    /** Whether a page beyond the first exists, as the server counted it. */
    initialHasMore: boolean;
    /** 1-indexed page the server loaded, from ?page=. */
    initialPage: number;
    /** Holds can-publish-questions: rows offer Edit and Delete. */
    canPublish: boolean;
  } = $props();

  // Writable deriveds: fetches reassign locally; reset to server truth when
  // the props refresh.
  let rows = $derived<QuestionRatingRow[]>(initial);
  let page = $derived<number>(initialPage);
  let hasMore = $derived(initialHasMore);
  let loading = $state(false);

  let reqToken = 0;
  async function loadPage(targetPage: number) {
    const token = ++reqToken;
    loading = true;
    try {
      const params = new URLSearchParams({ page: String(targetPage) });
      const res = await fetch(`/api/manage/question-ratings?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        rows: QuestionRatingRow[];
        hasMore: boolean;
      };
      if (token !== reqToken) return; // stale response — newer request in flight
      rows = data.rows;
      hasMore = data.hasMore;
      page = targetPage;
    } catch {
      if (token === reqToken)
        toast.error("Failed to load question ratings.");
    } finally {
      if (token === reqToken) loading = false;
    }
  }

  function goToPage(p: number) {
    if (p < 1 || loading) return;
    loadPage(p);
  }

  function sourceLabel(row: QuestionRatingRow): string {
    return `${row.source === "built-in" ? "Built-in" : "Promoted"} · ${row.category}`;
  }

  let editCategories = $state<QuestionFormCategory[]>([]);
  let editing = $state<QuestionFormQuestion | null>(null);

  /** Saves the form's payload and patches the edited row: since-edit counts restart, all-time stays. */
  async function saveQuestion(payload: Record<string, unknown>): Promise<boolean> {
    const id = editing?.id;
    if (!id) return false;
    try {
      const res = await fetch(`/api/manage/question-ratings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Failed to save question.");
        return false;
      }
      const category = editCategories.find((c) => c.id === payload.categoryId);
      rows = rows.map((r) =>
        r.id === id
          ? {
              ...r,
              excerpt: String(payload.questionText),
              category: category?.name ?? r.category,
              down: 0,
              up: 0,
              edited: true,
            }
          : r,
      );
      toast.success("Question saved.");
      editing = null;
      return true;
    } catch {
      toast.error("Network error. Try again.");
      return false;
    }
  }

  // Ids whose DELETE is in flight; a repeat confirm on any of them is ignored.
  const deleting = new Set<string>();

  /** Deletes the question for good, then reloads the current page; an emptied page falls back one page. */
  async function deleteQuestion(row: QuestionRatingRow) {
    if (deleting.has(row.id)) return;
    deleting.add(row.id);
    try {
      const res = await fetch(`/api/manage/question-ratings/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Failed to delete question.");
        return;
      }
      toast.success("Question deleted.");
      await loadPage(page);
      if (rows.length === 0 && page > 1) await loadPage(page - 1);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      deleting.delete(row.id);
    }
  }

  async function startEdit(row: QuestionRatingRow) {
    try {
      const res = await fetch(`/api/manage/question-ratings/${row.id}`);
      const data = (await res.json().catch(() => ({}))) as {
        question?: QuestionFormQuestion;
        categories?: QuestionFormCategory[];
        error?: string;
      };
      if (!res.ok || !data.question) {
        toast.error(data.error ?? "Could not load question.");
        return;
      }
      editCategories = data.categories ?? [];
      editing = data.question;
    } catch {
      toast.error("Network error. Try again.");
    }
  }

  const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });

  function buildColumns(): ColumnDef<typeof features, QuestionRatingRow>[] {
    const columns: ColumnDef<typeof features, QuestionRatingRow>[] = [
      {
        id: "question",
        header: "Question",
        width: 185,
        fieldFn: (row) => row.excerpt,
        cell: (ctx) => renderSnippet(QuestionCell, { row: ctx.row.original }),
        enableSorting: false,
      },
      {
        field: "down",
        header: "Bad question",
        width: 140,
        cell: (ctx) =>
          renderSnippet(RatingCell, {
            value: ctx.row.original.down,
            allTime: ctx.row.original.downAllTime,
            edited: ctx.row.original.edited,
          }),
      },
      {
        field: "up",
        header: "Good question",
        width: 155,
        cell: (ctx) =>
          renderSnippet(RatingCell, {
            value: ctx.row.original.up,
            allTime: ctx.row.original.upAllTime,
            edited: ctx.row.original.edited,
          }),
      },
      {
        field: "openFlags",
        header: "Flags",
        width: 80,
        cell: (ctx) => renderSnippet(CountCell, { value: Number(ctx.getValue()) }),
      },
    ];
    if (canPublish) {
      columns.push({
        id: "actions",
        header: "Actions",
        width: 230,
        fieldFn: (row) => row.id,
        cell: (ctx) => renderSnippet(RowActions, { row: ctx.row.original }),
        enableSorting: false,
      });
    }
    return columns;
  }
  const columns = buildColumns();
</script>

{#snippet QuestionCell(p: { row: QuestionRatingRow })}
  <span class="flex flex-col gap-0.5">
    <span class="line-clamp-2 whitespace-normal text-sm">{p.row.excerpt}</span>
    <span class="text-xs text-foreground-darker">{sourceLabel(p.row)}</span>
  </span>
{/snippet}

{#snippet RatingCell(p: { value: number; allTime: number; edited: boolean })}
  <span class="flex flex-col">
    <span class="font-mono text-xs tabular-nums">{p.value}</span>
    {#if p.edited}
      <span class="text-xs text-foreground-darker">{p.allTime} all time</span>
    {/if}
  </span>
{/snippet}

{#snippet EditButton(p: { row: QuestionRatingRow })}
  <Button variant="secondary" intent="compact" aria-label="Edit question" onclick={() => startEdit(p.row)}>
    Edit
  </Button>
{/snippet}

{#snippet RowActions(p: { row: QuestionRatingRow })}
  <span class="flex items-center gap-2">
    {@render EditButton(p)}
    <ConfirmButton
      label="Delete"
      ariaLabel="Delete question"
      confirmLabel="Delete question?"
      confirmAriaLabel="Click again to delete this question"
      variant="danger"
      progressStyle="border"
      class="px-3 py-1.5 text-sm leading-none"
      onConfirm={() => deleteQuestion(p.row)}
    >
      {#snippet icon()}
        <Icon name="x" class="size-4" />
      {/snippet}
    </ConfirmButton>
  </span>
{/snippet}

{#snippet CountCell(p: { value: number })}
  <span class="font-mono text-xs tabular-nums text-foreground-darker">{p.value}</span>
{/snippet}

<div>
  <h1 class="mb-4 text-lg font-semibold">Question ratings</h1>
  <DataGrid
    data={rows}
    {columns}
    {features}
    getRowId={(row) => row.id}
    label="Question ratings"
    {page}
    pageSize={PAGE_SIZE}
    {hasMore}
    busy={loading}
    onPageChange={goToPage}
    empty="No ratings yet."
    svgrid={{
      columnVirtualization: false,
      filterMode: "none",
      showGroupingControls: false,
      enableInlineEditing: false,
      enableCellSelection: false,
      enableRowSummaries: false,
      showRowSelection: false,
      selectionMode: "none",
      ...(canPublish ? { initialColumnPinning: { right: ["actions"] } } : {}),
    }}
  >
    {#snippet card({ row })}
      <p class="line-clamp-2 text-sm">{row.excerpt}</p>
      <span class="text-xs text-foreground-darker">{sourceLabel(row)}</span>
      <span class="flex flex-wrap items-start gap-4">
        <span class="flex items-start gap-1">
          <span role="img" aria-label="Thumbs down"><Icon name="thumb-down" class="size-4" /></span>
          {@render RatingCell({ value: row.down, allTime: row.downAllTime, edited: row.edited })}
        </span>
        <span class="flex items-start gap-1">
          <span role="img" aria-label="Thumbs up"><Icon name="thumb-up" class="size-4" /></span>
          {@render RatingCell({ value: row.up, allTime: row.upAllTime, edited: row.edited })}
        </span>
        <span class="font-mono text-xs tabular-nums text-foreground-darker">
          {row.openFlags} {row.openFlags === 1 ? "flag" : "flags"}
        </span>
      </span>
      {#if canPublish}
        <span class="self-start">{@render RowActions({ row })}</span>
      {/if}
    {/snippet}
    {#snippet cardDetails({ row })}
      <span class="text-xs text-foreground-darker">{row.excerpt}</span>
    {/snippet}
  </DataGrid>
</div>

<ResponsiveOverlay id="edit-question-dialog" open={editing !== null} hasTitle={true} onClose={() => (editing = null)}>
  {#snippet title()}Edit question{/snippet}
  <QuestionForm
    categories={editCategories}
    question={editing}
    showHeading={false}
    onsubmit={saveQuestion}
    oncancel={() => (editing = null)}
  />
</ResponsiveOverlay>
