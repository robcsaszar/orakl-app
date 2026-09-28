<script lang="ts">
  import Icon from "@/lib/components/ui/Icon.svelte";
  import { fade } from 'svelte/transition';
  import { cn } from 'tailwind-variants';
  import { GAME } from "data/game.settings.js";

  type Flourish =
    | { kind: "gain" | "loss" | "near-miss" | "best" | "life-spent"; value: number }
    | null;

  interface Props {
    /** Current consecutive-correct count. */
    streak: number;
    /** The latest streak event to celebrate/mourn, or null. */
    flourish: Flourish;
    /** Bumps on every flourish event so the pop replays even if the same one recurs. */
    nonce: number;
    class?: string;
  }

  let { streak, flourish, nonce, class: className = "" }: Props = $props();

  // Heat deepens with the run: ember → blaze → white-hot inferno. Solid colors,
  // no gradients — intensity, not decoration.
  const TONE_CLASSES = {
    ember: "text-ember-dark bg-ember",
    spark: "text-spark-dark bg-spark",
    blaze: "text-blaze-dark bg-blaze",
    conflagration: "text-conflagration-dark bg-conflagration",
    inferno: "text-inferno-dark bg-inferno",
  } as const;

  const FLOURISH_CLASSES = {
    ember: "text-ember-light text-shadow-background text-shadow-outline-thick",
    spark: "text-spark-light text-shadow-background text-shadow-outline-thick",
    blaze: "text-blaze-light text-shadow-blaze text-shadow-sm",
    conflagration: "text-conflagration-light text-shadow-conflagration text-shadow-sm",
    inferno: "text-inferno-light text-shadow-inferno text-shadow-sm",
    ash: "text-ash-light text-shadow-ash text-shadow-sm",
  } as const;

  // The streak only earns screen space once it's genuinely building.
  const visible = $derived(streak >= GAME.streak.visibleAt);

  const currentStep = $derived.by(() =>
    [...GAME.streak.steps].reverse().find((s) => streak >= s.threshold)
  );
  const tier = $derived(TONE_CLASSES[currentStep?.tone ?? "ember"]);

  const flourishLabel = $derived.by(() => {
    if (!flourish) return null;
    switch (flourish.kind) {
      case "gain":
        return GAME.streak.steps.find((s) => s.threshold === flourish.value)?.label ?? null;
      case "loss": {
        const step = [...GAME.streak.losses].reverse().find((s) => flourish.value >= s.threshold);
        return step?.label ?? null;
      }
      case "near-miss":
        return "So close.";
      case "best":
        return "New personal best!";
      case "life-spent":
        return `${flourish.value} flame${flourish.value === 1 ? "" : "s"} left.`;
    }
  });

  const flourishTone = $derived.by(() => {
    if (!flourish) return FLOURISH_CLASSES.ash;
    switch (flourish.kind) {
      case "gain": {
        const step = GAME.streak.steps.find((s) => s.threshold === flourish.value);
        return FLOURISH_CLASSES[step?.tone ?? "ember"];
      }
      case "best":
        // Matches whatever heat the streak is currently running at.
        return FLOURISH_CLASSES[currentStep?.tone ?? "ember"];
      default:
        return FLOURISH_CLASSES.ash;
    }
  });
</script>

<div class={cn(["relative inline-flex items-center", className])} aria-live="polite">
  {#if visible}
    <div class={cn(["streak flex items-center px-2 rounded-2xl corner-shape-squircle", tier])}>
      <span
        class="inline-flex items-center gap-1 text-xl font-bold font-mono tabular-nums"
        in:fade={{ duration: 200 }}
      >
        <Icon name="flame" />
        <span class="sr-only">Streak: </span>{streak}
      </span>
    </div>
  {/if}

  <!-- Streak flourish: remounts on nonce so the pop replays each time, and
       outlives the pill so a streak reset to 0 can still show the mourn. -->
  {#key nonce}
    {#if flourishLabel}
      <span
        class={cn(["flourish pointer-events-none absolute right-[calc(100%+0.5rem)] whitespace-nowrap text-sm font-sans", flourishTone])}
      >
        {flourishLabel}
      </span>
    {/if}
  {/key}
</div>

<style>
   /* Rare, celebratory — pops up and settles. */
  .flourish {
    animation: flourish-pop 900ms cubic-bezier(0.23, 1, 0.32, 1) both;
  }
  @keyframes flourish-pop {
    0% {
      opacity: 0;
      transform: translate(0, 6px) scale(0.85);
    }
    25% {
      opacity: 1;
      transform: translate(0, 0) scale(1.04);
    }
    70% {
      opacity: 1;
      transform: translate(0, 0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(0, -4px) scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flourish {
      animation: flourish-fade 900ms ease both;
    }
    @keyframes flourish-fade {
      0% {
        opacity: 0;
      }
      25%,
      70% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  }
</style>
