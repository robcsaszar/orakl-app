<script lang="ts">
  import {
    answerInputOf,
    resolveTrueFalseState,
    type AnswerInput,
  } from "@/lib/answer-variants.js";
  import { isTrueAnswerText, type AnswerStyleState } from "@orakl/client-core";
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import AnswerButton from "$lib/components/ui/AnswerButton.svelte";

  interface Props {
    answers: { id: string; text: string }[];
    styleState: AnswerStyleState;
    disabled: boolean;
    onSelect: (id: string, input: AnswerInput) => void;
    overlay?: import("svelte").Snippet<[answerId: string]>;
  }

  let { answers, styleState, disabled, onSelect, overlay }: Props = $props();
</script>

<div class="flex gap-4">
  {#each answers as answer (answer.id)}
    {@const raw = resolveTrueFalseState(answer.id, styleState, answers)}
    {@const state = disabled && raw.state === "idle" ? "dimmed" : raw.state}
    {@const flavor = raw.flavor}
    <AnswerButton
      {state}
      {flavor}
      questionType="true_false"
      onclick={(e) => onSelect(answer.id, answerInputOf(e))}
      {disabled}
      aria-keyshortcuts={isTrueAnswerText(answer.text) ? "t" : "f"}
    >
      {#if state === "idle"}
        <span
          class="absolute left-2 top-2 hidden sm:flex size-5 items-center justify-center rounded bg-current"
          aria-hidden="true"
          out:fade={{ duration: 100, easing: cubicOut }}
          in:fade={{ duration: 200, easing: cubicOut }}
        >
          <span class="text-background font-sans font-black text-xs">
            {isTrueAnswerText(answer.text) ? "T" : "F"}
          </span>
        </span>
      {/if}
      <span>{answer.text}</span>
      {#if overlay}
        {@render overlay(answer.id)}
      {/if}
    </AnswerButton>
  {/each}
</div>
