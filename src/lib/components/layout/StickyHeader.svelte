<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import ProgressiveBlur from "$lib/components/ui/partials/ProgressiveBlur.svelte";
  import { cn } from 'tailwind-variants';

  let {
    class: className = "",
    children,
    logo,
  }: {
    class?: string;
    children?: Snippet;
    logo?: Snippet;
  } = $props();

  let scrolled = $state(false);
  let ticking = false;
  let stickyEl: HTMLDivElement | undefined = $state();

  // Publishes the sticky band's rendered height as `--sticky-header-height`
  // on the document root, so siblings outside this subtree (e.g. the curator
  // toolbox rail) can offset against the real header instead of a guess.
  $effect(() => {
    const el = stickyEl;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--sticky-header-height", `${el.clientHeight}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--sticky-header-height");
    };
  });

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      scrolled = window.scrollY > 0;
      ticking = false;
    });
  }

  onMount(() => {
    // CSS handles the reveal natively where scroll-driven animations are
    // supported; only Firefox etc. need this JS fallback.
    if (CSS.supports?.("animation-timeline: scroll()")) return;
    scrolled = window.scrollY > 0;
    window.addEventListener("scroll", onScroll, { passive: true });
  });

  onDestroy(() => {
    if (typeof window === "undefined") return;
    window.removeEventListener("scroll", onScroll);
  });
</script>

<div bind:this={stickyEl} class={cn([`sticky top-0 w-full flex items-center`, className])}>
  <div
    class="absolute inset-x-0 top-0 -bottom-12 z-10 progressive-blur-reveal"
    class:is-scrolled={scrolled}
  >
    <ProgressiveBlur direction="up" showNoise={false} maxBlur={64} class="absolute inset-0" />
  </div>
  <div class={cn([`container w-full max-w-page relative z-20 md:px-0 px-8`])}>
    {#if logo}
      <div class="flex justify-center py-4">
        {@render logo()}
      </div>
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style>
  /* Hidden until scrolled; JS toggles `.is-scrolled` as a fallback where
     scroll-driven animations aren't supported (e.g. Firefox).
     The band overhangs the header (`-bottom-12`) so the ramp's tail falls
     below it — boxed to the header, the links sat in the weak end of the ramp
     and read as unblurred. Separation comes from blur alone, never a tint:
     `maxBlur` is high enough to dissolve content into a smooth wash, which
     keeps the sky legible where a scrim would have flattened it.
     Revealed with `visibility`, never `opacity`: an ancestor whose opacity is
     animated becomes a backdrop root in Chromium, which empties the backdrop
     the ProgressiveBlur layers filter — the blur silently disappears. */
  .progressive-blur-reveal {
    visibility: hidden;
  }

  .progressive-blur-reveal.is-scrolled {
    visibility: visible;
  }

  @supports (animation-timeline: scroll()) {
    .progressive-blur-reveal {
      animation: reveal-sticky-blur linear both;
      animation-timeline: scroll(root block);
      animation-range: 0 1px;
    }
  }

  @keyframes reveal-sticky-blur {
    to {
      visibility: visible;
    }
  }
</style>
