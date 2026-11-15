<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import { TABLE_ICON_MAP } from "./table-icons";

  let { children }: { children: Snippet<[Record<string, Snippet>]> } =
    $props();
</script>

{#snippet sort()}<Icon name={TABLE_ICON_MAP.sort} size="md" usage="ui.table-grid" />{/snippet}
{#snippet sortAsc()}<Icon name={TABLE_ICON_MAP["sort-asc"]} size="md" usage="ui.table-grid" />{/snippet}
{#snippet sortDesc()}<Icon name={TABLE_ICON_MAP["sort-desc"]} size="md" usage="ui.table-grid" />{/snippet}
{#snippet filter()}<Icon name={TABLE_ICON_MAP.filter} size="md" usage="ui.table-grid" />{/snippet}
{#snippet menu()}<Icon name={TABLE_ICON_MAP.menu} size="md" usage="ui.table-grid" />{/snippet}
{#snippet group()}<Icon name={TABLE_ICON_MAP.group} size="md" usage="ui.table-grid" />{/snippet}
{#snippet x()}<Icon name={TABLE_ICON_MAP.x} size="md" usage="ui.table-grid" />{/snippet}
{#snippet chevronDown()}<Icon name={TABLE_ICON_MAP["chevron-down"]} size="md" usage="ui.table-grid" />{/snippet}
{#snippet autosize()}<Icon name={TABLE_ICON_MAP.autosize} size="md" usage="ui.table-grid" />{/snippet}
{#snippet columns()}<Icon name={TABLE_ICON_MAP.columns} size="md" usage="ui.table-grid" />{/snippet}
{#snippet reset()}<Icon name={TABLE_ICON_MAP.reset} size="md" usage="ui.table-grid" />{/snippet}
{#snippet paginationFirst()}<Icon
    name={TABLE_ICON_MAP["pagination-first"]}
    size="md"
    usage="ui.table-grid"
  />{/snippet}
{#snippet paginationPrev()}<Icon
    name={TABLE_ICON_MAP["pagination-prev"]}
    size="md"
    usage="ui.table-grid"
  />{/snippet}
{#snippet paginationNext()}<Icon
    name={TABLE_ICON_MAP["pagination-next"]}
    size="md"
    usage="ui.table-grid"
  />{/snippet}
{#snippet paginationLast()}<Icon
    name={TABLE_ICON_MAP["pagination-last"]}
    size="md"
    usage="ui.table-grid"
  />{/snippet}
{#snippet opStartsWith()}<Icon
    name={TABLE_ICON_MAP["op-startsWith"]}
    size="md"
    usage="ui.table-grid"
  />{/snippet}
{#snippet opGreaterThan()}<Icon
    name={TABLE_ICON_MAP["op-greaterThan"]}
    size="md"
    usage="ui.table-grid"
  />{/snippet}

{@render children({
  sort,
  "sort-asc": sortAsc,
  "sort-desc": sortDesc,
  filter,
  menu,
  group,
  x,
  "chevron-down": chevronDown,
  autosize,
  columns,
  reset,
  "pagination-first": paginationFirst,
  "pagination-prev": paginationPrev,
  "pagination-next": paginationNext,
  "pagination-last": paginationLast,
  "op-startsWith": opStartsWith,
  "op-greaterThan": opGreaterThan,
})}
