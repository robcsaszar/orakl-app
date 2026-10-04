<script lang="ts">
  import { page } from "$app/state";
  import { getSoloSession } from "@/lib/svelte/soloSession.svelte.js";
  import QuestionHeader from "$lib/components/quiz/QuestionHeader.svelte";
  import StreakIndicator from "$lib/components/quiz/StreakIndicator.svelte";
  import QuestionBlock from "$lib/components/quiz/QuestionBlock.svelte";
  import AnswerStatus from "$lib/components/quiz/AnswerStatus.svelte";
  import MultipleChoiceAnswers from "$lib/components/quiz/MultipleChoiceAnswers.svelte";
  import TrueFalseAnswers from "$lib/components/quiz/TrueFalseAnswers.svelte";
  import ImageMatchingGrid from "$lib/components/quiz/ImageMatchingGrid.svelte";
  import QuestionMedia from "$lib/components/quiz/QuestionMedia.svelte";
  import PostAnswerNote from "$lib/components/quiz/PostAnswerNote.svelte";
  import RatingThumbs from "$lib/components/quiz/RatingThumbs.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import type { TimerState } from "@orakl/client-core";
  import { cubicOut } from "svelte/easing";
  import { fade, fly, scale } from "svelte/transition";
  import { tick } from "svelte";

  const s = getSoloSession();
  const nickname = $derived(
    (page.data as { nickname?: string }).nickname ?? "",
  );

  const uiFlags = $derived(
    (page.data as { uiFlags?: { QUESTION_RATING?: boolean } }).uiFlags ?? {},
  );
  const showRating = $derived(!s.isGuest && uiFlags.QUESTION_RATING === true);

  // On the final fixed-count question the next step is results, not a question.
  const isLastQuestion = $derived(
    s.mode !== "endless" &&
      s.totalQuestions != null &&
      s.currentIndex + 1 >= s.totalQuestions,
  );

  let continueButton = $state<HTMLButtonElement | HTMLAnchorElement | null>(
    null,
  );

  $effect(() => {
    if (s.showingAnswer && s.lastAnswerInput === "keyboard") {
      tick().then(() => continueButton?.focus());
    }
  });
</script>

{#if s.reconnecting && !s.currentQuestion}
  <div
    class="flex flex-col items-center justify-center gap-3 py-20 text-center"
  >
    <div
      class="size-8 animate-spin rounded-full border-2 border-secondary/20 border-t-primary"
      aria-hidden="true"
    ></div>
    <p class="text-sm text-foreground-darker">Reconnecting to your trial…</p>
  </div>
{:else if s.currentQuestion}
  <div class="flex flex-col gap-10">
    <div class="flex flex-col gap-4">
      <QuestionHeader
        data={{
          progress: s.progressPercent,
          counter: s.questionCounter,
          avatarSrc: s.avatarSrc,
          nickname,
          score: s.score,
          mode: s.mode,
          strikes: s.strikes,
          difficulty: s.currentQuestion?.difficulty,
          categoryLabel: s.getCategoryBadge(),
          lastPointsEarned: s.lastPointsEarned,
        }}
      />

      <div class="flex min-h-7 justify-end">
        <StreakIndicator
          streak={s.streak}
          flourish={s.streakFlourish}
          nonce={s.streakNonce}
        />
      </div>

      <QuestionBlock
        timerState={s.timerState() as TimerState}
        timeRemaining={s.timeRemaining}
        timerFraction={s.timer ? s.timeRemaining / s.timer : 0}
      >
        {s.currentQuestion.text}
      </QuestionBlock>
    </div>

    {#if s.displayMediaUrl && s.currentQuestion.mediaType === "image"}
      <QuestionMedia src={s.displayMediaUrl} />
    {/if}

    <div>
      {#if s.questionType === "true_false"}
        <TrueFalseAnswers
          answers={s.answers}
          styleState={{
            correctAnswerId: s.correctAnswerId,
            selectedAnswerId: s.selectedAnswerId,
            answered: s.answered,
          }}
          disabled={s.answered || s.isObserver}
          onSelect={(id, input) => s.selectAnswer(id, input)}
        />
      {:else if s.questionType === "image_matching" && s.matchItems}
        <ImageMatchingGrid
          matchItems={s.matchItems}
          styleState={{
            correctAnswerId: s.correctAnswerId,
            selectedLeftItem: s.selectedLeftItem,
            selectedRightItem: s.selectedRightItem,
            answered: s.answered,
          }}
          disabled={s.answered || s.isObserver}
          onSelect={(col, item, input) => s.selectMatchItem(col, item, input)}
        />
      {:else}
        <MultipleChoiceAnswers
          answers={s.answers}
          styleState={{
            correctAnswerId: s.correctAnswerId,
            selectedAnswerId: s.selectedAnswerId,
            answered: s.answered,
          }}
          disabled={s.answered || s.isObserver}
          onSelect={(id, input) => s.selectAnswer(id, input)}
        />
      {/if}
    </div>

    {#if s.showingAnswer}
      {#if s.postAnswerNote}
        <div in:scale={{ start: 0.95, duration: 150 }}>
          <PostAnswerNote note={s.postAnswerNote} />
        </div>
      {/if}

      {#if s.fasterThanPercent !== null && s.fasterThanPercent >= 50 && s.selectedAnswerId === s.correctAnswerId}
        <div
          class="fixed inset-0 flex items-end justify-center pointer-events-none p-4 md:p-8"
        >
          <p
            class="flex items-center justify-center gap-1.5 text-sm font-medium text-foreground-darker"
            in:fly={{ y: 8, duration: 180, easing: cubicOut }}
            out:fade={{ duration: 100 }}
          >
            <Icon name="clock" />
            Faster than {s.fasterThanPercent}% of players on this question.
          </p>
        </div>
      {/if}

      {#if showRating}
        <RatingThumbs rating={s.rating} onrate={(r) => s.rate(r)} />
      {/if}

      <div class="flex justify-end">
        <Button
          bind:ref={continueButton}
          type="button"
          variant="secondary"
          intent="icon"
          iconBefore="chevron-right-angle"
          aria-label={isLastQuestion ? "See results" : "Continue"}
          data-tooltip={isLastQuestion ? "See results" : "Continue"}
          onclick={() => s.advance()}
        ></Button>
      </div>
    {/if}
  </div>
{/if}
