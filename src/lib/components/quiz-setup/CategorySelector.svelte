<script lang="ts">
import { percent } from "@orakl/shared";
  import { untrack, onDestroy, onMount } from "svelte";
  import type { Category } from "@/types/category.js";
  import Button from "$lib/components/ui/Button.svelte";
  import CheckboxOption from "$lib/components/ui/CheckboxOption.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  
  import { prefersReducedMotion } from "$lib/motion-prefs.js";
  import { cn } from "tailwind-variants";

  let {
    categories = [],
    selected = $bindable<string[]>([]),
    descriptionId,
    maxSelected,
  }: {
    categories: Category[];
    selected?: string[];
    descriptionId?: string;
    /** Cap on simultaneous selections (e.g. guest entitlement). */
    maxSelected?: number;
  } = $props();

  const sortedCategories = $derived([...categories].sort((a, b) => b.count - a.count));
  const allIds = $derived(sortedCategories.map((c) => c.id));

  // At the cap, unselected categories lock (guests can still swap their picks).
  const atCap = $derived(maxSelected != null && selected.length >= maxSelected);

  const COLLAPSE_HEIGHT = 300;
  let expanded = $state(false);
  let overflows = $state(false);
  let gridEl = $state<HTMLElement | undefined>(undefined);
  let displayedPcts = $state<Record<string, number>>({});
  const rafs = new Map<string, number>();

  const realPcts = $derived.by(() => {
    const total = sortedCategories
      .filter((c) => selected.includes(c.id))
      .reduce((sum, c) => sum + c.count, 0);
    return Object.fromEntries(
      sortedCategories.map((c) => [
        c.id,
        total === 0 || !selected.includes(c.id)
          ? 0
          : percent(c.count, total),
      ])
    );
  });

  $effect(() => {
    const snapshot = { ...realPcts };
    untrack(() => {
      for (const [id, to] of Object.entries(snapshot)) {
        const from = displayedPcts[id] ?? 0;
        if (to !== from) animate(id, from, to);
      }
    });
  });

  function animate(id: string, from: number, to: number) {
    const existing = rafs.get(id);
    if (existing) cancelAnimationFrame(existing);
    if (prefersReducedMotion()) {
      displayedPcts[id] = to;
      return;
    }
    const t0 = performance.now();
    const duration = 400;
    const step = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - (1 - p) ** 3;
      displayedPcts[id] = Math.round(from + (to - from) * eased);
      if (p < 1) rafs.set(id, requestAnimationFrame(step));
      else rafs.delete(id);
    };
    rafs.set(id, requestAnimationFrame(step));
  }

  let ro: ResizeObserver | undefined;

  onMount(() => {
    if (!gridEl) return;
    ro = new ResizeObserver(() => {
      if (gridEl) overflows = gridEl.scrollHeight > COLLAPSE_HEIGHT;
    });
    ro.observe(gridEl);
  });

  onDestroy(() => {
    ro?.disconnect();
    for (const raf of rafs.values()) cancelAnimationFrame(raf);
  });

  function setSelected(id: string, on: boolean) {
    selected = on ? [...selected, id] : selected.filter((x) => x !== id);
  }

  function toggleAll() {
    selected = selected.length === allIds.length ? [] : [...allIds];
  }

  function invertSelection() {
    selected = allIds.filter((id) => !selected.includes(id));
  }
</script>

<div class="flex flex-col gap-2">
  <!-- Select all / Invert — bulk actions don't apply under a selection cap -->
  {#if maxSelected == null}
    <div class="flex gap-2 flex-wrap">
      <Button type="button" variant="outline" intent="compact" onclick={toggleAll}>
        {selected.length === allIds.length ? "Deselect all" : "Select all"}
      </Button>
      <Button type="button" variant="outline" intent="compact" onclick={invertSelection}>Invert selection</Button>
    </div>
  {:else}
    <p class="text-sm text-foreground-darker">
      Choose up to {maxSelected} categories — sign in to pick more.
    </p>
  {/if}

  <!-- Category grid (expandable) -->
  <div class="relative -mx-2">
    <div
      bind:this={gridEl}
      class={cn(["gap-4 p-2 bg-secondary/5 rounded-3xl border-2 border-transparent corner-shape-squircle overflow-hidden motion-safe:transition-[clip-path] motion-safe:duration-200 motion-safe:ease-ease-in-out-quart isolate grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1", overflows && !expanded && "border-secondary/10 mask-b-from-[calc(100%-5rem)] mask-b-to-100%"])}
      style:max-height={expanded || !overflows ? "1000px" : `${COLLAPSE_HEIGHT}px`}
      style:clip-path={expanded || !overflows ? "inset(0)" : `inset(0 0 calc(100% - ${COLLAPSE_HEIGHT}px) 0)`}
    >
      {#each sortedCategories as category (category.id)}
        {@const pct = displayedPcts[category.id] ?? 0}
        {@const locked = atCap && !selected.includes(category.id)}
        <CheckboxOption
          variant="tile"
          {locked}
          id={`category-${category.id}`}
          name="categories"
          value={category.id}
          checked={selected.includes(category.id)}
          disabled={locked}
          describedBy={descriptionId}
          onchange={(e) => setSelected(category.id, e.currentTarget.checked)}
          aria-disabled={locked || undefined}
        >
          <span class="flex items-start gap-4 flex-1 z-10">
            <span class="flex flex-col gap-1 flex-1">
              <span class="text-foreground">{category.name}</span>
              <span class="font-sans text-sm text-current flex gap-1 flex-wrap">
                <span>{category.count} questions</span>
                <span
                  class="text-secondary-300 font-semibold"
                  class:opacity-50={pct === 0}
                >
                  <span class="sr-only">Selection probability: </span>
                  <span class="font-bold inline-flex w-[3ch] tabular-nums">{pct}%</span>
                  <span class="sr-only"> chance</span>
                </span>
              </span>
            </span>
            <span
              class="inline-flex items-center justify-center {locked ? 'opacity-70' : 'opacity-10 group-hover:opacity-30 group-has-checked:opacity-100'}"
            >
              <Icon name={locked ? "lock" : "scroll"} class="size-5" />
            </span>
          </span>
        </CheckboxOption>
      {/each}
    </div>
  </div>

  {#if overflows}
    <Button
      type="button"
      variant="ghost"
      intent="compact"
      class="self-start text-foreground-darker hover:text-foreground"
      onclick={() => (expanded = !expanded)}
      aria-expanded={expanded}
      aria-label={expanded ? "Show less categories" : "Show more categories"}
      iconBefore={expanded ? "chevron-up" : "chevron-down"}
    >
      {expanded ? "Show less" : "Show more"}
    </Button>
  {/if}
</div>
