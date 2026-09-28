<script lang="ts">
import { calculatePercentageOffset } from "@orakl/shared";
  import { onDestroy, onMount } from "svelte";
  
  import { Position } from "@/lib/types/tooltip.types";
  import type { TooltipOptions } from "@/lib/types/tooltip.types";
  import {
    hideTooltipState,
    setTooltipPosition,
    setTooltipScrolling,
    showTooltipState,
    tooltipStore,
  } from "@/lib/svelte/tooltipStore.store";

  const TOOLTIP_OFFSET = 0;
  const ARROW_PROTRUSION = -2;
  const BASE_GAP = 8;

  // Component-local runtime state (timers, DOM refs — not in store)
  let targetElement: HTMLElement | null = null;
  let targetRect: DOMRect | null = null;
  let scrollRafId: number | null = null;
  let currentPosition = Position.BOTTOM;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let trackingFrameId: number | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let scrollTimeout: number | null = null;
  let showTimeout: number | null = null;
  let hideTimeout: number | null = null;
  let autoHideTimeout: number | null = null;
  let currentTimeoutDuration: number | undefined;
  const attachedElements = new WeakSet<HTMLElement>();
  const shownOnceElements = new WeakSet<HTMLElement>();
  let lastShowTime = 0;
  let isAutoShow = false;
  let dismissHandler: ((e: Event) => void) | null = null;
  let hiddenByScroll = false;
  let scrollHiddenContext: {
    target: HTMLElement;
    content: string;
    position: Position;
    showArrow: boolean;
    timeout?: number;
  } | null = null;
  let mutationObserver: MutationObserver | null = null;

  function arrowClass(pos: Position): string {
    switch (pos) {
      case Position.TOP:
        return "-bottom-2 left-(--tooltip-arrow-offset) -translate-x-1/2 rotate-45 border-t-0 border-l-0";
      case Position.LEFT:
        return "-right-2 top-(--tooltip-arrow-offset) -translate-y-1/2 rotate-45 border-b-0 border-l-0";
      case Position.RIGHT:
        return "-left-2 top-(--tooltip-arrow-offset) -translate-y-1/2 rotate-45 border-t-0 border-r-0";
      default:
        return "-top-2 left-(--tooltip-arrow-offset) -translate-x-1/2 rotate-45 border-r-0 border-b-0";
    }
  }

  function updateViewport() {
    viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  }

  function handleScroll() {
    if ($tooltipStore.isVisible && targetElement) {
      // startPositionTracking() already repositions the tooltip via rAF on every
      // frame while the tooltip is visible — calling getBoundingClientRect() +
      // updatePosition() here would be a redundant forced layout reflow on every
      // scroll event (potentially >60 per second). Delegate position sync to the
      // rAF loop and only manage the scrolling-state flag here.
      if (!isAutoShow) {
        if (scrollRafId === null) {
          scrollRafId = requestAnimationFrame(() => {
            scrollRafId = null;
            tooltipStore.update((s) => setTooltipScrolling(s, true));
          });
        }
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(() => {
          tooltipStore.update((s) => setTooltipScrolling(s, false));
          scrollTimeout = null;
        }, 150);
      }
    }
  }

  function handleCustomShow(e: Event) {
    const detail = (e as CustomEvent).detail;
    show(detail.target, detail.content, {
      position: detail.position,
      showArrow: detail.showArrow,
      timeout: detail.timeout,
    });
  }

  function show(
    target: HTMLElement,
    content: string,
    options: TooltipOptions = {},
  ) {
    const st = $tooltipStore;
    if (st.isVisible && targetElement === target && st.content === content) {
      if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
      if (autoHideTimeout) { clearTimeout(autoHideTimeout); autoHideTimeout = null; }
      return;
    }

    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
    if (showTimeout) { clearTimeout(showTimeout); showTimeout = null; }
    if (autoHideTimeout) { clearTimeout(autoHideTimeout); autoHideTimeout = null; }

    const isSwitching = st.isVisible && targetElement && targetElement !== target;
    if (isSwitching) hideImmediate();

    const pos = options.position || Position.BOTTOM;
    const arrow = options.showArrow ?? true;
    currentTimeoutDuration = options.timeout;

    const doShow = () => {
      targetElement = target;
      targetRect = target.getBoundingClientRect();
      currentPosition = pos;
      lastShowTime = Date.now();

      tooltipStore.update((s) => showTooltipState(s, content, pos, arrow));
      updateViewport();
      target.setAttribute("aria-describedby", "orakl-tooltip");
      setupIntersectionObserver();

      if (options.timeout) {
        autoHideTimeout = window.setTimeout(() => hide(), options.timeout);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition();
          startPositionTracking();
        });
      });
    };

    if (isSwitching) {
      doShow();
    } else {
      showTimeout = window.setTimeout(() => {
        showTimeout = null;
        doShow();
      }, 10);
    }
  }

  function getInitialPosition(dimensions: {
    width: number;
    height: number;
    offset: number;
  }): { top: number; left: number } {
    if (!targetRect) return { top: 0, left: 0 };
    const rect = targetRect;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const { width, height, offset } = dimensions;

    switch (currentPosition) {
      case Position.TOP:
        return { top: rect.top - height + offset, left: cx - width / 2 };
      case Position.LEFT:
        return { top: cy - height / 2, left: rect.left - width + offset };
      case Position.RIGHT:
        return { top: cy - height / 2, left: rect.right - offset };
      default:
        return { top: rect.bottom - offset, left: cx - width / 2 };
    }
  }

  function setFallbackPosition(
    position: { top: number; left: number },
    dimensions: { width: number; height: number; offset: number },
  ) {
    if (!targetRect) return;
    const rect = targetRect;
    const { width, height, offset } = dimensions;

    switch (currentPosition) {
      case Position.BOTTOM:
        if (position.top + height > viewportHeight) {
          const alt = rect.top - height + offset;
          if (alt >= 0) { position.top = alt; currentPosition = Position.TOP; }
        }
        break;
      case Position.TOP:
        if (position.top < 0) {
          const alt = rect.bottom - offset;
          if (alt + height <= viewportHeight) { position.top = alt; currentPosition = Position.BOTTOM; }
        }
        break;
      case Position.LEFT:
        if (position.left < 0) {
          const alt = rect.right - offset;
          if (alt + width <= viewportWidth) { position.left = alt; currentPosition = Position.RIGHT; }
        }
        break;
      case Position.RIGHT:
        if (position.left + width > viewportWidth) {
          const alt = rect.left - width + offset;
          if (alt >= 0) { position.left = alt; currentPosition = Position.LEFT; }
        }
        break;
    }
  }

  function calcArrowOffset(
    originalPosition: { top: number; left: number },
    constrainedPosition: { top: number; left: number },
    dimensions: { width: number; height: number },
  ): number {
    if (!targetRect) return 50;
    const rect = targetRect;
    const opts = { defaultOffset: 50, min: 10, max: 90 };
    const { width, height } = dimensions;

    switch (currentPosition) {
      case Position.TOP:
      case Position.BOTTOM:
        if (originalPosition.left !== constrainedPosition.left) {
          const cx = rect.left + rect.width / 2;
          const tcx = constrainedPosition.left + width / 2;
          return calculatePercentageOffset(cx - tcx, width, opts);
        }
        break;
      case Position.LEFT:
      case Position.RIGHT:
        if (originalPosition.top !== constrainedPosition.top) {
          const cy = rect.top + rect.height / 2;
          const tcy = constrainedPosition.top + height / 2;
          return calculatePercentageOffset(cy - tcy, height, opts);
        }
        break;
    }
    return 50;
  }

  function updatePosition() {
    if (!targetRect) return;
    const tooltipEl = document.getElementById("orakl-tooltip");
    if (!tooltipEl) return;

    const tooltipRect = tooltipEl.getBoundingClientRect();
    if (tooltipRect.width === 0 || tooltipRect.height === 0) {
      requestAnimationFrame(() => updatePosition());
      return;
    }

    const st = $tooltipStore;
    const dimensions = {
      width: tooltipRect.width,
      height: tooltipRect.height,
      offset: st.showArrow
        ? TOOLTIP_OFFSET + ARROW_PROTRUSION
        : TOOLTIP_OFFSET + BASE_GAP,
    };

    const pos = getInitialPosition(dimensions);
    setFallbackPosition(pos, dimensions);

    const safezone = 8;
    const orig = { ...pos };
    pos.top = Math.max(safezone, Math.min(pos.top, viewportHeight - dimensions.height - safezone));
    pos.left = Math.max(safezone, Math.min(pos.left, viewportWidth - dimensions.width - safezone));

    const arrowOffset = st.showArrow
      ? calcArrowOffset(orig, pos, dimensions)
      : 50;

    tooltipStore.update((s) =>
      setTooltipPosition(s, pos.top, pos.left, arrowOffset, currentPosition),
    );
  }

  function startPositionTracking() {
    if (!$tooltipStore.isVisible || !targetElement) return;
    const newRect = targetElement.getBoundingClientRect();
    if (
      !targetRect ||
      newRect.top !== targetRect.top ||
      newRect.left !== targetRect.left ||
      newRect.width !== targetRect.width ||
      newRect.height !== targetRect.height
    ) {
      targetRect = newRect;
      updatePosition();
    }
    trackingFrameId = requestAnimationFrame(() => startPositionTracking());
  }

  function setupIntersectionObserver() {
    if (!targetElement) return;
    cleanupIntersectionObserver();
    const observed = targetElement;

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && $tooltipStore.isVisible) {
            scrollHiddenContext = {
              target: observed,
              content: $tooltipStore.content,
              position: currentPosition,
              showArrow: $tooltipStore.showArrow,
              timeout: currentTimeoutDuration,
            };
            hiddenByScroll = true;
            hideImmediate(true);
          } else if (entry.isIntersecting && hiddenByScroll && scrollHiddenContext) {
            const ctx = scrollHiddenContext;
            hiddenByScroll = false;
            scrollHiddenContext = null;
            if (ctx.target.matches(":hover")) {
              show(ctx.target, ctx.content, {
                position: ctx.position,
                showArrow: ctx.showArrow,
                timeout: ctx.timeout,
              });
            }
          }
        });
      },
      { threshold: 0, rootMargin: "0px" },
    );

    intersectionObserver.observe(observed);
  }

  function cleanupIntersectionObserver() {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
  }

  function setupDismissHandler(targetEl: HTMLElement) {
    cleanupDismissHandler();
    dismissHandler = (_e: Event) => {
      hideImmediate();
      isAutoShow = false;
      targetEl.removeAttribute("data-tooltip-show");
      cleanupDismissHandler();
    };
    document.addEventListener("click", dismissHandler, { capture: true, once: true });
  }

  function cleanupDismissHandler() {
    if (dismissHandler) {
      document.removeEventListener("click", dismissHandler, { capture: true });
      dismissHandler = null;
    }
  }

  function setupAutoShowObserver(
    el: HTMLElement,
    content: string,
    position: Position,
    showArrow: boolean,
    timeout?: number,
  ) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            requestAnimationFrame(() => {
              show(el, content, { position, showArrow, timeout });
              isAutoShow = true;
              setupDismissHandler(el);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5, rootMargin: "0px" },
    );
    observer.observe(el);
  }

  function parseTooltipAttrs(el: HTMLElement): {
    content: string | null;
    position: Position;
    showArrow: boolean;
    timeout?: number;
    once: boolean;
  } {
    const content = el.getAttribute("data-tooltip");
    const position =
      (el.getAttribute("data-tooltip-position") as Position) || Position.BOTTOM;
    const showArrow = el.getAttribute("data-tooltip-arrow") !== "false";
    const timeoutAttr = el.getAttribute("data-tooltip-timeout");
    const parsed = timeoutAttr ? parseInt(timeoutAttr, 10) : NaN;
    const timeout =
      !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined;
    const once = el.getAttribute("data-tooltip-once") === "true";
    return { content, position, showArrow, timeout, once };
  }

  function attachTooltipHandlers(el: HTMLElement) {
    if (attachedElements.has(el)) return;
    attachedElements.add(el);

    const showHandler = () => {
      const { content, position, showArrow, timeout, once } = parseTooltipAttrs(el);
      if (!content) return;
      if (once && shownOnceElements.has(el)) return;
      show(el, content, { position, showArrow, timeout });
      if (once) shownOnceElements.add(el);
    };

    const hideHandler = () => {
      hiddenByScroll = false;
      scrollHiddenContext = null;
      hide();
    };

    el.addEventListener("mouseenter", showHandler);
    el.addEventListener("mouseleave", hideHandler);
    el.addEventListener("focus", showHandler);
    el.addEventListener("blur", hideHandler);

    if (el.getAttribute("data-tooltip-show") === "true") {
      const { content, position, showArrow, timeout } = parseTooltipAttrs(el);
      if (content) {
        setupAutoShowObserver(el, content, position, showArrow, timeout);
      }
    }
  }

  function hideImmediate(keepObserver = false) {
    if (showTimeout) { clearTimeout(showTimeout); showTimeout = null; }
    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
    if (autoHideTimeout) { clearTimeout(autoHideTimeout); autoHideTimeout = null; }
    if (targetElement) targetElement.removeAttribute("aria-describedby");
    if (trackingFrameId) { cancelAnimationFrame(trackingFrameId); trackingFrameId = null; }
    if (scrollRafId) { cancelAnimationFrame(scrollRafId); scrollRafId = null; }
    if (scrollTimeout) { clearTimeout(scrollTimeout); scrollTimeout = null; }
    if (!keepObserver) {
      cleanupIntersectionObserver();
      hiddenByScroll = false;
      scrollHiddenContext = null;
    }
    cleanupDismissHandler();
    isAutoShow = false;
    targetElement = null;
    targetRect = null;
    tooltipStore.update((s) => hideTooltipState(s));
  }

  function hide() {
    const timeSinceShow = Date.now() - lastShowTime;
    if (timeSinceShow < 150) return;
    if (showTimeout) { clearTimeout(showTimeout); showTimeout = null; }
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = window.setTimeout(() => hideImmediate(), 100);
  }

  onMount(() => {
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("scroll", handleScroll, { capture: true });
    document.addEventListener("tooltip:show", handleCustomShow);
    document.addEventListener("tooltip:hide", () => hide());

    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>("[data-tooltip]").forEach((el) => {
        attachTooltipHandlers(el);
      });

      mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                const el = node as Element;
                if (el.hasAttribute("data-tooltip")) {
                  attachTooltipHandlers(el as HTMLElement);
                }
                el.querySelectorAll<HTMLElement>("[data-tooltip]").forEach(
                  (child) => { attachTooltipHandlers(child); },
                );
              }
            });
          }
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "data-tooltip"
          ) {
            const el = mutation.target as HTMLElement;
            if (el.hasAttribute("data-tooltip")) {
              attachTooltipHandlers(el);
            }
          }
        });
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-tooltip"],
      });
    });
  });

  onDestroy(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("resize", updateViewport);
    window.removeEventListener("scroll", handleScroll, { capture: true });
    document.removeEventListener("tooltip:show", handleCustomShow);
    mutationObserver?.disconnect();
    mutationObserver = null;
    hideImmediate();
  });

  // Svelte action for declarative use in Svelte components
  export function tooltip(el: HTMLElement, _opts?: TooltipOptions & { content?: string }) {
    attachTooltipHandlers(el);
    return { destroy() {} };
  }
</script>

{#if $tooltipStore.isVisible}
  <div
    id="orakl-tooltip"
    class="fixed z-2000 pointer-events-auto isolate max-w-sm text-foreground text-sm border-2 border-background-lighter bg-background rounded-2xl shadow-xl shadow-background/30 corner-shape-squircle text-pretty"
    class:opacity-0={$tooltipStore.isScrolling || !$tooltipStore.isPositioned}
    class:transition-opacity={$tooltipStore.isPositioned}
    class:duration-150={$tooltipStore.isPositioned}
    style="top: {$tooltipStore.top}px; left: {$tooltipStore.left}px; --tooltip-arrow-offset: {$tooltipStore.arrowOffset}%"
    role="tooltip"
    aria-live="polite"
    aria-label={$tooltipStore.content}
  >
    <div class="p-2 font-sans text-xs">{$tooltipStore.content}</div>
    {#if $tooltipStore.showArrow}
      <span
        aria-hidden="true"
        class="absolute w-3 h-3 bg-background border-background-lighter border-2 rotate-45 rounded-sm {arrowClass($tooltipStore.position)}"
      ></span>
    {/if}
  </div>
{/if}
