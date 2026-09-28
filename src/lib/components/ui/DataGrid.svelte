<script lang="ts" generics="Row">
  /**
   * Shared table-or-cards wrapper. Below the `sm` breakpoint the device
   * default is cards, above it the table; a "Show as cards" Switch above the
   * rows overrides the default at every width and the choice is remembered
   * per viewer under the persistent `orakl-table-layout` key. Owns the
   * themed card shell and grid icons around `SvGrid`, the mount skeleton,
   * the empty message, and a controlled Previous/Next pager over rows the
   * page has already paginated server-side. A grid with no `card` snippet
   * always renders the table and shows no Switch. In card mode, when at
   * least one column sorts, a "Sort by" Select above the rows reorders a
   * copy of the current page's cards; the table branch sorts itself via
   * SvGrid and never shows the Select. A `cardHeader` snippet sits at the
   * left of that same row, in card mode only — the page's own control
   * (e.g. a select-all with no column to live in).
   *
   * SvGrid pass-through: named props would duplicate every SvGrid prop a
   * page needs (`initialColumnPinning`, `columnVirtualization`, `filterMode`,
   * ...), so `svgrid` is a bag spread onto `<SvGrid>` instead of one named
   * prop per option. Typed as `SvGridPassthroughProps` (the stub's SvGrid
   * props minus what this wrapper hard-wires), so a misspelled key fails
   * to compile instead of reaching SvGrid silently.
   *
   * Pager: `total` given ⇒ "Showing a–b of n", Next disabled on the last
   * page. `total` omitted ⇒ `Page {page}`, Next disabled on
   * `hasMore === false`; if `hasMore` is also omitted there is no signal a
   * further page exists, so Next is disabled rather than guessed open.
   * `busy` ORs into both buttons' `disabled`, for a page still loading its
   * next rows.
   */
  import type { Snippet } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { SvGrid, type ColumnDef, type TableFeatures, type SvGridPassthroughProps } from "@svgrid/grid";
  import { getStorageItem, setStorageItem } from "$lib/storage";
  import Button from "./Button.svelte";
  import Card from "./Card.svelte";
  import Icon from "./Icon.svelte";
  import Select from "./Select.svelte";
  import Switch from "./Switch.svelte";
  import TableGridIcons from "./TableGridIcons.svelte";
  import TableSkeleton from "./TableSkeleton.svelte";

  let {
    data,
    columns,
    features,
    getRowId,
    label,
    height,
    empty,
    page,
    pageSize,
    total,
    hasMore,
    busy = false,
    onPageChange,
    card,
    cardHeader,
    cardDetails,
    cardDisclosureClass,
    svgrid = {},
  }: {
    data: Row[];
    columns: ColumnDef<TableFeatures, Row>[];
    features: TableFeatures;
    getRowId: (row: Row) => string;
    /** Accessible name for the grid and the card list. */
    label: string;
    /** Grid pixel height; defaults to the row-count arithmetic below. */
    height?: number;
    /** Empty-state message; omit to render nothing when `data` is empty. */
    empty?: string;
    page: number;
    /**
     * Drives the wrapper's pager only. SvGrid's own pagination stays off
     * (`showPagination={false}`, no `pageable`), so it never slices rows —
     * the page hands over one page of rows and the wrapper pages between them.
     */
    pageSize: number;
    /** Row count across all pages. Omit when the page has no total, only a per-request page of rows. */
    total?: number;
    /** Whether a further page exists. Read only when `total` is absent. */
    hasMore?: boolean;
    /** Disables both pager buttons, e.g. while the page's own fetch is in flight. */
    busy?: boolean;
    onPageChange: (page: number) => void;
    /** The page's card body for one row. Absent ⇒ always render the table. */
    card?: Snippet<[{ row: Row }]>;
    /** The page's own control (e.g. a select-all), rendered at the left of the toggle row in card mode only — the table has no equivalent column there. Absent ⇒ no change to the row. */
    cardHeader?: Snippet;
    /** Secondary fields for one row, revealed by a "More" disclosure below the card. Absent ⇒ no disclosure. */
    cardDetails?: Snippet<[{ row: Row }]>;
    /** Extra class on the "More" disclosure, e.g. to match a gutter the page's `card` snippet reserves. Absent ⇒ the disclosure sits at the card's own left edge. */
    cardDisclosureClass?: string;
    /** Extra props spread onto `<SvGrid>` (pinning, filter mode, etc). Typo'd keys fail to compile. */
    svgrid?: SvGridPassthroughProps;
  } = $props();

  type SortableColumn = { value: string; label: string; accessor: (row: Row) => unknown };

  // Card-mode only: SvGrid sorts the table itself. A column sorts unless it
  // opts out (`enableSorting: false`), has no accessor, or its header is a
  // function (no usable Select label).
  const sortableColumns = $derived.by((): SortableColumn[] => {
    const result: SortableColumn[] = [];
    for (const column of columns) {
      if (column.enableSorting === false) continue;
      if (typeof column.header !== "string") continue;
      const accessor =
        column.fieldFn ??
        (column.field ? (row: Row) => (row as Record<string, unknown>)[column.field as string] : undefined);
      if (!accessor) continue;
      result.push({ value: column.id ?? (column.field as string), label: column.header, accessor });
    }
    return result;
  });

  let sortBy = $state("none");

  function compareValues(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
    if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
    return Number(a) - Number(b);
  }

  const sortedData = $derived.by(() => {
    if (sortBy === "none") return data;
    const column = sortableColumns.find((c) => c.value === sortBy);
    if (!column) return data;
    return [...data].sort((a, b) => compareValues(column.accessor(a), column.accessor(b)));
  });

  const totalPages = $derived(
    total === undefined ? undefined : Math.max(1, Math.ceil(total / pageSize)),
  );
  // Only meaningful when `total` is absent: no signal ⇒ no further pages.
  const nextDisabled = $derived(
    busy || (totalPages !== undefined ? page >= totalPages : hasMore !== true),
  );
  // Skeleton and real grid share one row count: as many as the page's own
  // rows, capped at ten so a one-row page doesn't render a twelve-row
  // skeleton and a wide page doesn't grow past a screenful.
  const skeletonRows = $derived(Math.min(10, Math.max(1, data.length)));
  // Header row, 44px rows, the scrollbar rail. Dropping the old
  // Math.min(520, …) cap: skeletonRows already caps at 10 rows, so this
  // tops out at 524px — close enough to the former 520px cap to keep as one
  // number instead of two caps agreeing by coincidence.
  const gridHeight = $derived(height ?? 56 + skeletonRows * 44 + 28);
  // Empty first page: no layout choice and no pager to show for zero rows.
  // `page > 1` with no rows is "nothing on this page" — the pager stays so
  // the viewer can get back.
  const emptyFirstPage = $derived(data.length === 0 && page === 1);

  let mounted = $state(false);
  const narrow = new MediaQuery("(max-width: 639px)");
  // null ⇒ follow the device default; storage is read once at mount (SSR
  // has no localStorage).
  let stored = $state<"table" | "cards" | null>(null);
  $effect(() => {
    mounted = true;
    const value = getStorageItem("orakl-table-layout");
    stored = value === "table" || value === "cards" ? value : null;
  });

  const cards = $derived(
    card !== undefined && (stored ? stored === "cards" : narrow.current),
  );

  function onSwitchChange(next: boolean) {
    stored = next ? "cards" : "table";
    setStorageItem("orakl-table-layout", stored);
  }

  function goToPage(p: number) {
    if (p < 1 || (totalPages !== undefined && p > totalPages) || p === page) return;
    onPageChange(p);
  }
