<script lang="ts">
  import type { Snippet } from "svelte";
  import Button from "./Button.svelte";
  import Icon from "./Icon.svelte";
  import Popover from "./Popover.svelte";

  /**
   * An icon button that opens a `Popover` anchored to it — the shared shape for
   * the footer's use-case notice and analytics control. Handles toggle, Escape
   * and outside-click dismissal; positioning (flip + clamp) lives in `Popover`.
   * `open` is bindable so a parent can close it (e.g. on navigation).
   */
  let {
    id,
    icon,
    ariaLabel,
    title,
    buttonClass = "",
    shine = false,
    placement = "bottom",
    open = $bindable(false),
    children,
  }: {
    id: string;
    icon: string;
    ariaLabel: string;
    title?: string;
    buttonClass?: string;
    shine?: boolean;
    placement?: "top" | "bottom";
    open?: boolean;
    children?: Snippet;
  } = $props();

  let trigger = $state<HTMLElement | null>(null);
  // Non-reactive record of what we last told the native popover, so `open`
  // stays the single source of truth without re-invoking show/hide (showPopover
  // throws if the popover is already open).
  let applied = false;

  function panelEl() {
    return document.getElementById(id);
  }

  $effect(() => {
    const el = panelEl();
    if (!el) return;
    if (open && !applied) {
      el.showPopover?.();
      applied = true;
    } else if (!open && applied) {
      el.hidePopover?.();
      applied = false;
    }
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") open = false;
  }
  // Dismiss on a tap/click outside — not pointerdown, so a touch scroll or
  // pinch that starts on the page never closes the popover; only a real tap
  // outside does.
  function onOutsideClick(e: MouseEvent) {
    if (!open) return;
    const target = e.target as Node | null;
    if (trigger?.contains(target) || panelEl()?.contains(target)) return;
    open = false;
  }
</script>

<svelte:window onkeydown={onKeydown} onclick={onOutsideClick} />

<span bind:this={trigger} class="inline-flex items-center">
  <Button
    unstyled
    type="button"
    aria-label={ariaLabel}
    aria-controls={id}
    aria-expanded={open}
    data-shine={shine ? "true" : undefined}
    onclick={() => (open = !open)}
    class={buttonClass}
  >
    <Icon name={icon} class="size-4" />
  </Button>
</span>
<Popover
  {id}
  anchorEl={trigger}
  {title}
  {placement}
  onClose={() => (open = false)}
>
  {@render children?.()}
</Popover>
