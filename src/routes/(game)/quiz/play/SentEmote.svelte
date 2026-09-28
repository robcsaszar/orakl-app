<script lang="ts">
  import { emoteStyle } from "@/lib/emotes.js";
  import { Spring } from "svelte/motion";

  /**
   * A sent emote: pops and wags about its tail tip (bottom centre) before
   * fading. Reduced motion appears at rest with no wag.
   */
  let {
    emoteId,
    size,
    reducedMotion,
  }: {
    emoteId: string;
    /** Sprite size in px. */
    size: number;
    reducedMotion: boolean;
  } = $props();

  const scaleSpring = new Spring(0.3);
  const rotationSpring = new Spring(-14);

  // Spring config follows the OS setting (see EmotePetal).
  $effect(() => {
    scaleSpring.stiffness = reducedMotion ? 1 : 0.22;
    scaleSpring.damping = reducedMotion ? 1 : 0.28;
    rotationSpring.stiffness = reducedMotion ? 1 : 0.12;
    rotationSpring.damping = reducedMotion ? 1 : 0.14;
  });
  let opacity = $state(1);

  let fadeTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (reducedMotion) {
      scaleSpring.set(1, { instant: true });
      rotationSpring.set(0, { instant: true });
      return;
    }
    scaleSpring.target = 1;
    rotationSpring.target = 0;
    fadeTimer = setTimeout(() => {
      fadeTimer = null;
      opacity = 0;
      scaleSpring.target = 0.85;
    }, 1450);
    return () => {
      if (fadeTimer) {
        clearTimeout(fadeTimer);
        fadeTimer = null;
      }
    };
  });
</script>

<div
  style="transform-origin:50% 97%;transform: scale({scaleSpring.current}) rotate({rotationSpring.current}deg);opacity:{opacity};transition:opacity 300ms cubic-bezier(0.23, 1, 0.32, 1)"
>
  <div style={emoteStyle(emoteId, size)}></div>
</div>
