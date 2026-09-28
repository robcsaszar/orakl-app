<script lang="ts">
  import { cn, tv } from "tailwind-variants";
  import type { Snippet } from "svelte";
  import { type TimerState } from "@orakl/client-core";
  import RingTimer from "$lib/components/ui/RingTimer.svelte";

  const questionBlockVariants = tv({
    slots: {
      title: "font-bold leading-tight text-pretty select-none",
    },
    variants: {
      variant: {
        default: {
          title: "text-xl md:text-2xl",
        },
        display: {
          title: "text-xl md:text-2xl",
        },
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  interface Props {
    timerState: TimerState;
    timeRemaining: number;
    timerFraction: number;
    observer?: boolean;
    variant?: "default" | "display";
    timerSize?: "sm" | "md" | "lg" | { initial?: "sm" | "md" | "lg"; sm?: "sm" | "md" | "lg"; md?: "sm" | "md" | "lg"; lg?: "sm" | "md" | "lg"; xl?: "sm" | "md" | "lg" };
    children: Snippet;
  }

  let { timerState, timeRemaining, timerFraction, observer = false, variant = "default", timerSize = "md", children }: Props = $props();

  const styles = $derived(questionBlockVariants({ variant }));
</script>

<div class="overflow-hidden">
  <div class="float-left mr-5" style="shape-outside: circle(50%)">
    <RingTimer {timerState} {timeRemaining} {timerFraction} {observer} size={timerSize} />
  </div>
  <h2 class={cn([styles.title(), ""])}>{@render children()}</h2>
</div>
