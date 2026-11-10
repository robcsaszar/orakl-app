<script lang="ts">
  import {
    tableFeatures,
    rowSortingFeature,
    rowPaginationFeature,
    renderSnippet,
    type ColumnDef,
  } from "@svgrid/grid";
  import { goto } from "$app/navigation";
  import DataGrid from "$lib/components/ui/DataGrid.svelte";
  import QuestionForm from "$lib/components/questions/QuestionForm.svelte";
  import type {
    QuestionFormCategory,
    QuestionFormQuestion,
  } from "$lib/components/questions/question-form.js";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { toast } from "@/lib/toast.js";
  import type { BankQuestionRow } from "@orakl/protocol";

  const PAGE_SIZE = 25;

  /** Stored types the edit form can rewrite, with their labels. */
  const EDITABLE_TYPES: Record<string, string> = {
    text_choice: "Multiple choice",
    true_false: "True/false",
    image_matching: "Image matching",
  };

  let {
    initial,
    initialHasMore,
    page,
    q,
    category,
    categories,
  }: {
    initial: BankQuestionRow[];
    /** Whether a page beyond this one exists. */
    initialHasMore: boolean;
    /** 1-indexed page the server loaded, from ?page=. */
    page: number;
    /** Search term the server loaded with; empty for none. */
    q: string;
    /** Category name the server filtered to; empty for all. */
    category: string;
    /** Category names offered by the filter. */
    categories: string[];
  } = $props();

  // Writable derived: a save patches its row locally; a load resets it.
  let rows = $derived<BankQuestionRow[]>(initial);

  function typeLabel(type: string): string {
    if (type in EDITABLE_TYPES) return EDITABLE_TYPES[type];
    const words = type.replaceAll("_", " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  function rowMeta(row: BankQuestionRow): string {
    return [
      row.category,
      typeLabel(row.type),
      row.difficulty,
      row.source === "built-in" ? "Built-in" : "Promoted",
      row.edited ? "Edited" : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  /** Moves to the given filters through the URL; a filter change returns to page 1. */
  function navigate(next: Partial<{ page: number; q: string; category: string }>) {
    const nextQ = next.q ?? q;
    const nextCategory = next.category ?? category;
    const filterChanged = "q" in next || "category" in next;
    const targetPage = next.page ?? (filterChanged ? 1 : page);
    const sp = new URLSearchParams();
    if (targetPage > 1) sp.set("page", String(targetPage));
    if (nextQ) sp.set("q", nextQ);
    if (nextCategory) sp.set("category", nextCategory);
    lastSentQ = nextQ;
    goto(`?${sp.toString()}`, { keepFocus: true, noScroll: true });
  }

  // svelte-ignore state_referenced_locally
  let searchTerm = $state(q);
  let searchDebounce: ReturnType<typeof setTimeout> | undefined;
  // The q this component last navigated with. A load that echoes it back must
  // not overwrite what has been typed since; only an outside change (Clear,
  // back/forward) resyncs the box.
  // svelte-ignore state_referenced_locally
  let lastSentQ = q;

  $effect(() => {
    if (q !== lastSentQ) {
      searchTerm = q;
      lastSentQ = q;
    }
  });

  // A debounce still pending at teardown must not navigate the next page.
  $effect(() => () => clearTimeout(searchDebounce));

  function onSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => navigate({ q: searchTerm.trim() }), 300);
  }

  function onSearchKeydown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    clearTimeout(searchDebounce);
    navigate({ q: searchTerm.trim() });
  }

  let editCategories = $state<QuestionFormCategory[]>([]);
  let editTags = $state<string[]>([]);
  let editing = $state<QuestionFormQuestion | null>(null);

  async function startEdit(row: BankQuestionRow) {
    try {
      const res = await fetch(`/api/manage/bank/${row.id}`);
      const data = (await res.json().catch(() => ({}))) as {
        question?: QuestionFormQuestion;
        categories?: QuestionFormCategory[];
        tags?: string[];
        error?: string;
      };
      if (!res.ok || !data.question) {
        toast.error(data.error ?? "Could not load question.");
        return;
      }
      editCategories = data.categories ?? [];
      editTags = data.tags ?? [];
      editing = data.question;
    } catch {
      toast.error("Network error. Try again.");
    }
  }

  /** Saves the form's payload and patches the edited row in place. */
  async function saveQuestion(payload: Record<string, unknown>): Promise<boolean> {
    const id = editing?.id;
    if (!id) return false;
    try {
      const res = await fetch(`/api/manage/bank/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Failed to save question.");
        return false;
      }
      const edited = editCategories.find((c) => c.id === payload.categoryId);
      rows = rows.map((r) =>
        r.id === id
          ? {
              ...r,
              excerpt: String(payload.questionText),
              category: edited?.name ?? r.category,
              difficulty:
                (payload.difficulty as BankQuestionRow["difficulty"]) ?? r.difficulty,
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

  const hasActiveFilter = $derived(Boolean(q || category));

  const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });

  const columns: ColumnDef<typeof features, BankQuestionRow>[] = [
    {
      id: "question",
      header: "Question",
      width: 640,
      fieldFn: (row) => row.excerpt,
      cell: (ctx) => renderSnippet(QuestionCell, { row: ctx.row.original }),
      enableSorting: false,
    },
    {
      id: "actions",
      header: "Actions",
      width: 140,
      fieldFn: (row) => row.id,
      cell: (ctx) => renderSnippet(RowAction, { row: ctx.row.original }),
      enableSorting: false,
    },
  ];
</script>

{#snippet QuestionCell(p: { row: BankQuestionRow })}
  <span class="flex flex-col gap-0.5">
    <span class="line-clamp-2 whitespace-normal text-sm">{p.row.excerpt}</span>
    <span class="text-xs text-foreground-darker">{rowMeta(p.row)}</span>
  </span>
{/snippet}

{#snippet RowAction(p: { row: BankQuestionRow })}
  {#if p.row.type in EDITABLE_TYPES}
    <Button variant="secondary" intent="compact" aria-label="Edit question" onclick={() => startEdit(p.row)}>
      Edit
    </Button>
  {:else}
    <span class="text-xs text-foreground-darker">Not editable here</span>
  {/if}
{/snippet}

<div>
  <h1 class="mb-4 text-lg font-semibold">Question bank</h1>

  <Card padding="sm" class="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
    <div class="flex sm:w-52">
      <Select
        id="category-filter"
        label="Category"
        size="compact"
        value={category}
        onchange={(e) => navigate({ category: (e.currentTarget as HTMLSelectElement).value })}
      >
        <option value="">All categories</option>
        {#each categories as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </Select>
    </div>

    <div class="flex sm:w-72">
      <Input
        id="search-filter"
        label="Search"
        name="search"
        type="search"
        placeholder="Question text or id"
        bind:value={searchTerm}
        oninput={onSearchInput}
        onkeydown={onSearchKeydown}
      />
    </div>

    {#if hasActiveFilter}
      <Button variant="outline" intent="compact" onclick={() => navigate({ q: "", category: "" })}>
        Clear
      </Button>
    {/if}
  </Card>

  <DataGrid
    data={rows}
    {columns}
    {features}
    getRowId={(row) => row.id}
    label="Question bank"
    {page}
    pageSize={PAGE_SIZE}
    hasMore={initialHasMore}
    onPageChange={(p) => p >= 1 && navigate({ page: p })}
    empty={hasActiveFilter ? "No questions match these filters." : "The bank is empty."}
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
      <span class="text-xs text-foreground-darker">{rowMeta(row)}</span>
      <span class="self-start">{@render RowAction({ row })}</span>
    {/snippet}
  </DataGrid>
</div>

<ResponsiveOverlay id="edit-question-dialog" open={editing !== null} hasTitle={true} onClose={() => (editing = null)}>
  {#snippet title()}Edit question{/snippet}
  <QuestionForm
    categories={editCategories}
    tags={editTags}
    question={editing}
    showHeading={false}
    onsubmit={saveQuestion}
    oncancel={() => (editing = null)}
  />
</ResponsiveOverlay>
