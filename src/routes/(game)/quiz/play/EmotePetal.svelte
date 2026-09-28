<script lang="ts">
  import type { Snippet } from "svelte";
  import { Spring } from "svelte/motion";

  /**
   * A single fan petal: springs in from the tap point to its fan offset on
   * mount, staggered by index. Reduced motion appears at the offset at rest.
   */
  let {
    dx,
    dy,
    index,
    size,
    reducedMotion,
    children,
  }: {
    dx: number;
    dy: number;
    index: number;
    /** Icon size in px; the wrapper is centred on the tap point by half of it. */
    size: number;
    reducedMotion: boolean;
    children: Snippet;
  } = $props();

  const spring = new Spring({ x: 0, y: 0, scale: 0 });

  // Single source for the stagger delay: the data attribute below and the
  // timer read the same value.
  const staggerMs = $derived(index * 20);

  // Spring config follows the OS setting, so a mid-session toggle takes
  // effect on the next frame rather than at the next fan.
  $effect(() => {
    spring.stiffness = reducedMotion ? 1 : 0.12;
    spring.damping = reducedMotion ? 1 : 0.42;
  });

  let staggerTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (reducedMotion) {
      spring.set({ x: dx, y: dy, scale: 1 }, { instant: true });
      return;
    }
    staggerTimer = setTimeout(() => {
      staggerTimer = null;
      spring.target = { x: dx, y: dy, scale: 1 };
    }, staggerMs);
    return () => {
      if (staggerTimer) {
        clearTimeout(staggerTimer);
        staggerTimer = null;
      }
    };
  });
</script>

<div
  class="pointer-events-auto absolute"
  data-stagger-ms={staggerMs}
  style="left:{-size / 2}px;top:{-size / 2}px;transform:translate({spring.current.x}px, {spring.current.y}px) scale({spring.current.scale})"
>
  {@render children()}
</div>
