<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import { tv } from "tailwind-variants";
  import Icon from "$lib/components/ui/Icon.svelte";

  const answerStatusVariants = tv({
    base: "rounded-2xl corner-shape-squircle p-3 text-center font-sans flex items-center justify-center gap-2 font-medium fixed right-2 bottom-2 z-50 max-w-[calc(100vw-1rem)]",
    variants: {
      status: {
        correct: "bg-green-950 text-green-300",
        incorrect: "bg-danger text-danger-light",
        timeout: "bg-yellow-950 text-yellow-300",
        pending: "bg-secondary text-background",
      },
    },
  });

  interface Props {
    status: "correct" | "incorrect" | "timeout" | "pending";
    /** Live tally shown alongside the "waiting for others" message — omit
     *  either to leave the count off (e.g. observers, who never wait). */
    answeredCount?: number;
    totalToAnswer?: number;
    /** Seconds left in the last call; above 0 the pending line names the reveal instead of the wait. */
    lastCallSeconds?: number;
  }

  let { status, answeredCount, totalToAnswer, lastCallSeconds = 0 }: Props = $props();
</script>

<div
  role={status === "pending" ? "status" : "alert"}
  aria-live={status === "pending" ? "polite" : "assertive"}
  class={answerStatusVariants({ status })}
  transition:fly={{ duration: 500, easing: cubicOut, y: -10 }}
>
  {#if status === "correct"}
    <Icon name="correct" />
    Correct
  {:else if status === "incorrect"}
    <Icon name="incorrect" />
    Incorrect
  {:else if status === "timeout"}
    <Icon name="timeout" />
    Time's up
  {:else if status === "pending"}
    {@const remaining = Math.max(0, (totalToAnswer ?? 0) - (answeredCount ?? 0))}
    <span class="is-loading text-sm leading-snug">
      {#if lastCallSeconds > 0}
        Everyone has answered. Revealing in {lastCallSeconds}…
      {:else if totalToAnswer && totalToAnswer > 0}
        Waiting for <strong class="contents">{remaining}</strong> more {remaining === 1 ? "answer" : "answers"}<span>.</span><span>.</span><span>.</span>
      {:else}
        Answer submitted. Waiting for other players<span>.</span><span>.</span><span>.</span>
      {/if}
    </span>
  {/if}
</div>
