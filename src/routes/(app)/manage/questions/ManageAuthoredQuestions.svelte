<script lang="ts">
import { toIsoTimestamp } from "@orakl/shared";
  import {
    tableFeatures,
    rowSortingFeature,
    rowPaginationFeature,
    renderSnippet,
    type ColumnDef,
  } from "@svgrid/grid";
  import { goto } from "$app/navigation";
  import Icon from "$lib/components/ui/Icon.svelte";
  import DataGrid from "$lib/components/ui/DataGrid.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Checkbox from "$lib/components/ui/Checkbox.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import SegmentedPicker from "$lib/components/ui/SegmentedPicker.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import Link from "@/lib/components/ui/Link.svelte";
  import { toast } from "@/lib/toast.js";
  
  import { formatDateShort } from "@/lib/format.js";
  import type {
    AuthoredQuestionFilters,
    AuthoredQuestionRow,
    PublishManyResult,
  } from "@orakl/protocol";
  import {
    AUTHORED_QUESTIONS_PAGE_SIZE,
    authorLabel,
  } from "@orakl/shared";
  import AuthoredQuestionModal from "./AuthoredQuestionModal.svelte";
  import WithdrawQuestionDialog from "./WithdrawQuestionDialog.svelte";
  import BulkPromoteDialog from "./BulkPromoteDialog.svelte";

  const PAGE_SIZE = AUTHORED_QUESTIONS_PAGE_SIZE;

  // The row's decision wears a success tint so it outranks Withdraw and Details.
  const DECISION_CLASS =
    "mx-0 rounded-2xl corner-shape-squircle border-2 border-success/40 bg-success/15 px-3 py-1.5 text-sm font-semibold leading-none text-success hover:bg-success/25";

  const PUBLISHED_OPTIONS = [
    { id: "all", label: "All" },
    { id: "shared", label: "Shared" },
    { id: "private", label: "Private" },
  ] as const;

  let {
    initial,
    page,
    filters,
    authors,
    categories,
  }: {
    initial: { rows: AuthoredQuestionRow[]; total: number };
    page: number;
    filters: AuthoredQuestionFilters;
    authors: Array<{ id: string; nickname: string | null; email: string | null; count: number }>;
    categories: Array<{ id: string; name: string }>;
  } = $props();

  // Writable deriveds: promote() reassigns locally; reset to server truth
  // when the prop refreshes (a navigation re-runs the load).
  let rows = $derived<AuthoredQuestionRow[]>(initial.rows);
  let total = $derived(initial.total);
  let totalPages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));

  const hasActiveFilter = $derived(
    Boolean(filters.authorId || filters.category || filters.q) ||
      filters.published !== "all" ||
      Boolean(filters.changed),
  );

  let selectedQuestionId = $state<string | null>(null);
  // The row as the table currently holds it, so the details view follows a
  // promotion made from either surface.
  const selectedRow = $derived(rows.find((r) => r.id === selectedQuestionId) ?? null);
  let refusal = $state<{ id: string; message: string } | null>(null);
  let withdrawingRow = $state<AuthoredQuestionRow | null>(null);

  // Reset with every load, so a selection never outlives its page or filters.
  let selected = $derived.by(() => {
    void initial;
    return new Set<string>();
  });
  let bulkDialogOpen = $state(false);
  let bulkSummary = $state<{
    promotedCount: number;
    skipped: Array<{ id: string; label: string; reason: string }>;
    anyFlagged: boolean;
  } | null>(null);

  const selectableRows = $derived(rows.filter((r) => !r.published_at));
  const allSelected = $derived(
    selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.id)),
  );
  // From selectableRows, so a row promoted one by one drops out of the count.
  const selectedRows = $derived(selectableRows.filter((r) => selected.has(r.id)));

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }

  function toggleAllRows() {
    selected = allSelected ? new Set() : new Set(selectableRows.map((r) => r.id));
  }

  /** Builds the query string from current filters + overrides and navigates. */
  function navigate(
    next: Partial<{
      page: number;
      author: string;
      category: string;
      published: string;
      q: string;
      changed: boolean;
    }>,
  ) {
    const authorId = "author" in next ? next.author : filters.authorId;
    const category = "category" in next ? next.category : filters.category;
    const published = "published" in next ? next.published : filters.published;
    const q = "q" in next ? next.q : filters.q;
    const changed = "changed" in next ? next.changed : filters.changed;
    const filterChanged =
      "author" in next ||
      "category" in next ||
      "published" in next ||
      "q" in next ||
      "changed" in next;
    const targetPage = next.page ?? (filterChanged ? 1 : page);

    const sp = new URLSearchParams();
    if (targetPage > 1) sp.set("page", String(targetPage));
    if (authorId) sp.set("author", authorId);
    if (category) sp.set("category", category);
    if (published && published !== "all") sp.set("published", published);
    if (q) sp.set("q", q);
    if (changed) sp.set("changed", "1");

    refusal = null;
    bulkSummary = null;
    selected = new Set();
    lastSentQ = q || undefined;
    goto(`?${sp.toString()}`, { keepFocus: true, noScroll: true });
  }

  function clearFilters() {
    navigate({ author: "", category: "", published: "all", q: "", changed: false });
  }

  // svelte-ignore state_referenced_locally
  let searchTerm = $state(filters.q ?? "");
  let searchDebounce: ReturnType<typeof setTimeout> | undefined;
  // The q this component last navigated with. A load that merely echoes it
  // back must not overwrite what has been typed since; only an external
  // change (Clear, back/forward) resyncs the box.
  // svelte-ignore state_referenced_locally
  let lastSentQ = filters.q;

  $effect(() => {
    if (filters.q !== lastSentQ) {
      searchTerm = filters.q ?? "";
      lastSentQ = filters.q;
    }
  });

  // A debounce still pending at teardown must not navigate the next page.
  $effect(() => () => clearTimeout(searchDebounce));

  function onSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => navigate({ q: searchTerm }), 300);
  }

  function onSearchKeydown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    clearTimeout(searchDebounce);
    navigate({ q: searchTerm });
  }

  /** Resolves to the refusal message, or null once the row is promoted. */
  async function promote(row: AuthoredQuestionRow): Promise<string | null> {
    refusal = null;
    try {
      const res = await fetch(`/api/manage/questions/${row.id}/publish`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        published_at?: string;
        published_by?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        const message = data.error ?? "Failed to promote question";
        if (res.status === 409 && data.code === "open_flags") {
          refusal = { id: row.id, message };
          return message;
        }
        toast.error(message);
        return message;
      }
      rows = rows.map((r) =>
        r.id === row.id
          ? {
              ...r,
              published_at: data.published_at ?? r.published_at,
              published_by: data.published_by ?? r.published_by,
              changed_since_publish: 0,
            }
          : r,
      );
      toast.success("Question promoted to the shared bank.");
      return null;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to promote question";
      toast.error(message);
      return message;
    }
  }

  /** Resolves to the refusal message, or null once the publication is reconfirmed. */
  async function reconfirm(row: AuthoredQuestionRow): Promise<string | null> {
    refusal = null;
    try {
      const res = await fetch(`/api/manage/questions/${row.id}/republish`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        published_at?: string;
        published_by?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        const message = data.error ?? "Failed to confirm publication";
        if (res.status === 409 && data.code === "open_flags") {
          refusal = { id: row.id, message };
          return message;
        }
        toast.error(message);
        return message;
      }
      rows = rows.map((r) =>
        r.id === row.id
          ? {
              ...r,
              published_at: data.published_at ?? r.published_at,
              published_by: data.published_by ?? r.published_by,
              changed_since_publish: 0,
            }
          : r,
      );
      toast.success("Publication confirmed.");
      return null;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to confirm publication";
      toast.error(message);
      return message;
    }
  }

  function onBulkDone(results: PublishManyResult[]) {
    const skipped = results
      .filter((r) => r.outcome !== "promoted")
      .map((r) => ({
        id: r.id,
        label: selectedRows.find((row) => row.id === r.id)?.label ?? r.id,
        reason:
          r.outcome === "flagged"
            ? "has open reports"
            : r.outcome === "already"
              ? "already in the bank"
              : "not found",
      }));

    rows = rows.map((r) => {
      const result = results.find((x) => x.id === r.id);
      if (result?.outcome !== "promoted") return r;
      return {
        ...r,
        published_at: result.published_at ?? r.published_at,
        published_by: result.published_by ?? r.published_by,
        changed_since_publish: 0,
      };
    });

    const promotedCount = results.filter((r) => r.outcome === "promoted").length;
    bulkSummary = {
      promotedCount,
      skipped,
      anyFlagged: results.some((r) => r.outcome === "flagged"),
    };
    if (skipped.length === 0) toast.success(`${promotedCount} promoted`);

    selected = new Set();
    bulkDialogOpen = false;
  }

  function onWithdrawn(
    id: string,
    result: {
      unpublished_at: string;
      unpublished_by: string;
      unpublish_reason: string;
    },
  ) {
    rows = rows.map((r) =>
      r.id === id
        ? {
            ...r,
            published_at: null,
            published_by: null,
            ...result,
          }
        : r,
    );
  }

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    navigate({ page: p });
  }

  function formatDate(stamp: string): string {
    return formatDateShort(toIsoTimestamp(stamp));
  }

  function rowAuthorLabel(row: AuthoredQuestionRow): string {
    return authorLabel({
      id: row.created_by,
      nickname: row.author_nickname,
      email: row.author_email,
    });
  }

  const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });

  // Decision first: what it says, where it stands, who wrote it, what to do.
  // The first three fit a 1280px page beside the pinned Actions; the rest
  // scroll in behind it.
  function buildColumns(): ColumnDef<typeof features, AuthoredQuestionRow>[] {
    return [
      {
        id: "select",
        header: () => renderSnippet(SelectHeaderCell, {}),
        width: 40,
        cell: (ctx) => renderSnippet(SelectCell, { row: ctx.row.original }),
        enableSorting: false,
      },
      {
        field: "label",
        header: "Question",
        width: 205,
        cell: (ctx) => renderSnippet(LabelCell, { value: String(ctx.getValue()) }),
        enableSorting: false,
      },
      {
        id: "bank",
        header: "Bank",
        width: 125,
        cell: (ctx) => renderSnippet(BankCell, { row: ctx.row.original }),
        enableSorting: false,
      },
      {
        id: "author",
        header: "Author",
        width: 120,
        fieldFn: (row) => rowAuthorLabel(row),
        cell: (ctx) => renderSnippet(MutedCell, { value: String(ctx.getValue()) }),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "Actions",
        width: 270,
        cell: (ctx) => renderSnippet(ActionCell, { row: ctx.row.original }),
        cellClass: "actions-cell",
        enableSorting: false,
      },
      {
        field: "category",
        header: "Category",
        width: 140,
        cell: (ctx) => renderSnippet(MutedCell, { value: String(ctx.getValue()) }),
        enableSorting: false,
      },
      {
        field: "created_at",
        header: "Created",
        width: 120,
        cell: (ctx) => renderSnippet(DateCell, { value: String(ctx.getValue()) }),
        enableSorting: false,
      },
      {
        field: "updated_at",
        header: "Updated",
        width: 120,
        cell: (ctx) =>
          renderSnippet(DateCell, {
            value: ctx.getValue() ? String(ctx.getValue()) : null,
          }),
        enableSorting: false,
      },
    ];
  }
  const columns = buildColumns();
