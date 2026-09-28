<script lang="ts">
  import type { Snippet } from "svelte";
  import { computeAnchoredPosition, type Placement } from "@/lib/positioning.js";
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";

  /**
   * Anchored panel over the native popover API (top layer, so it never grows
   * the layout it sits in — the footer stays put). Positioning is JS, shared
   * with the tooltip via `computeAnchoredPosition`: it sits below its anchor
   * and flips above when there is not enough room below, then clamps inside
   * the viewport (16px safe zone, matching the tooltip). An arrow points back
   * at the anchor; a close button is shown when `onClose` is given. The parent
   * drives open/close with `togglePopover()`.
   */
  let {
    id,
    anchorEl = null,
    title,
    placement = "bottom",
    onClose,
    class: className = "",
    children,
  }: {
    id: string;
    /** Trigger element the panel is measured against. */
    anchorEl?: HTMLElement | null;
    title?: string;
    placement?: Placement;
    onClose?: () => void;
    class?: string;
    children?: Snippet;
  } = $props();

  const SAFEZONE = 16;
  const ARROW_INSET = 24; // keep the arrow off the rounded corners (rounded-3xl)

  const titleId = $derived(`${id}-title`);
  let panel = $state<HTMLElement | null>(null);
  let open = $state(false);
  // Actual side after positioning; recomputed on open, so the initial value is
  // only a placeholder before the panel is first shown.
  let side = $state<Placement>("bottom");
  let arrowLeft = $state(0);

  function position(preferred: Placement) {
    if (!panel || !anchorEl) return;
    const a = anchorEl.getBoundingClientRect();
    // offsetWidth/Height (untransformed layout size), not getBoundingClientRect
    // (which reports the transformed box) — robust to any transform on the panel.
    const panelW = panel.offsetWidth;
    const panelH = panel.offsetHeight;
    const result = computeAnchoredPosition({
      anchor: { top: a.top, bottom: a.bottom, left: a.left, right: a.right },
      panel: { width: panelW, height: panelH },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      placement: preferred,
      safezone: SAFEZONE,
    });
    panel.style.top = `${result.top}px`;
    panel.style.left = `${result.left}px`;
    side = result.placement;
    const anchorCenter = (a.left + a.right) / 2;
    arrowLeft = Math.max(
      ARROW_INSET,
      Math.min(anchorCenter - result.left, panelW - ARROW_INSET),
    );
  }

  function onToggle(e: ToggleEvent) {
    open = e.newState === "open";
    // Measure after the panel is in the top layer and laid out.
    if (open) requestAnimationFrame(() => position(placement));
  }

  // While open, keep the panel pinned to its anchor through scroll and resize.
  $effect(() => {
    if (!open) return;
    const handler = () => position(placement);
    window.addEventListener("scroll", handler, { capture: true, passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, { capture: true });
      window.removeEventListener("resize", handler);
    };
  });
</script>

<div
  bind:this={panel}
  {id}
  popover="manual"
  role="dialog"
  aria-labelledby={titleId}
  ontoggle={onToggle}
  class="popover-panel border border-border bg-background rounded-3xl corner-shape-squircle shadow-xl p-4 text-foreground {className}"
>
  <span
    aria-hidden="true"
    class="pointer-events-none absolute size-3 -translate-x-1/2 rotate-45 rounded-[2px] border border-border bg-background {side ===
    'bottom'
      ? 'border-r-0 border-b-0'
      : 'border-t-0 border-l-0'}"
    style={side === "bottom"
      ? `top:-6px;left:${arrowLeft}px`
      : `bottom:-6px;left:${arrowLeft}px`}
  ></span>

  {#if title || onClose}
    <div class="flex shrink-0 items-center justify-between gap-2">
      {#if title}
        <h2 id={titleId} class="font-semibold">{title}</h2>
      {:else}
        <span id={titleId} class="sr-only">Dialog</span>
      {/if}
      {#if onClose}
        <Button
          unstyled
          type="button"
          aria-label="Close"
          onclick={onClose}
          class="-mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-foreground-darker transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          <Icon name="close" class="size-4" />
        </Button>
      {/if}
    </div>
  {:else}
    <span id={titleId} class="sr-only">Dialog</span>
  {/if}
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
    {@render children?.()}
  </div>
</div>

<style>
  /* Shown/hidden instantly by the popover API — no transform or opacity
     transition (which is also why positioning can measure the true size on the
     first frame). Display is driven by the popover state, NOT a `flex` utility:
     the UA rule [popover]:not(:popover-open){display:none} hides a closed panel,
     and it becomes a flex column only when open. (A `flex` utility on the class
     would beat that UA rule and leave every closed panel visible at 0,0.) */
  .popover-panel {
    position: fixed;
    top: 0;
    left: 0;
    width: min(300px, calc(100vw - 2rem));
    max-height: min(70vh, calc(100vh - 2rem));
    margin: 0;
    /* The UA stylesheet sets [popover] { overflow: auto }; the arrow sits
       outside the panel box, so leave overflow visible and let the inner
       content div own scrolling for tall panels. */
    overflow: visible;
  }

  .popover-panel:popover-open {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
