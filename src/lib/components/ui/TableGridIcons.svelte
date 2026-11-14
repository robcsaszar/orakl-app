<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  import { TABLE_ICON_MAP } from "./table-icons";

  let { children }: { children: Snippet<[Record<string, Snippet>]> } =
    $props();
</script>

{#snippet sort()}<Icon name={TABLE_ICON_MAP.sort} size="md" />{/snippet}
{#snippet sortAsc()}<Icon name={TABLE_ICON_MAP["sort-asc"]} size="md" />{/snippet}
{#snippet sortDesc()}<Icon name={TABLE_ICON_MAP["sort-desc"]} size="md" />{/snippet}
{#snippet filter()}<Icon name={TABLE_ICON_MAP.filter} size="md" />{/snippet}
{#snippet menu()}<Icon name={TABLE_ICON_MAP.menu} size="md" />{/snippet}
{#snippet group()}<Icon name={TABLE_ICON_MAP.group} size="md" />{/snippet}
{#snippet x()}<Icon name={TABLE_ICON_MAP.x} size="md" />{/snippet}
{#snippet chevronDown()}<Icon name={TABLE_ICON_MAP["chevron-down"]} size="md" />{/snippet}
{#snippet autosize()}<Icon name={TABLE_ICON_MAP.autosize} size="md" />{/snippet}
{#snippet columns()}<Icon name={TABLE_ICON_MAP.columns} size="md" />{/snippet}
{#snippet reset()}<Icon name={TABLE_ICON_MAP.reset} size="md" />{/snippet}
{#snippet paginationFirst()}<Icon
    name={TABLE_ICON_MAP["pagination-first"]}
    size="md"
  />{/snippet}
{#snippet paginationPrev()}<Icon
    name={TABLE_ICON_MAP["pagination-prev"]}
    size="md"
  />{/snippet}
{#snippet paginationNext()}<Icon
    name={TABLE_ICON_MAP["pagination-next"]}
    size="md"
  />{/snippet}
{#snippet paginationLast()}<Icon
    name={TABLE_ICON_MAP["pagination-last"]}
    size="md"
  />{/snippet}
{#snippet opStartsWith()}<Icon
    name={TABLE_ICON_MAP["op-startsWith"]}
    size="md"
  />{/snippet}
{#snippet opGreaterThan()}<Icon
    name={TABLE_ICON_MAP["op-greaterThan"]}
    size="md"
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
