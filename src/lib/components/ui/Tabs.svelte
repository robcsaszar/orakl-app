<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn, tv } from "tailwind-variants";
  import Icon from "$lib/components/ui/Icon.svelte";

  const tabVariants = tv({
    // A tab, not a button: plain text on the row's rule, the open one marked by a
    // bar that sits on that rule (`after`). `before` widens the tap target.
    base: "relative flex shrink-0 whitespace-nowrap items-center gap-1 rounded-lg px-3 pt-1 pb-2.5 text-sm text-foreground-darker hover:text-foreground before:absolute before:inset-x-0 before:-top-2 before:bottom-0 before:content-[''] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  });

  let {
    tabs,
    selected,
    onSelect,
    label,
    panel,
    aside,
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
    /** Content at the row's far end, on the row's own rule (tools that go with the tabs). The tabs take the room that is left and scroll within it. */
    aside?: Snippet;
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
    const listeners = new AbortController();
    const { signal } = listeners;
    el.addEventListener("scroll", measure, { passive: true, signal });
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(el);
      for (const tab of el.querySelectorAll('[role="tab"]')) observer.observe(tab);
    }
    document.fonts?.ready.then(measure);
    return () => {
      listeners.abort();
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

  /** Scrolls the row half its width toward a chevron; a pointer asked, so it glides unless motion is reduced. */
  function scrollRow(direction: -1 | 1) {
    const el = listEl;
    if (!el) return;
    const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy?.({ left: direction * el.clientWidth * 0.5, behavior: reduced ? "instant" : "smooth" });
  }

  // Keyboard-driven, so instant: no animated scroll on a key press.
  function reveal(tab: HTMLElement | undefined) {
    tab?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
  }
</script>

<!-- Tablist and panel share one root so the row reads as part of the panel it
     controls. The scroller carries padding pulled back by margin, so a pill's
     focus ring (ring + offset) is not clipped by overflow-x; the 8px vertical
     padding matches the tabs' `before:-top-2` tap target, which stops at the
     tab's foot so the row never scrolls up and down; the
     row's bottom rule is the line the open tab's bar sits on. The edge
     fade is a CSS mask on the scroller itself, clear under the chevron and
     running five rem in: the page behind the row is a sky
     gradient, so a painted fade would show a seam. -->
<div class={cn("flex flex-col gap-4", className)}>
  <!-- With an aside, the rule is the row's own, so it runs unbroken under the tabs and the aside. -->
  <div class={aside ? "flex items-end border-b border-secondary/20" : "contents"}>
  <div class={cn("relative", aside && "min-w-0 flex-1", bleed)}>
    <div
      bind:this={listEl}
      role="tablist"
      aria-label={label}
      class={cn(
        "flex flex-nowrap gap-1 overflow-x-auto px-1 -mx-1 pt-2 -mt-2 scroll-px-1 scrollbar-none",
        !aside && "border-b border-secondary/20",
        bleed,
        canScrollLeft && "mask-l-from-[calc(100%-5rem)] mask-l-to-[calc(100%-1.5rem)]",
        canScrollRight && "mask-r-from-[calc(100%-5rem)] mask-r-to-[calc(100%-1.5rem)]",
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
          class: isSelected ? "text-foreground font-medium after:bg-primary" : "",
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
    <!-- The chevrons scroll the row for a pointer. Out of the tab order: the
         arrow keys already walk the tabs and bring each into view. -->
    {#if canScrollLeft}
      <button
        type="button"
        tabindex="-1"
        aria-label="Show earlier tabs"
        class="absolute inset-y-0 -left-1 flex w-8 cursor-pointer items-center justify-start text-foreground-darker hover:text-foreground before:absolute before:-inset-y-2 before:inset-x-0"
        onclick={() => scrollRow(-1)}
      >
        <Icon name="prev" size="sm" usage="ui.tabs-scroll-prev" />
      </button>
    {/if}
    {#if canScrollRight}
      <button
        type="button"
        tabindex="-1"
        aria-label="Show more tabs"
        class="absolute inset-y-0 -right-1 flex w-8 cursor-pointer items-center justify-end text-foreground-darker hover:text-foreground before:absolute before:-inset-y-2 before:inset-x-0"
        onclick={() => scrollRow(1)}
      >
        <Icon name="next" size="sm" usage="ui.tabs-scroll-next" />
      </button>
    {/if}
  </div>
  {#if aside}
    <div class="flex shrink-0 items-center self-stretch">{@render aside()}</div>
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
