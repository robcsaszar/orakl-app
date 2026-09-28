<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn, tv } from "tailwind-variants";
  import Icon from "$lib/components/ui/Icon.svelte";

  const tabVariants = tv({
    base: "relative flex shrink-0 whitespace-nowrap items-center gap-1 rounded-2xl px-3 py-1 text-sm text-foreground-darker hover:text-foreground corner-shape-squircle before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  });

  let {
    tabs,
    selected,
    onSelect,
    label,
    panel,
    class: className = "",
    panelClass = "",
    bleed = "",
  }: {
    tabs: readonly { key: string; label: string }[];
    selected: string;
    onSelect: (key: string) => void;
    /** Accessible name of the tablist */
    label: string;
    panel: Snippet<[key: string]>;
    class?: string;
    /** Classes on the mounted tabpanel — the consumer owns its content layout */
    panelClass?: string;
    /**
     * Horizontal margin/padding pair that lets the row run into the page
     * gutter on narrow screens (e.g. `-mx-8 px-8 scroll-px-8 md:-mx-1 md:px-1
     * md:scroll-px-1`), so more pills fit before the row scrolls
     */
    bleed?: string;
  } = $props();

  const uid = $props.id();

  let listEl: HTMLDivElement | undefined = $state();
  let canScrollLeft = $state(false);
  let canScrollRight = $state(false);

  function measure() {
    const el = listEl;
    if (!el) return;
    canScrollLeft = el.scrollLeft > 1;
    canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  }

  $effect(() => {
    const el = listEl;
    if (!el) return;
    // Read the tab count so a row that grows after mount re-measures; the
    // observer watches every pill too, since content growth (a web font
    // landing) leaves the scroller's own box unchanged.
    void tabs.length;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(el);
      for (const tab of el.querySelectorAll('[role="tab"]')) observer.observe(tab);
    }
    document.fonts?.ready.then(measure);
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  });

  // A deep link or an outside change can select a pill that sits past the
  // scrolled edge; bring it into view so the row shows what is open.
  $effect(() => {
    void selected;
    const show = () =>
      reveal(listEl?.querySelector<HTMLElement>('[aria-selected="true"]') ?? undefined);
    show();
    // Pill widths settle once the web font lands; reveal again then.
    document.fonts?.ready.then(show);
  });

  function onKeydown(e: KeyboardEvent, index: number) {
    const n = tabs.length;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % n;
    else if (e.key === "ArrowLeft") next = (index - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    onSelect(tabs[next].key);
    const list = (e.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>(
      '[role="tab"]',
    );
    const nextTab = list?.[next];
    nextTab?.focus();
    reveal(nextTab);
  }

  // Keyboard-driven, so instant: no animated scroll on a key press.
  function reveal(tab: HTMLElement | undefined) {
    tab?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
  }
</script>

<!-- Tablist and panel share one root so the row reads as part of the panel it
     controls. The scroller carries 4px of padding pulled back by margin, so a
     pill's focus ring (ring + offset) is not clipped by overflow-x. The edge
     fade is a CSS mask on the scroller itself: the page behind the row is a sky
     gradient, so a painted fade would show a seam. -->
<div class={cn("flex flex-col gap-4", className)}>
  <div class={cn("relative", bleed)}>
    <div
      bind:this={listEl}
      role="tablist"
      aria-label={label}
      class={cn(
        "flex flex-nowrap gap-2 overflow-x-auto px-1 -mx-1 py-1 -my-1 scroll-px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        bleed,
        canScrollLeft && "mask-l-from-[calc(100%-2.5rem)]",
        canScrollRight && "mask-r-from-[calc(100%-2.5rem)]",
      )}
    >
    {#each tabs as t, i (t.key)}
      {@const isSelected = t.key === selected}
      <button
        type="button"
        role="tab"
        id="{uid}-tab-{t.key}"
        aria-selected={isSelected}
        aria-controls="{uid}-panel-{t.key}"
        tabindex={isSelected ? 0 : -1}
        class={tabVariants({
          class: isSelected ? "bg-primary text-background hover:text-background" : "",
        })}
        onclick={(e) => {
          onSelect(t.key);
          reveal(e.currentTarget);
        }}
        onkeydown={(e) => onKeydown(e, i)}
      >
        {t.label}
      </button>
    {/each}
    </div>
    {#if canScrollLeft}
      <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none">
        <span aria-hidden="true"><Icon name="chevron-left" class="size-4 text-foreground-darker" /></span>
      </div>
    {/if}
    {#if canScrollRight}
      <div class="absolute inset-y-0 right-0 flex items-center pointer-events-none">
        <span aria-hidden="true"><Icon name="chevron-right" class="size-4 text-foreground-darker" /></span>
      </div>
    {/if}
  </div>
  {#each tabs as t (t.key)}
    {#if t.key === selected}
      <div
        role="tabpanel"
        id="{uid}-panel-{t.key}"
        aria-labelledby="{uid}-tab-{t.key}"
        class={panelClass}
      >
        {@render panel(t.key)}
      </div>
    {/if}
  {/each}
</div>
