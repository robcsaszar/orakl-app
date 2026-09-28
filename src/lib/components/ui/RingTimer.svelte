<script lang="ts">
  import { computeTimerRingOffset, type TimerState } from "@orakl/client-core";
  import { cn, tv } from 'tailwind-variants';
  import Icon from "@/lib/components/ui/Icon.svelte";

  const ringTimerVariants = tv({
  slots: {
    container:
      "relative isolate shrink-0 rounded-full corner-shape-squircle border backdrop-blur-xs",
    center:
      "absolute inset-0 flex items-center justify-center font-mono tabular-nums font-bold",
    icon: "size-8",
    ring: "",
    track: "",
  },
  variants: {
    size: {
      sm: { container: "size-14", center: "text-xl font-medium" },
      md: { container: "size-20", center: "text-3xl" },
      lg: { container: "size-28", center: "text-5xl" },
    },
    timerState: {
      counting: {
        container: "border-timer-counting/10 bg-timer-counting/5",
        center: "text-timer-counting-200",
        ring: "stroke-timer-counting",
        track: "stroke-timer-counting/25",
      },
      low: {
        container: "border-amber-500/10 bg-amber-500/5",
        center: "text-amber-200",
        ring: "stroke-amber-500",
        track: "stroke-amber-500/25",
      },
      correct: {
        container: "border-success/10 bg-success/5",
        center: "text-success-light",
        ring: "stroke-success",
        track: "stroke-success/25",
      },
      incorrect: {
        container: "border-danger/10 bg-danger/5",
        center: "text-danger-light",
        ring: "stroke-danger",
        track: "stroke-danger/25",
      },
      timeout: {
        container: "border-warning/10 bg-warning/5",
        center: "text-warning-light",
        ring: "opacity-0",
        track: "stroke-warning/25",
      },
      final: {
        container: "border-timer-counting/10 bg-timer-counting/5",
        center: "text-timer-counting-200",
        ring: "stroke-timer-counting",
        track: "stroke-timer-counting/25",
      },
    },
    observer: {
      true: {
        container: "border-blue-800/30 bg-blue-950/20",
        center: "text-blue-400",
        ring: "stroke-blue-500",
        track: "stroke-blue-500/20",
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      timerState: "timeout",
      observer: true,
      ring: "stroke-blue-500 opacity-100",
    }
  ],
  defaultVariants: { timerState: "counting", observer: false, size: "md" },
  // @ts-expect-error responsiveVariants not in tv() types v3
  responsiveVariants: ["size"],
});

  type RingSize = "sm" | "md" | "lg";
  type ResponsiveSize = RingSize | { initial?: RingSize; sm?: RingSize; md?: RingSize; lg?: RingSize; xl?: RingSize };

  interface Props {
    timerState: TimerState;
    timeRemaining: number;
    timerFraction: number;
    observer?: boolean;
    size?: ResponsiveSize;
    class?: string;
  }

  const RING_CIRC = 175.93;
  const RING_R = 28;

  let { timerState, timeRemaining, timerFraction, observer = false, size = "md", class: className }: Props = $props();

  const timer = $derived(ringTimerVariants({ timerState, observer, size: size as RingSize }));
  const ringOffset = $derived(computeTimerRingOffset(timerState, timerFraction, RING_R));
</script>

<div class={cn([timer.container()], className)}>
  <svg class="absolute inset-1 -rotate-90 z-10" viewBox="0 0 64 64" aria-hidden="true">
    <circle
      cx="32" cy="32" r={RING_R}
      fill="none"
      stroke-width="4"
      class={timer.track()}
    />
    <circle
      cx="32" cy="32" r={RING_R}
      fill="none"
      stroke-width="4"
      stroke-linecap="round"
      class={timer.ring()}
      style:stroke-dasharray={RING_CIRC}
      style:stroke-dashoffset={ringOffset}
    />
  </svg>

  <span class={timer.center()}>
    {#if observer}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor" class="size-9" aria-hidden="true">
        <g class="iris-drift">
          <path class="iris" d="M24,34.004C18.451,34.004 13.947,29.499 13.947,23.951C13.947,18.402 18.451,13.897 24,13.897C29.549,13.897 34.053,18.402 34.053,23.951C34.053,29.499 29.549,34.004 24,34.004Z" />
        </g>
        <path d="M47.272,35.543C47.272,38.647 45.592,41.508 42.881,43.02C29.817,50.202 16.472,49.114 5.177,42.946C2.463,41.449 0.777,38.594 0.777,35.493C0.728,29.335 0.728,18.588 0.728,12.456C0.728,9.352 2.408,6.491 5.119,4.979C18.183,-2.203 31.528,-1.115 42.823,5.053C45.537,6.55 47.223,9.405 47.223,12.506C47.272,18.664 47.272,29.411 47.272,35.543ZM3.219,23.611C3.17,23.64 3.125,23.673 3.084,23.712C2.862,23.923 2.91,24.205 3.082,24.355C3.257,24.507 3.504,24.567 3.828,24.689C4.409,24.97 4.96,25.334 5.466,25.784C15.469,34.684 29.669,37.198 42.534,25.751C43.347,24.939 43.95,24.717 44.378,24.561C44.515,24.511 44.634,24.468 44.736,24.414L44.781,24.388C44.83,24.359 44.875,24.326 44.916,24.287C45.138,24.076 45.09,23.794 44.918,23.644C44.743,23.492 44.496,23.432 44.172,23.31C43.757,23.153 43.215,22.895 42.534,22.215C32.531,13.315 18.331,10.801 5.466,22.248C4.901,22.75 4.278,23.146 3.622,23.438C3.504,23.49 3.385,23.54 3.264,23.585L3.221,23.602L3.219,23.611Z" />
      </svg>
    {:else if timerState === "counting" || timerState === "low"}
      <span class:animate-timer-low={timerState === "low"}>
        {timeRemaining}
      </span>
    {:else if timerState === "correct"}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor" class={timer.icon()} aria-hidden="true">
        <path d="M18.971,24.408L37.561,5.657L42.779,10.879L48,16.1L19.07,45.029L0.121,26.37L10.564,15.931L18.971,24.408Z" />
      </svg>
    {:else if timerState === "incorrect"}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor" class={timer.icon()} aria-hidden="true">
        <path d="M23.886,13.604L37.399,0L42.617,5.223L47.838,10.443L34.316,23.965L47.84,37.399L42.617,42.617L37.397,47.838L23.92,34.361L10.441,47.84L5.35,42.617L0.257,37.391L13.559,24L-0,10.441L5.223,5.35L10.449,0.257L23.886,13.604Z" />
      </svg>
    {:else if timerState === "final"}
      <Icon name="wreath" class={timer.icon()} />
    {:else if timerState === "timeout"}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor" class={timer.icon()} aria-hidden="true">
        <path d="M2.808,0.001L45.108,0.001L45.374,1.018C45.919,3.105 45.703,10.858 45.04,13.003C43.781,17.067 41.035,20.071 37.394,21.363C34.555,22.373 33.972,22.737 33.744,23.649C33.456,24.802 34.023,25.402 35.927,25.972C43.063,28.106 46.274,33.691 45.703,42.977C45.378,48.236 45.53,48.025 42.374,47.805C39.261,47.59 33.309,45.955 31.166,44.725C22.76,39.901 21.809,24.642 29.418,16.662L31.45,14.532L27.702,14.415C25.641,14.351 22.275,14.351 20.212,14.415L16.466,14.532L18.497,16.662C22.071,20.406 23.567,24.597 23.58,30.878C23.606,41.168 17.691,46.762 5.748,47.759L2.837,48L2.555,46.927C1.997,44.793 2.203,37.063 2.875,34.891C4.177,30.679 6.868,27.828 10.906,26.37C13.868,25.302 14.121,25.107 14.121,23.92C14.121,22.949 13.884,22.763 11.151,21.639C6.517,19.733 4.215,17.329 2.876,13.003C2.212,10.858 1.997,3.105 2.542,1.018L2.808,0.001Z" />
      </svg>
    {/if}
  </span>
</div>

<style>
  .iris {
    transform-box: fill-box;
    transform-origin: center;
    animation: iris-wander 14s infinite reverse;
    opacity: 0.7;
  }

  .iris-drift {
    transform-box: fill-box;
    transform-origin: center;
    animation: iris-micro 3.7s ease-in-out infinite alternate;
  }

  @keyframes iris-wander {
    0% { transform: translate(10%, -8%); animation-timing-function: cubic-bezier(0.4,0,0.15,1); }
    10% { transform: translate(5%, 12%); animation-timing-function: cubic-bezier(0.25,0,0.35,1); }
    19% { transform: translate(3%, 28%); animation-timing-function: cubic-bezier(0.25,0,0.35,1); }
    28% { transform: translate(6%, 42%); animation-timing-function: cubic-bezier(0.25,0,0.35,1); }
    37% { transform: translate(4%, 56%); animation-timing-function: cubic-bezier(0.25,0,0.35,1); }
    46% { transform: translate(8%, 28%); animation-timing-function: cubic-bezier(0.25,0,0.35,1); }
    62% { transform: translate(6%, -7%); animation-timing-function: cubic-bezier(0.25,0,0.35,1); }
    82% { transform: translate(6%, 29%); animation-timing-function: cubic-bezier(0.25,0,0.35,1); }
    100% { transform: translate(10%, -8%); }
  }

  @keyframes iris-micro {
    0% { transform: translate(-1.5%, -0.8%); }
    33% { transform: translate(1%, 1.2%); }
    66% { transform: translate(0.5%, -1%); }
    100% { transform: translate(-0.8%, 0.5%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .iris,
    .iris-drift {
      animation: none;
      transform: translate(0%, 0%);
      opacity: 1;
    }
  }
</style>
