<script lang="ts">
  import { onMount } from "svelte";

  let {
    class: className = "",
    children,
  }: {
    class?: string;
    children?: import("svelte").Snippet;
  } = $props();

  let footerEl: HTMLDivElement;
  let isPinned = $state(false);

  onMount(() => {
    if (!footerEl) return;

    let rafId: number | null = null;

    // rAF-coalesced: multiple scroll/resize events per frame reduce to one DOM read
    const update = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        isPinned = scrollTop + clientHeight < scrollHeight - 2;
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", update);
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  });
</script>

<div
  bind:this={footerEl}
  class="sticky bottom-4 inset-x-0 z-30 w-auto -mx-5 md:-mx-8 rounded-3xl corner-shape-squircle overflow-hidden shadow-button transition-shadow backdrop-blur-md {isPinned ? 'bg-background/80 shadow-secondary-800' : 'bg-transparent shadow-transparent'} {className}"
>
  <div class="w-full relative z-20">
    {#if children}
      {@render children()}
    {/if}
  </div>
  <div class="absolute inset-0 bg-noise-10 {isPinned ? 'opacity-50' : 'opacity-0'}" aria-hidden="true"></div>
</div>
