<script lang="ts">
  import type { QuestionRating } from "@orakl/protocol";
  import type { Snippet } from "svelte";
  import { cn } from "tailwind-variants";
  import { RATING_ERROR_MS, type RatingState } from "@/lib/question-rating-state";
  import Button from "../ui/Button.svelte";

  let {
    rating,
    onrate,
    children,
  }: {
    rating: RatingState;
    onrate: (rating: QuestionRating) => void;
    /** Rendered between the thumbs (e.g. the timer ring). */
    children?: Snippet;
  } = $props();

  const thumbs = [
    { value: "down", label: "Bad question", icon: "thumb-down" },
    { value: "up", label: "Good question", icon: "thumb-up" },
  ] as const;

  // The ✗ clears RATING_ERROR_MS after its ack; a new ack restarts the clock.
  let errorShownSeq = $state<number | null>(null);
  $effect(() => {
    const result = rating.result;
    if (!result || result.ok) {
      errorShownSeq = null;
      return;
    }
    errorShownSeq = result.seq;
    const timeout = setTimeout(() => {
      errorShownSeq = null;
    }, RATING_ERROR_MS);
    return () => clearTimeout(timeout);
  });

  function outcome(value: QuestionRating): "ok" | "error" | null {
    const result = rating.result;
    if (!result || result.rating !== value) return null;
    if (result.ok) return "ok";
    return errorShownSeq === result.seq ? "error" : null;
  }
</script>

<div class="flex items-start justify-center gap-4">
  {#each thumbs as thumb, i (thumb.value)}
    {@const state = outcome(thumb.value)}
    <div class={cn("relative", children && "mt-1")}>
      <Button
        type="button"
        variant="outline"
        intent="icon"
        iconBefore={state === "ok" ? "check" : state === "error" ? "x" : thumb.icon}
        class={cn(
          rating.pending === thumb.value && "opacity-50",
          state === "ok" && "border-success text-success",
          state === "error" && "border-danger text-danger",
        )}
        aria-label={thumb.label}
        aria-busy={rating.pending === thumb.value ? "true" : undefined}
        aria-pressed={state === "ok"}
        data-tooltip={thumb.label}
        data-tooltip-position="top"
        data-rating-thumb
        onclick={() => onrate(thumb.value)}
      ></Button>
      <span
        role="status"
        aria-live="polite"
        class={cn(
          "absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-xs",
          state === "ok" && "text-success",
          state === "error" && "text-danger",
        )}
      >{#if state}<span class="sr-only">{`${thumb.label}: `}</span>{/if}{state === "ok" ? "Submitted" : state === "error" ? "Failed" : ""}</span>
    </div>
    {#if i === 0}
      {@render children?.()}
    {/if}
  {/each}
</div>
