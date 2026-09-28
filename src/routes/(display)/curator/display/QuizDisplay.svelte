<script lang="ts">
import type { QuestionType } from "@orakl/shared";
  import type { Snippet } from "svelte";
  
  import { type TimerState } from "@orakl/client-core";
  import QuestionHeader from "$lib/components/quiz/QuestionHeader.svelte";
  import QuestionBlock from "$lib/components/quiz/QuestionBlock.svelte";
  import MultipleChoiceAnswers from "$lib/components/quiz/MultipleChoiceAnswers.svelte";
  import TrueFalseAnswers from "$lib/components/quiz/TrueFalseAnswers.svelte";
  import ImageMatchingGrid from "$lib/components/quiz/ImageMatchingGrid.svelte";
  import QuestionMedia from "$lib/components/quiz/QuestionMedia.svelte";
  import PostAnswerNote from "$lib/components/quiz/PostAnswerNote.svelte";
  import { scale } from "svelte/transition";

  export interface QuizDisplayData {
    questionType: QuestionType;
    text: string;
    answers: { id: string; text: string }[];
    matchItems?: { left: string[]; right: string[] } | null;
    mediaUrl?: string;
    mediaType?: string;
    correctAnswerId: string;
    timerState: TimerState;
    timeRemaining: number;
    timerFraction: number;
    counter?: string;
    difficulty?: string;
    categoryLabel?: string;
    castButton?: boolean;
    /** Curator's explanation, shown at reveal. Never the source (map #912). */
    postAnswerNote?: string;
  }

  /** Superset covering every answer component's style-state shape (structural
   *  typing — each component reads only the fields it needs). */
  export interface QuizDisplayStyleState {
    correctAnswerId: string;
    selectedAnswerId: string | null;
    selectedLeftItem: string | null;
    selectedRightItem: string | null;
    answered: boolean;
  }

  interface Props {
    data: QuizDisplayData;
    variant?: "default" | "display";
    playerBar?: Snippet;
    /** Interactive mode (playing curator, ADR 0019). Omitted → today's frozen
     *  display-only literals (byte-identical for non-participating curators). */
    styleState?: QuizDisplayStyleState;
    disabled?: boolean;
    /** Single-answer select (text/image choice, true/false). */
    onSelect?: (answerId: string) => void;
    /** Two-step match select (image_matching); pairing state lives in styleState. */
    onSelectMatch?: (column: "left" | "right", item: string) => void;
  }

  let {
    data,
    variant = "default",
    playerBar,
    styleState,
    disabled,
    onSelect,
    onSelectMatch,
  }: Props = $props();

  // Defaults recomputed whenever `data` changes and the prop is omitted —
  // today's frozen per-branch literals, unchanged for non-interactive callers.
  const effectiveStyleState = $derived<QuizDisplayStyleState>(
    styleState ?? {
      correctAnswerId: data.correctAnswerId,
      selectedAnswerId: null,
      selectedLeftItem: null,
      selectedRightItem: null,
      answered: false,
    },
  );
  const effectiveDisabled = $derived(disabled ?? true);
  const handleSelect = (id: string) => onSelect?.(id);
  const handleSelectMatch = (column: "left" | "right", item: string) =>
    onSelectMatch?.(column, item);
</script>

<div class="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
  <QuestionHeader data={{
    counter: data.counter,
    difficulty: data.difficulty,
    categoryLabel: data.categoryLabel,
    castButton: data.castButton,
  }} />

  <QuestionBlock
    timerState={data.timerState}
    timeRemaining={data.timeRemaining}
    timerFraction={data.timerFraction}
    {variant}
  >
    {data.text}
  </QuestionBlock>

  {#if data.mediaUrl && data.mediaType === "image"}
    <QuestionMedia src={data.mediaUrl} compact={variant === "display"} />
  {/if}

  <div>
    {#if data.questionType === "image_matching" && data.matchItems}
      <ImageMatchingGrid
        matchItems={data.matchItems}
        styleState={effectiveStyleState}
        disabled={effectiveDisabled}
        onSelect={handleSelectMatch}
      />
    {:else if data.questionType === "true_false"}
      <TrueFalseAnswers
        answers={data.answers}
        styleState={effectiveStyleState}
        disabled={effectiveDisabled}
        onSelect={handleSelect}
      />
    {:else}
      <MultipleChoiceAnswers
        answers={data.answers}
        styleState={effectiveStyleState}
        disabled={effectiveDisabled}
        onSelect={handleSelect}
      />
    {/if}
  </div>

  {#if data.correctAnswerId && data.postAnswerNote}
    <div in:scale={{ start: 0.95, duration: 150 }}>
      <PostAnswerNote note={data.postAnswerNote} variant={variant === "display" ? "display" : "default"} />
    </div>
  {/if}

  {#if playerBar}
    <div class="shrink-0">
      {@render playerBar()}
    </div>
  {/if}
</div>
