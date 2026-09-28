<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { fly } from 'svelte/transition';
  import { tv } from "tailwind-variants";

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
  }

  let { status, answeredCount, totalToAnswer }: Props = $props();
</script>

<div
  role={status === "pending" ? "status" : "alert"}
  aria-live={status === "pending" ? "polite" : "assertive"}
  class={answerStatusVariants({ status })}
  transition:fly={{ duration: 500, easing: cubicOut, y: -10 }}
>
  {#if status === "correct"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor" class="size-5" aria-hidden="true">
      <path d="M18.971,24.408L37.561,5.657L42.779,10.879L48,16.1L19.07,45.029L0.121,26.37L10.564,15.931L18.971,24.408Z" />
    </svg>
    Correct!
  {:else if status === "incorrect"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor" class="size-5" aria-hidden="true">
      <path d="M23.886,13.604L37.399,0L42.617,5.223L47.838,10.443L34.316,23.965L47.84,37.399L42.617,42.617L37.397,47.838L23.92,34.361L10.441,47.84L5.35,42.617L0.257,37.391L13.559,24L-0,10.441L5.223,5.35L10.449,0.257L23.886,13.604Z" />
    </svg>
    Incorrect
  {:else if status === "timeout"}
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="currentColor" class="size-5" aria-hidden="true">
      <path d="M2.808,0.001L45.108,0.001L45.374,1.018C45.919,3.105 45.703,10.858 45.04,13.003C43.781,17.067 41.035,20.071 37.394,21.363C34.555,22.373 33.972,22.737 33.744,23.649C33.456,24.802 34.023,25.402 35.927,25.972C43.063,28.106 46.274,33.691 45.703,42.977C45.378,48.236 45.53,48.025 42.374,47.805C39.261,47.59 33.309,45.955 31.166,44.725C22.76,39.901 21.809,24.642 29.418,16.662L31.45,14.532L27.702,14.415C25.641,14.351 22.275,14.351 20.212,14.415L16.466,14.532L18.497,16.662C22.071,20.406 23.567,24.597 23.58,30.878C23.606,41.168 17.691,46.762 5.748,47.759L2.837,48L2.555,46.927C1.997,44.793 2.203,37.063 2.875,34.891C4.177,30.679 6.868,27.828 10.906,26.37C13.868,25.302 14.121,25.107 14.121,23.92C14.121,22.949 13.884,22.763 11.151,21.639C6.517,19.733 4.215,17.329 2.876,13.003C2.212,10.858 1.997,3.105 2.542,1.018L2.808,0.001Z" />
    </svg>
    Time's up
  {:else if status === "pending"}
    {@const remaining = Math.max(0, (totalToAnswer ?? 0) - (answeredCount ?? 0))}
    <span class="is-loading text-sm leading-snug">
      {#if totalToAnswer && totalToAnswer > 0}
        Waiting for <strong class="contents">{remaining}</strong> more {remaining === 1 ? "answer" : "answers"}<span>.</span><span>.</span><span>.</span>
      {:else}
        Answer submitted. Waiting for other players<span>.</span><span>.</span><span>.</span>
      {/if}
    </span>
  {/if}
</div>
