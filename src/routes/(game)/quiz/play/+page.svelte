<script lang="ts">
import { percent } from "@orakl/shared";
  import RingTimer from "$lib/components/ui/RingTimer.svelte";
  import { onMount, tick } from "svelte";
  import { page } from "$app/state";
  import { getQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import {
    headerActionState,
    registerHeaderActions,
  } from "@/lib/header-action-state.svelte.js";
  import type { TimerState } from "@orakl/client-core";
  import { isTrueAnswerText } from "@orakl/client-core";
  import { isFalseAnswerText } from "@/lib/answer-variants.js";
  
  import QuestionHeader from "$lib/components/quiz/QuestionHeader.svelte";
  import StreakIndicator from "$lib/components/quiz/StreakIndicator.svelte";
  import QuestionBlock from "$lib/components/quiz/QuestionBlock.svelte";
  import AnswerStatus from "$lib/components/quiz/AnswerStatus.svelte";
  import PlayerAnswers from "./PlayerAnswers.svelte";
  import MultipleChoiceAnswers from "$lib/components/quiz/MultipleChoiceAnswers.svelte";
  import TrueFalseAnswers from "$lib/components/quiz/TrueFalseAnswers.svelte";
  import ImageMatchingGrid from "$lib/components/quiz/ImageMatchingGrid.svelte";
  import QuestionMedia from "$lib/components/quiz/QuestionMedia.svelte";
  import PostAnswerNote from "$lib/components/quiz/PostAnswerNote.svelte";
  import RatingThumbs from "$lib/components/quiz/RatingThumbs.svelte";
  import { cn } from "tailwind-variants";
  import { fly, scale, slide } from "svelte/transition";
  import Icon from '@/lib/components/ui/Icon.svelte';

  // Build-level PLAYER_EMOTES flag (map #859, decision 5): the import() sits
  // inside the guard, so with __FEATURE_PLAYER_EMOTES__ false the gesture
  // layer never enters the bundle. `emotes.ts` itself still ships — quizSession
  // imports pickRandomEmotes statically — as does static/images/emotes.png.
  const emoteLayer = __FEATURE_PLAYER_EMOTES__
    ? import("./EmoteReactionLayer.svelte")
    : null;

  // Optional: the Mimic Mode demo (/mimic/quiz/play) renders this page with no
  // SSR load data, so default to an empty seed.
  let { data }: { data?: import("./$types").PageData } = $props();

  const session = getQuizSession();
  const uiFlags = $derived(
    (page.data as { uiFlags?: { QUESTION_RATING?: boolean } }).uiFlags ?? {},
  );

  onMount(() => {
    // SSR seed: on a fresh refresh/deep-link the store is empty, so replay the
    // server-captured state messages to paint the question immediately. Skip
    // when a question is already present (forward nav populated it via the socket);
    // the layout's reconnect path still runs and reconciles idempotently.
    const msgs = data?.stateMessages;
    if (msgs?.length && !session.currentQuestion) {
      session.applyStateMessages(msgs as unknown as Record<string, unknown>[]);
    }
  });

  // ── question-UI derived (folded into QuizSession — ADR 0010) ──
  const currentQuestion = $derived(session.currentQuestion);
  const timeRemaining = $derived(session.timeRemaining);
  const correctAnswerId = $derived(session.correctAnswerId);
  const timerFraction = $derived(
    session.timerDuration > 0 ? timeRemaining / session.timerDuration : 0,
  );
  const isTimerLow = $derived(timeRemaining <= 5);
  const timerState = $derived<TimerState>(
    correctAnswerId
      ? session.selectedAnswerId == null
        ? "timeout"
        : session.selectedAnswerId === correctAnswerId
          ? "correct"
          : "incorrect"
      : isTimerLow
        ? "low"
        : "counting",
  );
  const questionCounter = $derived(
    currentQuestion
      ? `Question ${currentQuestion.questionIndex + 1} of ${currentQuestion.totalQuestions}`
      : "",
  );
  const questionProgress = $derived(
    currentQuestion
      ? ((currentQuestion.questionIndex + 1) / currentQuestion.totalQuestions) *
          100
      : 0,
  );
  const isLastQuestion = $derived(
    currentQuestion
      ? currentQuestion.questionIndex + 1 >= currentQuestion.totalQuestions
      : false,
  );

  const answerProportions = $derived.by(() => {
    const entries = Object.values(session.playerAnswers);
    const total = entries.length;
    const result = new Map<string, string>();
    if (total === 0) return result;
    const counts = new Map<string, number>();
    for (const aid of entries) counts.set(aid, (counts.get(aid) ?? 0) + 1);
    for (const [aid, count] of counts) {
      result.set(aid, `${percent(count, total)}%`);
    }
    return result;
  });

  // Nobody picked the correct answer — flag the wrong answers instead of a blank screen.
  const allIncorrect = $derived.by(() => {
    const entries = Object.values(session.playerAnswers);
    if (entries.length === 0 || !correctAnswerId) return false;
    return !entries.includes(correctAnswerId);
  });

  function getAnsweredPlayers(answerId: string) {
    const result: {
      id: string;
      initial: string;
      nickname: string;
      avatarSrc: string;
    }[] = [];
    for (const [pid, aid] of Object.entries(session.playerAnswers)) {
      if (aid === answerId) {
        const player = session.playerById.get(pid);
        if (player) {
          result.push({
            id: pid,
            initial: player.nickname.charAt(0).toUpperCase(),
            nickname: player.nickname,
            avatarSrc: player.avatar ? session.getAvatarSrc(player.avatar) : "",
          });
        }
      }
    }
    return result;
  }

  // IdentityPill layout is being prototyped: the mimic dev toolbar seeds
  // `?pill=1|2|3` so all three can be compared side by side. Real play has no
  // such param, so it always resolves to the default (1).
  const pillVariant = $derived<1 | 2 | 3>(
    Math.min(3, Math.max(1, parseInt(page.url.searchParams.get("pill") ?? "1", 10))) as 1 | 2 | 3,
  );

  const canEmote = $derived(
    (session.answered || !!correctAnswerId) &&
      !session.isObserver &&
      session.pickedEmotes.length > 0,
  );

  $effect(() => {
    return registerHeaderActions(headerActionState, {
      exitQuiz: () => void session.leaveLobby(),
    });
  });

  let revealRoot = $state<HTMLDivElement | null>(null);

  // The thumbs leave on a "disabled" ack; focus on one moves to the reveal.
  $effect.pre(() => {
    if (session.canRate) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest("[data-rating-thumb]")) {
      tick().then(() => revealRoot?.focus());
    }
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    if (session.answered || session.isObserver || correctAnswerId) return;

    const key = e.key;
    if (session.questionType === "image_matching") return; // handled inside ImageMatchingGrid
    if (session.questionType === "true_false") {
      if (key === "t" || key === "T") {
        const a = session.answers.find((a) => isTrueAnswerText(a.text));
        if (a) session.selectAnswer(a.id);
      } else if (key === "f" || key === "F") {
        const a = session.answers.find((a) => isFalseAnswerText(a.text));
        if (a) session.selectAnswer(a.id);
      }
      return;
    }
    if (key >= "1" && key <= "4") {
      const answer = session.answers[parseInt(key, 10) - 1];
      if (answer) session.selectAnswer(answer.id);
    }
  }
</script>

<svelte:head><title>Quiz — Orakl</title></svelte:head>

<svelte:window onkeydown={handleKeyDown} />

<div
  bind:this={revealRoot}
  tabindex="-1"
  class="flex flex-col gap-8 focus:outline-hidden"
>
  <div class="flex flex-col gap-4">
    <QuestionHeader
      showIdentity={false}
      data={{
        avatarSrc: session.getAvatarSrc(session.selectedAvatarId),
        nickname: session.nickname,
        score: session.getMyScore(),
        progress: questionProgress,
        counter: questionCounter,
        difficulty: currentQuestion?.difficulty,
        categoryLabel: currentQuestion?.categoryId?.replace(/-/g, " "),
        lastPointsEarned: session.lastPointsEarned,
        pillVariant,
      }}
    />

    {#if !session.isObserver}
      <div class="flex min-h-7 justify-end">
        <StreakIndicator
          streak={session.streak}
          flourish={session.streakFlourish}
          nonce={session.streakNonce}
        />
      </div>
    {/if}

    <div class="relative">
      <div
        class={cn("flex flex-col gap-4", [
          session.isIntermission ? "blur-sm pointer-events-none select-none" : "",
        ])}
      >
        <QuestionBlock
          {timerState}
          {timeRemaining}
          {timerFraction}
          observer={(session.isObserver && !session.isCurator) ||
            session.isIntermission}
        >
          {currentQuestion?.text}
        </QuestionBlock>
      </div>
      {#if session.isIntermission}
        <div class="absolute inset-0 flex items-center justify-center">
          <p class="text-base font-semibold text-foreground/80">
            We're taking a break
          </p>
        </div>
      {/if}
    </div>
  </div>

  {#if currentQuestion?.mediaUrl && currentQuestion?.mediaType === "image"}
    <div
      class={cn([
        session.isIntermission ? "blur-sm pointer-events-none select-none" : "",
      ])}
    >
      <QuestionMedia src={currentQuestion.mediaUrl} />
    </div>
  {/if}

  {#snippet answerArea()}
    {#snippet playerOverlay(answerId: string)}
      {#if correctAnswerId}
        <div
          class="absolute right-2 top-0 -translate-y-1/2 flex items-center"
        >
          <PlayerAnswers
            {answerId}
            {correctAnswerId}
            selectedAnswerId={session.selectedAnswerId}
            players={getAnsweredPlayers(answerId)}
            proportion={answerProportions.get(answerId) ?? "0%"}
            {allIncorrect}
          />
        </div>
      {/if}
    {/snippet}

    {#if session.questionType !== "true_false" && session.questionType !== "image_matching"}
      <MultipleChoiceAnswers
        answers={currentQuestion?.answers ?? session.answers}
        styleState={{
          correctAnswerId: correctAnswerId ?? "",
          selectedAnswerId: session.selectedAnswerId,
          answered: session.answered,
        }}
        disabled={session.answered || session.isObserver}
        onSelect={(id) => session.selectAnswer(id)}
        overlay={playerOverlay}
      />
    {:else if session.questionType === "true_false"}
      <TrueFalseAnswers
        answers={currentQuestion?.answers ?? session.answers}
        styleState={{
          correctAnswerId: correctAnswerId ?? "",
          selectedAnswerId: session.selectedAnswerId,
          answered: session.answered,
        }}
        disabled={session.answered || session.isObserver}
        onSelect={(id) => session.selectAnswer(id)}
        overlay={playerOverlay}
      />
    {:else if session.questionType === "image_matching" && session.matchItems}
      <ImageMatchingGrid
        matchItems={session.matchItems}
        styleState={{
          correctAnswerId: correctAnswerId ?? "",
          selectedLeftItem: session.selectedLeftItem,
          selectedRightItem: session.selectedRightItem,
          answered: session.answered,
        }}
        disabled={session.answered || session.isObserver}
        onSelect={(col, item) => session.selectMatchItem(col, item)}
      />
    {/if}
    {#if __FEATURE_PLAYER_EMOTES__ && canEmote}
      <p
        class="absolute -bottom-6 text-center text-sm font-sans text-foreground-darker/50 flex items-center gap-1 w-full justify-center"
        role="status"
        transition:fly={{ duration: 200, y: -10 }}
        aria-live="polite"
      >
        <Icon name="info" class="size-4" />
        Long-press or right-click to react
      </p>
    {/if}
  {/snippet}

  {#snippet bareAnswers()}
    <div
      class={cn("relative", [
        session.isIntermission ? "blur-sm pointer-events-none select-none" : "",
      ])}
    >
      {@render answerArea()}
    </div>
  {/snippet}

  {#if emoteLayer}
    <!-- Pending branch renders the answers bare, so SSR HTML carries the full
         answer UI and only the emote gesture wrapper arrives with the chunk. -->
    {#await emoteLayer}
      {@render bareAnswers()}
    {:then { default: EmoteReactionLayer }}
      <EmoteReactionLayer
        pickedEmotes={session.pickedEmotes}
        activeEmotes={session.activeEmotes}
        {canEmote}
        intermission={session.isIntermission}
        onSend={(emoteId, x, y) => session.sendEmote(emoteId, x, y)}
      >
        {#snippet children()}
          {@render answerArea()}
        {/snippet}
      </EmoteReactionLayer>
    {:catch}
      <!-- Chunk failed (offline, stale immutable URL after a deploy): the
           answers must survive losing the emote layer. -->
      {@render bareAnswers()}
    {/await}
  {:else}
    {@render bareAnswers()}
  {/if}

  {#if session.feedbackStatus === "pending"}
    <AnswerStatus
      status={session.feedbackStatus}
      answeredCount={session.answeredCount}
      totalToAnswer={session.totalToAnswer}
    />
  {/if}

  {#if correctAnswerId && session.postAnswerNote}
    <div in:scale={{ start: 0.95, duration: 150 }}>
      <PostAnswerNote note={session.postAnswerNote} />
    </div>
  {/if}

  {#snippet nextQuestionRing(padded: boolean)}
    <!-- Hidden, not removed, during an intermission so the page keeps its height under the rest overlay. -->
    <div
      class="flex flex-col items-center gap-2"
      class:py-4={padded}
      class:invisible={session.isIntermission}
    >
      <RingTimer
        size="sm"
        timerState={isLastQuestion ? "final" : "counting"}
        timeRemaining={session.nextQuestionCountdown}
        timerFraction={session.nextQuestionCountdown / session.nextQuestionCountdownTotal}
      />
      {#if isLastQuestion}
        <p class="text-sm text-foreground-darker">
          Final standings in {session.nextQuestionCountdown}
        </p>
      {/if}
    </div>
  {/snippet}

  {#snippet thumbsRing()}
    {@render nextQuestionRing(false)}
  {/snippet}

  {#if uiFlags.QUESTION_RATING === true && session.canRate && correctAnswerId}
    <div class="py-4" class:invisible={session.isIntermission}>
      <RatingThumbs
        rating={session.rating}
        onrate={(r) => session.rate(r)}
        children={session.nextQuestionCountdown > 0 ? thumbsRing : undefined}
      />
    </div>
  {:else if session.nextQuestionCountdown > 0}
    {@render nextQuestionRing(true)}
  {/if}
</div>

