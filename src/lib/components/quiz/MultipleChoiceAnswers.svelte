<script lang="ts">
  import {
    answerInputOf,
    resolveAnswerState,
    type AnswerInput,
  } from "@/lib/answer-variants.js";
  import type { AnswerStyleState } from "@orakl/client-core";
  import AnswerButton from "$lib/components/ui/AnswerButton.svelte";
  import { cubicOut } from "svelte/easing";
  import { fade } from "svelte/transition";

  interface Props {
    answers: { id: string; text: string }[];
    styleState: AnswerStyleState;
    disabled: boolean;
    onSelect: (id: string, input: AnswerInput) => void;
    overlay?: import("svelte").Snippet<[answerId: string]>;
  }

  let { answers, styleState, disabled, onSelect, overlay }: Props = $props();
</script>

<div class="grid gap-4 grid-rows-4 grid-cols-1 max-w-lg mx-auto flex-1 self-stretch">
  {#each answers as answer, index (answer.id)}
    {@const rawState = resolveAnswerState(answer.id, styleState)}
    {@const state = disabled && rawState === "idle" ? "dimmed" : rawState}
    <AnswerButton
      {state}
      onclick={(e) => onSelect(answer.id, answerInputOf(e))}
      {disabled}
      aria-keyshortcuts={String(index + 1)}
    >
      {#if state === "idle"}
        <span
          class="absolute left-2 top-2 hidden sm:flex size-5 items-center justify-center rounded bg-current"
          aria-hidden="true"
          out:fade={{ duration: 100, easing: cubicOut }}
          in:fade={{ duration: 200, easing: cubicOut }}
        >
          <span class="text-background font-sans font-black text-xs">
            {index + 1}
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