</script>

{#snippet SelectHeaderCell()}
  {#if selectableRows.length > 0}
    <Checkbox
      id="select-all-rows"
      label=""
      size="sm"
      aria-label="Select all private questions on this page"
      checked={allSelected}
      onchange={toggleAllRows}
    />
  {/if}
{/snippet}

{#snippet SelectCell(p: { row: AuthoredQuestionRow })}
  {#if !p.row.published_at}
    <Checkbox
      id={`select-${p.row.id}`}
      label=""
      size="sm"
      aria-label={`Select "${p.row.label}"`}
      checked={selected.has(p.row.id)}
      onchange={() => toggleRow(p.row.id)}
    />
  {/if}
{/snippet}

{#snippet LabelCell(p: { value: string })}
  <span class="block w-full truncate text-xs" data-tooltip={p.value}>{p.value}</span>
{/snippet}

{#snippet MutedCell(p: { value: string })}
  <span class="text-xs text-foreground-darker">{p.value}</span>
{/snippet}

{#snippet DateCell(p: { value: string | null })}
  <span class="text-xs text-foreground-darker">{p.value ? formatDate(p.value) : "—"}</span>
{/snippet}

{#snippet BankCell(p: { row: AuthoredQuestionRow })}
  {#if p.row.published_at}
    {#if p.row.changed_since_publish === 1}
      <Badge variant="status" tone="warning">Shared · edited</Badge>
    {:else}
      <Badge variant="status" tone="success">Shared</Badge>
    {/if}
  {:else}
    <Badge variant="status" tone="neutral">Private</Badge>
    {#if p.row.unpublish_reason}
      <div
        class="mt-1 max-w-32 truncate text-xs text-foreground-darker"
        data-tooltip={`Withdrawn · ${p.row.unpublish_reason}`}
      >
        Withdrawn · {p.row.unpublish_reason}
      </div>
    {/if}
  {/if}
{/snippet}

{#snippet promoteIcon()}
  <Icon name="check" class="size-4" />
{/snippet}

{#snippet ActionCell(p: { row: AuthoredQuestionRow })}
  <div class="flex justify-start gap-1.5">
    {#if !p.row.published_at}
      <ConfirmButton
        label="Promote"
        confirmLabel="Promote to the shared bank?"
        confirmVariant="success"
        icon={promoteIcon}
        class={DECISION_CLASS}
        onConfirm={() => promote(p.row)}
      />
    {:else}
      {#if p.row.changed_since_publish === 1}
        <ConfirmButton
          label="Confirm"
          confirmLabel="Keep it in the shared bank?"
          confirmVariant="success"
          icon={promoteIcon}
          class={DECISION_CLASS}
          onConfirm={() => reconfirm(p.row)}
        />
      {/if}
      {#if p.row.created_by !== null}
        <Button
          variant="outline"
          intent="compact"
          onclick={() => { withdrawingRow = p.row; }}
        >Withdraw</Button>
      {/if}
    {/if}
    <Button
      variant="ghost"
      intent="compact"
      aria-label={"View details for question " + p.row.id.slice(0, 8)}
      data-tooltip="Details"
      onclick={() => { selectedQuestionId = p.row.id; }}
    ><Icon name="eye" class="size-4" /></Button>
  </div>
{/snippet}

<div>
  <div class="mb-4 flex items-center gap-2">
    <h1 class="text-lg font-semibold">Authored questions</h1>
    <span class="ml-2 text-xs text-foreground-darker/60">
      {total} {total === 1 ? "question" : "questions"}
    </span>
  </div>

  <Card padding="sm" class="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
    <div class="flex sm:w-52">
      <Select
        id="author-filter"
        label="Author"
        size="compact"
        value={filters.authorId ?? ""}
        onchange={(e) =>
          navigate({ author: (e.currentTarget as HTMLSelectElement).value })}
      >
        <option value="">All authors</option>
        {#each authors as a (a.id)}
          <option value={a.id}>{a.nickname ?? a.email ?? "Unknown"} ({a.count})</option>
        {/each}
      </Select>
    </div>

    <div class="flex sm:w-52">
      <Select
        id="category-filter"
        label="Category"
        size="compact"
        value={filters.category ?? ""}
        onchange={(e) =>
          navigate({ category: (e.currentTarget as HTMLSelectElement).value })}
      >
        <option value="">All categories</option>
        {#each categories as c (c.id)}
          <option value={c.name}>{c.name}</option>
        {/each}
      </Select>
    </div>

    <div class="flex flex-col gap-2">
      <span class="flex min-h-8 items-baseline text-lg">Bank status</span>
      <SegmentedPicker
        variant="pill"
        label="Bank status"
        options={PUBLISHED_OPTIONS}
        optionKey={(o) => o.id}
        selectedKey={filters.published ?? "all"}
        onSelect={(o) => navigate({ published: o.id })}
      >
        {#snippet option(o)}{o.label}{/snippet}
      </SegmentedPicker>
    </div>

    <div class="flex sm:w-64">
      <Input
        id="search-filter"
        label="Search"
        name="search"
        type="search"
        placeholder="Search question text"
        bind:value={searchTerm}
        oninput={onSearchInput}
        onkeydown={onSearchKeydown}
      />
    </div>

    <Checkbox
      id="changed-filter"
      label="Edited since promotion"
      checked={filters.changed === true}
      onchange={() => navigate({ changed: !filters.changed })}
    />

    {#if hasActiveFilter}
      <Button variant="outline" intent="compact" onclick={clearFilters}>Clear</Button>
    {/if}
  </Card>

  {#if selectedRows.length > 0}
    <Card padding="sm" class="mb-4 flex flex-row items-center justify-between gap-3">
      <span class="text-sm">{selectedRows.length} selected</span>
      <Button
        variant="outline"
        intent="compact"
        onclick={() => { bulkDialogOpen = true; }}
      >Promote selected</Button>
    </Card>
  {/if}

  {#if bulkSummary}
    <Card
      variant={bulkSummary.skipped.length === 0 ? "success" : "warning"}
      role="status"
      class="mb-4"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1 text-sm">
          <span>{bulkSummary.promotedCount} promoted</span>
          {#each bulkSummary.skipped as s (s.id)}
            <span class="text-foreground-darker" data-tooltip={s.label}>{s.label} — {s.reason}</span>
          {/each}
          {#if bulkSummary.anyFlagged}
            <Link href="/manage/flagged-questions" intent="inline">Flagged questions</Link>
          {/if}
        </div>
        <Button
          variant="outline"
          intent="compact"
          aria-label="Dismiss"
          onclick={() => { bulkSummary = null; }}
        >Dismiss</Button>
      </div>
    </Card>
  {/if}

  {#if refusal}
    <Card variant="warning" role="alert" class="mb-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">
          {refusal.message}
          <Link href="/manage/flagged-questions" intent="inline">Flagged questions</Link>
        </span>
        <Button
          variant="outline"
          intent="compact"
          aria-label="Dismiss"
          onclick={() => { refusal = null; }}
        >Dismiss</Button>
      </div>
    </Card>
  {/if}

  <DataGrid
    data={rows}
    {columns}
    {features}
    getRowId={(row) => row.id}
    label="Authored questions"
    cardDisclosureClass="pl-10"
    {page}
    pageSize={PAGE_SIZE}
    {total}
    onPageChange={goToPage}
    empty={total > 0
      ? "Nothing on this page."
      : hasActiveFilter
        ? "No questions match these filters."
        : "No curator has written a question yet."}
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
    {#snippet cardHeader()}
      {#if selectableRows.length > 0}
        <div class="flex items-center gap-2">
          {@render SelectHeaderCell()}
          <!-- Native `for`, so the text is a second target for the same box and
               carries the row's own type rather than the checkbox's mono `sm` label. -->
          <label for="select-all-rows" class="cursor-pointer text-sm">Select all</label>
        </div>
      {/if}
    {/snippet}
    {#snippet card({ row })}
      <div class="flex items-start gap-3">
        <div class="w-7 shrink-0 pt-0.5">{@render SelectCell({ row })}</div>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <p class="line-clamp-2 text-sm">{row.label}</p>
          <div class="flex flex-wrap items-center gap-2 text-xs text-foreground-darker">
            {@render BankCell({ row })}
            <span>{rowAuthorLabel(row)} · {row.category}</span>
          </div>
        </div>
      </div>
      {@render ActionCell({ row })}
    {/snippet}
    {#snippet cardDetails({ row })}
      <div class="flex flex-col gap-1 text-xs text-foreground-darker">
        <span>Created {@render DateCell({ value: row.created_at })}</span>
        {#if row.updated_at}
          <span>Updated {@render DateCell({ value: row.updated_at })}</span>
        {/if}
      </div>
    {/snippet}
  </DataGrid>

  {#if selectedRow}
    <AuthoredQuestionModal
      row={selectedRow}
      open={true}
      onClose={() => { selectedQuestionId = null; }}
      onPromote={promote}
      onReconfirm={reconfirm}
      onWithdraw={(row) => { selectedQuestionId = null; withdrawingRow = row; }}
    />
  {/if}

  {#if withdrawingRow}
    <WithdrawQuestionDialog
      row={withdrawingRow}
      open={true}
      onClose={() => { withdrawingRow = null; }}
      onWithdrawn={(result) => { if (withdrawingRow) onWithdrawn(withdrawingRow.id, result); }}
    />
  {/if}

  {#if bulkDialogOpen}
    <BulkPromoteDialog
      rows={selectedRows}
      open={true}
      onClose={() => { bulkDialogOpen = false; }}
      onDone={onBulkDone}
    />
  {/if}
</div>
