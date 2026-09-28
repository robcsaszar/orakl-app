<script lang="ts">
  import {
    tableFeatures,
    rowSortingFeature,
    rowPaginationFeature,
    renderSnippet,
    type ColumnDef,
  } from "@svgrid/grid";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import SegmentedPicker from "$lib/components/ui/SegmentedPicker.svelte";
  import DataGrid from "$lib/components/ui/DataGrid.svelte";
  import { toast } from "@/lib/toast.js";
  import FlaggedQuestionModal from "./FlaggedQuestionModal.svelte";
  import type { AdminFlagRow, FlagStatus } from "@orakl/protocol";

  const PAGE_SIZE = 20;

  const STATUS_OPTIONS = [
    { id: "open", label: "Open" },
    { id: "resolved", label: "Resolved" },
    { id: "all", label: "All" },
  ] as const satisfies ReadonlyArray<{ id: FlagStatus | "all"; label: string }>;

  let {
    initial,
    initialHasMore,
    initialStatus = "open",
    initialPage,
  }: {
    initial: AdminFlagRow[];
    /** Whether a page beyond the first exists, as the server counted it. */
    initialHasMore: boolean;
    initialStatus: FlagStatus | "all";
    /** 1-indexed page the server loaded, from ?page=. */
    initialPage: number;
  } = $props();

  // Writable deriveds: fetch/optimistic updates reassign locally; reset to
  // server truth when the props refresh.
  let rows = $derived<AdminFlagRow[]>(initial);
  let statusFilter = $derived<FlagStatus | "all">(initialStatus);
  let page = $derived<number>(initialPage);
  let loading = $state(false);
  let hasMore = $derived(initialHasMore);

  let selectedQuestionId = $state<string | null>(null);

  let reqToken = 0;
  async function loadPage(targetPage: number, targetStatus: FlagStatus | "all" = statusFilter) {
    const token = ++reqToken;
    loading = true;
    try {
      const params = new URLSearchParams({
        status: targetStatus,
        page: String(targetPage),
      });
      const res = await fetch(`/api/manage/flagged-questions?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        rows: AdminFlagRow[];
        hasMore: boolean;
      };
      if (token !== reqToken) return; // stale response — newer request in flight
      rows = data.rows;
      hasMore = data.hasMore;
      page = targetPage;
      statusFilter = targetStatus;
    } catch (e) {
      if (token === reqToken)
        toast.error(e instanceof Error ? e.message : "Failed to load flagged questions");
    } finally {
      if (token === reqToken) loading = false;
    }
  }

  function setStatusFilter(next: FlagStatus | "all") {
    if (next === statusFilter || loading) return;
    loadPage(1, next);
  }

  function goToPage(p: number) {
    if (p < 1 || loading) return;
    loadPage(p);
  }

  function openDetails(row: AdminFlagRow) {
    selectedQuestionId = row.questionId;
  }

  function closeDetails() {
    selectedQuestionId = null;
  }

  function handleResolved(questionId: string) {
    if (statusFilter === "open") {
      rows = rows.filter((r) => r.questionId !== questionId);
    } else {
      rows = rows.map((r) => (r.questionId === questionId ? { ...r, status: "resolved" } : r));
    }
  }

  const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });

  function buildColumns(): ColumnDef<typeof features, AdminFlagRow>[] {
    return [
      {
        id: "questionId",
        header: "Question",
        width: 110,
        fieldFn: (row) => row.questionId,
        cell: (ctx) => renderSnippet(IdCell, { value: String(ctx.getValue()) }),
      },
      {
        field: "excerpt",
        header: "Excerpt",
        width: 260,
        cell: (ctx) => renderSnippet(MutedCell, { value: String(ctx.getValue()) }),
        enableSorting: false,
      },
      {
        field: "categoryId",
        header: "Category",
        width: 140,
        cell: (ctx) => renderSnippet(MutedCell, { value: String(ctx.getValue()) }),
      },
      {
        field: "flagCount",
        header: "Flags",
        width: 80,
        editorType: "number",
        cell: (ctx) => renderSnippet(CountCell, { value: Number(ctx.getValue()) }),
      },
      {
        field: "status",
        header: "Status",
        width: 100,
        cell: (ctx) => renderSnippet(StatusBadge, { status: String(ctx.getValue()) as FlagStatus }),
      },
      {
        id: "actions",
        header: "Actions",
        width: 120,
        fieldFn: () => null,
        cell: (ctx) => renderSnippet(ActionCell, { row: ctx.row.original }),
        cellClass: "actions-cell",
        enableSorting: false,
      },
    ];
  }
  const columns = buildColumns();
</script>

{#snippet IdCell(p: { value: string })}
  <span class="font-mono text-xs text-foreground-darker">{p.value.slice(0, 8)}</span>
{/snippet}

{#snippet MutedCell(p: { value: string })}
  <span class="text-xs text-foreground-darker">{p.value}</span>
{/snippet}

{#snippet CountCell(p: { value: number })}
  <span class="font-mono text-xs tabular-nums text-foreground-darker">{p.value}</span>
{/snippet}

{#snippet StatusBadge(p: { status: FlagStatus })}
  <Badge variant="status" tone={p.status === "open" ? "warning" : "success"} class="capitalize">{p.status}</Badge>
{/snippet}

{#snippet FlagCountLabel(p: { value: number })}
  <span class="font-mono text-xs tabular-nums text-foreground-darker">
    {p.value} {p.value === 1 ? "flag" : "flags"}
  </span>
{/snippet}

{#snippet ActionCell(p: { row: AdminFlagRow; inCard?: boolean })}
  <div class={p.inCard ? "flex justify-start gap-1.5" : "flex justify-end gap-1.5 pr-1"}>
    <Button
      variant="outline"
      intent="compact"
      aria-label={"View details for question " + p.row.questionId.slice(0, 8)}
      onclick={() => openDetails(p.row)}
    >Details</Button>
  </div>
{/snippet}

<div>
  <div class="mb-4 flex flex-wrap items-center gap-2">
    <SegmentedPicker
      variant="pill"
      label="Flag status"
      options={STATUS_OPTIONS}
      optionKey={(o) => o.id}
      selectedKey={statusFilter}
      onSelect={(o) => setStatusFilter(o.id)}
    >
      {#snippet option(o)}{o.label}{/snippet}
    </SegmentedPicker>
    <span class="ml-2 text-xs text-foreground-darker/60">
      {#if loading}Loading…{:else}{rows.length} {rows.length === 1 ? "question" : "questions"}{/if}
    </span>
  </div>

  <DataGrid
    data={rows}
    {columns}
    {features}
    getRowId={(row) => row.questionId}
    label="Flagged questions"
    {page}
    pageSize={PAGE_SIZE}
    {hasMore}
    busy={loading}
    onPageChange={goToPage}
    empty="No flagged questions match this filter."
    svgrid={{
      initialColumnPinning: { right: ["actions"] },
      columnVirtualization: false,
      filterMode: "none",
      showGroupingControls: false,
      enableInlineEditing: false,
      enableCellSelection: false,
      enableRowSummaries: false,
      showRowSelection: false,
      selectionMode: "none",
    }}
  >
    {#snippet card({ row })}
      <p class="line-clamp-2 text-sm">{row.excerpt}</p>
      <span class="flex flex-wrap items-center gap-2">
        {@render StatusBadge({ status: row.status })}
        {@render MutedCell({ value: row.categoryId })}
        {@render FlagCountLabel({ value: row.flagCount })}
      </span>
      {@render ActionCell({ row, inCard: true })}
    {/snippet}
    {#snippet cardDetails({ row })}
      <div class="flex flex-col gap-1 text-xs text-foreground-darker">
        <span>{row.excerpt}</span>
        <span>Question id {@render IdCell({ value: row.questionId })}</span>
      </div>
    {/snippet}
  </DataGrid>

  {#if selectedQuestionId}
    <FlaggedQuestionModal
      questionId={selectedQuestionId}
      open={!!selectedQuestionId}
      onClose={closeDetails}
      onResolved={handleResolved}
    />
  {/if}
</div>
