<!--
  Saved settings shown as a tree to read, not a field to type in: each object
  and list folds, and starts shut below the top, so a large sky stays short.
-->
<script lang="ts">
  import Button from "@/lib/components/ui/Button.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import Self from "./SkyJson.svelte";

  /** Entries of one list or object shown before "and n more". */
  const SHOWN = 100;

  let {
    value,
    name,
    depth = 0,
  }: {
    value: unknown;
    /** The key this value sits under; none for the top. */
    name?: string;
    depth?: number;
  } = $props();

  // svelte-ignore state_referenced_locally
  let open = $state(depth === 0);
  const nested = $derived(typeof value === "object" && value !== null);
  const list = $derived(Array.isArray(value));
  const entries = $derived(nested ? Object.entries(value as object) : []);
  const count = $derived(`${entries.length} ${list ? (entries.length === 1 ? "item" : "items") : entries.length === 1 ? "key" : "keys"}`);
</script>

{#snippet key()}
  {#if name !== undefined}<span class="text-foreground">{name}</span><span class="text-foreground-darker">:&nbsp;</span>{/if}
{/snippet}

{#if nested}
  <div>
    <Button
      unstyled
      aria-expanded={open}
      class="-ml-1 flex w-full cursor-pointer items-center gap-1 rounded px-1 text-left hover:bg-secondary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary"
      onclick={() => (open = !open)}
    >
      <Icon name={open ? "expand" : "next"} usage="sky.json-fold" class="shrink-0 text-foreground-darker" size="xs" />
      <span class="min-w-0 truncate">{@render key()}<span class="text-foreground-darker">{open ? (list ? "[" : "{") : list ? `[ ${count} ]` : `{ ${count} }`}</span></span>
    </Button>
    {#if open}
      <div class="ml-1.5 border-l border-secondary/15 pl-3">
        {#each entries.slice(0, SHOWN) as [k, v] (k)}
          <Self value={v} name={list ? undefined : k} depth={depth + 1} />
        {/each}
        {#if entries.length > SHOWN}<p class="pl-4 text-foreground-darker">and {entries.length - SHOWN} more</p>{/if}
      </div>
      <span class="pl-4 text-foreground-darker">{list ? "]" : "}"}</span>
    {/if}
  </div>
{:else}
  <p class="truncate pl-4">
    {@render key()}<span class={typeof value === "string" ? "text-success-light" : typeof value === "number" ? "text-secondary" : "text-warning-light"}>{typeof value === "string" ? `"${value}"` : String(value)}</span>
  </p>
{/if}
