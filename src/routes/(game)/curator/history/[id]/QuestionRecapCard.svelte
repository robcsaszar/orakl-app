<script lang="ts">
import type { QuestionSource } from "@orakl/shared";
  import Card from "$lib/components/ui/Card.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import QuestionMedia from "$lib/components/quiz/QuestionMedia.svelte";
  import PostAnswerNote from "$lib/components/quiz/PostAnswerNote.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Progress from "$lib/components/ui/Progress.svelte";
  import { toSourceLink } from "$lib/source-link.js";
  import type { AnswerSpreadEntry } from "@orakl/protocol";

  let {
    index,
    text,
    mediaUrl,
    postAnswerNote,
    source,
    answered = 0,
    correct = 0,
    spread = null,
    noAnswer = 0,
  }: {
    index: number;
    text: string;
    mediaUrl?: string;
    postAnswerNote?: string;
    source?: QuestionSource;
    answered?: number;
    correct?: number;
    /** Picks per option; null hides the block (games before answer ids). */
    spread?: AnswerSpreadEntry[] | null;
    noAnswer?: number;
  } = $props();

  const sourceLink = $derived(toSourceLink(source));
  const accuracyLabel = $derived(
    answered > 0
      ? `${correct} of ${answered} correct · ${Math.round((correct / answered) * 100)}%`
      : null,
  );
</script>

<Card>
  <div class="flex flex-col gap-2">
    <p class="text-sm font-semibold leading-6 text-foreground md:text-base">
      {index + 1}. {text}
    </p>

    {#if accuracyLabel}
      <p class="text-sm text-foreground-darker font-sans">{accuracyLabel}</p>
    {/if}

    {#if spread && answered > 0}
      <ul class="flex flex-col gap-2 font-sans text-sm" aria-label="Answer spread">
        {#each spread as option (option.answerId)}
          <li class="flex flex-col gap-1">
            <div class="flex items-baseline justify-between gap-4">
              <span class={option.correct ? "flex items-center gap-1 text-success" : "text-foreground"}>
                {#if option.correct}<Icon name="check" class="size-4" /><span class="sr-only">Correct answer:</span>{/if}
                {option.text}
              </span>
              <span class="tabular-nums text-foreground-darker">{option.count}</span>
            </div>
            <Progress
              value={Math.round((option.count / answered) * 100)}
              label="{option.text}: {option.count} of {answered}"
              class="h-1.5 bg-background"
              barClass={option.correct ? "bg-success" : "bg-primary"}
            />
          </li>
        {/each}
        {#if noAnswer > 0}
          <li class="flex justify-between gap-4 text-foreground-darker">
            <span>No answer</span>
            <span class="tabular-nums">{noAnswer}</span>
          </li>
        {/if}
      </ul>
    {/if}

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
</Card>
