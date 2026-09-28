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
  import DataGrid from "$lib/components/ui/DataGrid.svelte";
  import type { UserSource } from "@orakl/protocol";

  export interface UserRow {
    id: string;
    email: string;
    role: string;
    nickname: string | null;
    avatar: string | null;
    powers: string;
    powerCount: number;
    created_at: string | null;
    admin_note: string | null;
    leaderboard_excluded: number;
    hasCurationRequest: boolean;
    source: UserSource;
  }

  let {
    rows,
    currentUserId,
    onedit,
    ondelete,
    page,
    total,
    onPageChange,
    pageSize = 10,
    leaderboards = false,
    busy = false,
    empty = "No accounts match these filters.",
  }: {
    rows: UserRow[];
    currentUserId: string;
    onedit: (user: UserRow) => void;
    ondelete: (user: UserRow) => void;
    page: number;
    total: number;
    onPageChange: (page: number) => void;
    pageSize?: number;
    /** Whether the solo boards exist, and so whether exclusion means anything. */
    leaderboards?: boolean;
    /** Disables the pager while a page fetch is in flight. */
    busy?: boolean;
    /** Empty-state message; the caller knows whether filters are set. */
    empty?: string;
  } = $props();

  const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });

  // Snippets defined below are hoisted and usable here.
  function buildColumns(): ColumnDef<typeof features, UserRow>[] {
    return [
      {
        field: "email",
        header: "Email",
        width:220,
        cell: (ctx) =>
          renderSnippet(EmailCell, {
            value: String(ctx.getValue()),
            excluded: ctx.row.original.leaderboard_excluded === 1,
          }),
      },
      {
        id: "nickname",
        header: "Nickname",
        width:130,
        // Coalesced, not null: SvGrid's text comparator stringifies its key, so
        // a null here sorts as "null" among the n-names. Empty sorts first in
        // both the table and the cards.
        fieldFn: (row) => row.nickname ?? "",
        cell: (ctx) => renderSnippet(MutedCell, { value: String(ctx.getValue() || "—") }),
      },
      {
        field: "role",
        header: "Role",
        width:110,
        cell: (ctx) => renderSnippet(RoleBadge, { role: String(ctx.getValue()) }),
      },
      {
        id: "hasCurationRequest",
        header: "Request",
        width:90,
        fieldFn: (row) => row.hasCurationRequest,
        cell: (ctx) => renderSnippet(CurationBadge, { active: Boolean(ctx.getValue()) }),
      },
      {
        field: "source",
        header: "Source",
        width:110,
        cell: (ctx) => renderSnippet(SourceBadge, { source: ctx.getValue() as UserSource }),
      },
      {
        field: "powerCount",
        header: "Powers",
        width:80,
        editorType: "number",
        cell: (ctx) => renderSnippet(PowersCell, { count: Number(ctx.getValue()) }),
      },
      {
        id: "admin_note",
        header: "Note",
        width:200,
        fieldFn: (row) => row.admin_note ?? "",
        cell: (ctx) => renderSnippet(NoteCell, { value: String(ctx.getValue() || "") }),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "Actions",
        width: 160,
        fieldFn: () => null,
        cell: (ctx) => renderSnippet(ActionCell, { user: ctx.row.original }),
        cellClass: "actions-cell",
        enableSorting: false,
      },
    ];
  }
  const columns = buildColumns();
</script>

{#snippet EmailCell(p: { value: string; excluded: boolean; inCard?: boolean })}
  <span class="flex items-center gap-1.5 {p.inCard ? 'min-w-0' : ''}">
    <span class="font-mono {p.inCard ? 'min-w-0 truncate text-sm' : 'text-xs'}">{p.value}</span>
    {#if leaderboards && p.excluded}
      <Badge variant="status" tone="warning" class="shrink-0" data-tooltip="Excluded from leaderboards">
        No board
      </Badge>
    {/if}
  </span>
{/snippet}

{#snippet MutedCell(p: { value: string })}
  <span class="text-xs text-foreground-darker">{p.value}</span>
{/snippet}

{#snippet RoleBadge(p: { role: string })}
  <Badge variant="status" tone="primary" class="capitalize">{p.role}</Badge>
{/snippet}

{#snippet CurationBadge(p: { active: boolean })}
  {#if p.active}
    <Badge variant="status" tone="warning">Pending</Badge>
  {/if}
{/snippet}

{#snippet SourceBadge(p: { source: UserSource })}
  {#if p.source === "lifetime"}
    <Badge variant="status" tone="success">Lifetime</Badge>
  {:else if p.source === "paid"}
    <Badge variant="status" tone="primary">Paid</Badge>
  {:else if p.source === "comp"}
    <Badge variant="status" tone="info">Comp</Badge>
  {:else}
    <span class="text-xs text-foreground-darker/40">—</span>
  {/if}
{/snippet}

{#snippet PowersCell(p: { count: number })}
  {#if p.count > 0}
    <span class="font-mono text-xs tabular-nums text-foreground-darker">{p.count}</span>
  {:else}
    <span class="text-xs text-foreground-darker/40">—</span>
  {/if}
{/snippet}

{#snippet PowersLabel(p: { count: number })}
  {#if p.count > 0}
    <span class="font-mono text-xs tabular-nums text-foreground-darker">
      {p.count} {p.count === 1 ? "power" : "powers"}
    </span>
  {/if}
{/snippet}

{#snippet NoteCell(p: { value: string })}
  {#if p.value}
    <span class="text-xs italic text-foreground-darker">{p.value}</span>
  {:else}
    <span class="text-xs text-foreground-darker/40">—</span>
  {/if}
{/snippet}

{#snippet ActionCell(p: { user: UserRow; inCard?: boolean })}
  <div class={p.inCard ? "flex justify-start gap-1.5" : "flex justify-end gap-1.5 pr-1"}>
    <Button
      variant="outline"
      intent="compact"
      aria-label={"Edit " + (p.user.nickname ?? p.user.email)}
      onclick={() => onedit(p.user)}
    >Edit</Button>
    <Button
      variant="danger"
      intent="compact"
      aria-label={"Delete " + (p.user.nickname ?? p.user.email)}
      onclick={() => ondelete(p.user)}
      disabled={p.user.id === currentUserId}
    >Delete</Button>
  </div>
{/snippet}

{#snippet CardMeta(p: { row: UserRow })}
  <span class="flex flex-wrap items-center gap-2">
    {@render RoleBadge({ role: p.row.role })}
    {@render PowersLabel({ count: p.row.powerCount })}
    {@render CurationBadge({ active: p.row.hasCurationRequest })}
    {@render SourceBadge({ source: p.row.source })}
  </span>
{/snippet}

<DataGrid
  data={rows}
  {columns}
  {features}
  getRowId={(row) => row.id}
  label="Users"
  {page}
  {pageSize}
  {total}
  {onPageChange}
  {busy}
  {empty}
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
    {@render EmailCell({ value: row.email, excluded: row.leaderboard_excluded === 1, inCard: true })}
    {@render CardMeta({ row })}
    {@render ActionCell({ user: row, inCard: true })}
  {/snippet}
  {#snippet cardDetails({ row })}
    <div class="flex flex-col gap-1 text-xs text-foreground-darker">
      {#if row.nickname}
        <span>Nickname {@render MutedCell({ value: row.nickname })}</span>
      {/if}
      <span>Note {@render NoteCell({ value: row.admin_note ?? "" })}</span>
      <span>User id {@render MutedCell({ value: row.id })}</span>
    </div>
  {/snippet}
</DataGrid>
