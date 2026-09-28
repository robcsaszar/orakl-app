<script lang="ts">
import type { QuestionSource } from "@orakl/shared";
  import { tv } from "tailwind-variants";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import QuestionMedia from "$lib/components/quiz/QuestionMedia.svelte";
  import PostAnswerNote from "$lib/components/quiz/PostAnswerNote.svelte";
  import { toSourceLink } from "$lib/source-link.js";

  const resultVariants = tv({
    slots: {
      indicator: "flex shrink-0 items-center justify-center rounded-2xl corner-shape-squircle border-2 self-stretch p-2",
      expectedAnswer: "rounded-2xl corner-shape-squircle border-2 px-3 py-2 flex gap-1",
      selectedAnswer: "rounded-2xl corner-shape-squircle border-2 px-3 py-2 flex gap-1",
    },
    variants: {
      outcome: {
        correct: {
          indicator: "border-success/35 bg-success/12 text-success-light",
          expectedAnswer: "border-secondary/10 bg-background/10 text-secondary-light",
          selectedAnswer: "border-success/25 bg-success/8 text-success-light",
        },
        incorrect: {
          indicator: "border-danger/35 bg-danger/12 text-danger-light",
          expectedAnswer: "border-secondary/10 bg-background/10 text-secondary-light",
          selectedAnswer: "border-danger/25 bg-danger/8 text-danger-light",
        },
        timeout: {
          indicator: "border-warning/35 bg-warning/12 text-warning-light",
          expectedAnswer: "border-secondary/10 bg-background/10 text-secondary-light",
          selectedAnswer: "border-warning/25 bg-warning/8 text-warning-light",
        },
      },
    },
  });

  const ICON: Record<string, string> = { correct: "check", incorrect: "x", timeout: "hourglass" };
  const LABEL: Record<string, string> = { correct: "Correct", incorrect: "Missed", timeout: "Timed out" };

  let {
    index,
    text,
    correct,
    selectedAnswer,
    correctAnswer,
    mediaUrl,
    postAnswerNote,
    source,
  }: {
    index: number;
    text: string;
    correct: boolean;
    selectedAnswer: string | null;
    correctAnswer: string;
    mediaUrl?: string;
    postAnswerNote?: string;
    source?: QuestionSource;
  } = $props();

  const outcome = $derived(correct ? "correct" : selectedAnswer ? "incorrect" : "timeout");
  const { indicator, expectedAnswer, selectedAnswer: selectedAnswerClass } = $derived(resultVariants({ outcome }));

  const sourceLink = $derived(toSourceLink(source));
</script>

<Card>
  <div class="flex items-start gap-3">
    <div class={indicator()}>
      <Icon name={ICON[outcome]} class="size-4" />
    </div>

    <div class="min-w-0 flex-1 flex flex-col gap-2">
      <div class="flex items-start justify-between gap-3">
        <p class="text-sm font-semibold leading-6 text-foreground md:text-base">
          {index + 1}. {text}
        </p>
        <span class="sr-only">
          {LABEL[outcome]}
        </span>
      </div>

      <div class="grid gap-2 text-sm leading-6 md:grid-cols-2">
        <p class={expectedAnswer()}>
          <span>Expected:</span><strong>{correctAnswer}</strong>
        </p>
        <p class={selectedAnswerClass()}>
          <span>Given:</span><strong>{selectedAnswer ?? "No answer given"}</strong>
        </p>
        {#if outcome === "timeout"}
          <p class="md:col-span-2 text-warning-light">
            You did not answer this question in time.
          </p>
        {/if}
      </div>

      {#if mediaUrl || postAnswerNote || sourceLink}
        <div class="flex flex-col gap-2 border-t border-secondary/10 pt-2">
          {#if mediaUrl}
            <QuestionMedia src={mediaUrl} />
          {/if}

          {#if postAnswerNote}
            <PostAnswerNote note={postAnswerNote} />
          {/if}

          {#if sourceLink}
            <Link
              href={sourceLink.url}
              intent="inline"
              content="inline"
              class="break-words [overflow-wrap:anywhere]"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Source: {sourceLink.fullLabel}"
            >
              Source: {sourceLink.label}
            </Link>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</Card>
