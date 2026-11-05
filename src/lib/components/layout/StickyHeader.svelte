<script lang="ts">
  import type { Snippet } from "svelte";
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

  let progress = $state(0);
  let stickyEl: HTMLDivElement | undefined = $state();
  let sentinel: HTMLDivElement | undefined = $state();
  let curtainEl: HTMLDivElement | undefined = $state();

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

  // Curtain progress, linked to scroll. The 1px sentinel marks the header's
  // natural top, so the header sticks when the sentinel leaves the top of the
  // viewport. From there the curtain comes in over one band height of scroll,
  // in step with the first content passing under the header, and goes back
  // out the same way. Before that (e.g. the wordmark still above it) the
  // header scrolls with the page and needs no curtain.
  $effect(() => {
    const marker = sentinel;
    const curtain = curtainEl;
    if (!marker || !curtain) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const past = -marker.getBoundingClientRect().top;
      const distance = curtain.offsetHeight || 1;
      progress = Math.min(1, Math.max(0, past / distance));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    const listeners = new AbortController();
    const { signal } = listeners;
    window.addEventListener("scroll", schedule, { passive: true, signal });
    window.addEventListener("resize", schedule, { passive: true, signal });
    return () => {
      cancelAnimationFrame(frame);
      listeners.abort();
    };
  });
</script>

<div bind:this={sentinel} class="h-px -mb-px" aria-hidden="true"></div>
<div bind:this={stickyEl} class={cn([`sticky top-0 w-full flex items-center`, className])}>
  <div
    bind:this={curtainEl}
    class="sky-curtain absolute inset-x-0 top-0 -bottom-12 z-10"
    class:is-shown={progress > 0}
    style:--curtain-progress={progress}
    aria-hidden="true"
  >
    <svg class="fixed inset-0 h-full w-full" preserveAspectRatio="none">
      <rect width="100%" height="100%" class="sky-curtain-fill"></rect>
    </svg>
    <div class="bg-noise-10 fixed inset-0 opacity-50"></div>
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
  /* Sky curtain: once the header is stuck, the band repaints the sky over
     the content, so the content slides behind the sky and the nav sits on
     clean sky in every phase. The svg and noise are `fixed` to the viewport,
     the same box as the root layout's sky layer, so `#grad-sky`
     (Background.svelte) and the noise tile land pixel-aligned with the sky
     behind; `clip-path` crops them to the band. Clouds, stars and birds are
     not copied — they pass under the band with the content. Without the sky
     chunk the fill falls back to the theme background. The overhang
     (`-bottom-12`) fades out, so content dissolves into the sky instead of
     meeting a hard edge. */
  /* Reveal: the mask is twice the band's height — sky on top, the 3rem fade,
     then empty. `--curtain-progress` (0–1, set from scroll) slides it from
     the empty half (`0 100%`) to the sky half (`0 0`), lowering the fading
     edge down the band as content scrolls under it. The band is `hidden` at
     0, so it never blocks clicks on the content under it. */
  .sky-curtain {
    visibility: hidden;
    clip-path: inset(0);
    mask-image: linear-gradient(to bottom, black calc(50% - 3rem), transparent 50%);
    mask-size: 100% 200%;
    mask-repeat: no-repeat;
    mask-position: 0 calc((1 - var(--curtain-progress, 0)) * 100%);
  }

  .sky-curtain.is-shown {
    visibility: visible;
  }

  .sky-curtain-fill {
    fill: url(#grad-sky) var(--color-background);
  }
</style>
