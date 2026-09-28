<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import { TABLE_ICON_MAP } from "./table-icons";

  let { children }: { children: Snippet<[Record<string, Snippet>]> } =
    $props();
</script>

{#snippet sort()}<Icon name={TABLE_ICON_MAP.sort} />{/snippet}
{#snippet sortAsc()}<Icon name={TABLE_ICON_MAP["sort-asc"]} />{/snippet}
{#snippet sortDesc()}<Icon name={TABLE_ICON_MAP["sort-desc"]} />{/snippet}
{#snippet filter()}<Icon name={TABLE_ICON_MAP.filter} />{/snippet}
{#snippet menu()}<Icon name={TABLE_ICON_MAP.menu} />{/snippet}
{#snippet group()}<Icon name={TABLE_ICON_MAP.group} />{/snippet}
{#snippet x()}<Icon name={TABLE_ICON_MAP.x} />{/snippet}
{#snippet chevronDown()}<Icon name={TABLE_ICON_MAP["chevron-down"]} />{/snippet}
{#snippet autosize()}<Icon name={TABLE_ICON_MAP.autosize} />{/snippet}
{#snippet columns()}<Icon name={TABLE_ICON_MAP.columns} />{/snippet}
{#snippet reset()}<Icon name={TABLE_ICON_MAP.reset} />{/snippet}
{#snippet paginationFirst()}<Icon
    name={TABLE_ICON_MAP["pagination-first"]}
  />{/snippet}
{#snippet paginationPrev()}<Icon
    name={TABLE_ICON_MAP["pagination-prev"]}
  />{/snippet}
{#snippet paginationNext()}<Icon
    name={TABLE_ICON_MAP["pagination-next"]}
  />{/snippet}
{#snippet paginationLast()}<Icon
    name={TABLE_ICON_MAP["pagination-last"]}
  />{/snippet}
{#snippet opStartsWith()}<Icon
    name={TABLE_ICON_MAP["op-startsWith"]}
  />{/snippet}
{#snippet opGreaterThan()}<Icon
    name={TABLE_ICON_MAP["op-greaterThan"]}
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