</script>

{#if card && !emptyFirstPage}
  <div class="mb-3 flex items-center justify-end gap-2">
    {#if cards && cardHeader}
      <div class="mr-auto">{@render cardHeader()}</div>
    {/if}
    {#if cards && sortableColumns.length > 0}
      <Select id={`datagrid-sort-${label.replace(/\W+/g, "-").toLowerCase()}`} label="Sort by" hideLabel size="compact" bind:value={sortBy}>
        <option value="none">Sort by…</option>
        {#each sortableColumns as column (column.value)}
          <option value={column.value}>{column.label}</option>
        {/each}
      </Select>
    {/if}
    <!-- The visible text is a second target for the same switch, hidden from
         assistive tech so the Switch beside it stays the one accessible
         control. Keyboard reaches it through that Switch, never through here. -->
    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="cursor-pointer select-none text-sm"
      onclick={() => onSwitchChange(!cards)}
    >Show as cards</button>
    <Switch label="Show as cards" checked={cards} onchange={onSwitchChange} />
  </div>
{/if}

{#if data.length === 0}
  {#if empty}
    {#if cards && card}
      <!-- Card mode has no sg-theme panel; give the message the same vertical
           footprint a card list would have so the page doesn't collapse. -->
      <div class="flex items-center justify-center py-8" style="min-height: {gridHeight}px">
        <p role="status" class="text-center text-sm text-foreground-darker">{empty}</p>
      </div>
    {:else}
      <Card class="sg-theme flex items-center justify-center" padding="none" style="height: {gridHeight}px">
        <p role="status" class="text-center text-sm text-foreground-darker">{empty}</p>
      </Card>
    {/if}
  {/if}
{:else if !mounted}
  <TableSkeleton rows={skeletonRows} columns={columns.length} height="{gridHeight}px" />
{:else if cards && card}
  <ul class="flex flex-col gap-3" role="list" aria-label={label}>
    {#each sortedData as row (getRowId(row))}
      <li>
        <Card padding="sm" class="gap-3">
          {@render card({ row })}
          {#if cardDetails}
            <!-- Keyed by getRowId via the surrounding {#each}, so a page change never leaves a disclosure open against a different row. -->
            <details class="group mt-2 border-t border-border pt-2{cardDisclosureClass ? ` ${cardDisclosureClass}` : ''}">
              <summary class="flex list-none cursor-pointer items-center gap-1 py-2 text-xs text-foreground-darker [&::-webkit-details-marker]:hidden">
                <Icon
                  name="chevron-down"
                  class="size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-open:rotate-180 motion-reduce:transition-none"
                />
                More
              </summary>
              <div class="mt-2">
                {@render cardDetails({ row })}
              </div>
            </details>
          {/if}
        </Card>
      </li>
    {/each}
  </ul>
{:else}
  <Card class="sg-theme" padding="none" style="height: {gridHeight}px">
    <TableGridIcons>
      {#snippet children(icons)}
        <SvGrid
          {...svgrid}
          {data}
          {columns}
          {features}
          {icons}
          {getRowId}
          showPagination={false}
          containerHeight="100%"
          aria-label={label}
        />
      {/snippet}
    </TableGridIcons>
  </Card>
{/if}

{#if !emptyFirstPage}
  <div class="mt-4 flex items-center justify-center gap-3">
    <Button
      variant="outline"
      intent="compact"
      disabled={busy || page <= 1}
      onclick={() => goToPage(page - 1)}
    >Previous</Button>
    <span class="text-sm tabular-nums text-foreground-darker">
      {#if total !== undefined}
        Showing {(page - 1) * pageSize + (data.length > 0 ? 1 : 0)}–{(page - 1) * pageSize + data.length} of {total}
      {:else}
        Page {page}
      {/if}
    </span>
    <Button
      variant="outline"
      intent="compact"
      disabled={nextDisabled}
      onclick={() => goToPage(page + 1)}
    >Next</Button>
  </div>
{/if}
