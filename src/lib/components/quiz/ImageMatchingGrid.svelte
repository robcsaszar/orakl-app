<script lang="ts">
  import { tick } from "svelte";
  import { drawMatchLines, drawPendingLine, drawHoverLine } from "@/lib/question-helpers.js";
  import {
    answerInputOf,
    resolveMatchItemState,
    type AnswerInput,
    type AnswerState,
  } from "@/lib/answer-variants.js";
  import type { MatchStyleState } from "@orakl/client-core";
  import AnswerButton from "$lib/components/ui/AnswerButton.svelte";
  import { fade } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import type { Snippet } from "svelte";

  const LEFT_KEYS  = ["1", "2", "3", "4"] as const;
  const RIGHT_KEYS = ["A", "B", "C", "D"] as const;

  interface Props {
    matchItems: { left: string[]; right: string[] };
    styleState: MatchStyleState;
    disabled: boolean;
    onSelect: (col: "left" | "right", item: string, input: AnswerInput) => void;
    overlay?: Snippet<[pair: string]>;
  }

  let { matchItems, styleState, disabled, onSelect, overlay }: Props = $props();

  let containerEl: HTMLElement | undefined;
  let hoverSvgEl: SVGSVGElement | undefined;

  let hoveredCol  = $state<"left" | "right" | null>(null);
  let hoveredItem = $state<string | null>(null);

  function token(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled || styleState.correctAnswerId) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key;
    const li = LEFT_KEYS.indexOf(key as typeof LEFT_KEYS[number]);
    if (li !== -1 && li < matchItems.left.length) { e.preventDefault(); onSelect("left", matchItems.left[li], answerInputOf(e)); return; }
    const ri = RIGHT_KEYS.indexOf(key.toUpperCase() as typeof RIGHT_KEYS[number]);
    if (ri !== -1 && ri < matchItems.right.length) { e.preventDefault(); onSelect("right", matchItems.right[ri], answerInputOf(e)); }
  }

  $effect(() => {
    const { correctAnswerId, selectedLeftItem, selectedRightItem } = styleState;
    if (!containerEl) return;
    (containerEl.querySelector("[data-match-svg]") as SVGSVGElement | null)?.replaceChildren();
    let cancelled = false;
    if (correctAnswerId) {
      tick().then(() => {
        if (!cancelled && containerEl)
          drawMatchLines(containerEl, correctAnswerId,
            selectedLeftItem && selectedRightItem ? `${selectedLeftItem}|${selectedRightItem}` : null,
            token("--color-success"), token("--color-danger"));
      });
    } else if (selectedLeftItem && selectedRightItem) {
      tick().then(() => {
        if (!cancelled && containerEl)
          drawPendingLine(containerEl, selectedLeftItem, selectedRightItem, token("--color-secondary"));
      });
    }
    return () => { cancelled = true; };
  });

  $effect(() => {
    if (!hoverSvgEl || !containerEl) return;
    if (disabled || styleState.correctAnswerId || !hoveredCol || !hoveredItem) { hoverSvgEl.replaceChildren(); return; }
    const left  = hoveredCol === "left"  ? hoveredItem : styleState.selectedLeftItem;
    const right = hoveredCol === "right" ? hoveredItem : styleState.selectedRightItem;
    if (!left || !right) { hoverSvgEl.replaceChildren(); return; }
    drawHoverLine(containerEl, hoverSvgEl, left, right, token("--color-secondary"));
  });

  // Derive the overlay pair string for a given button state — shared by both columns
  function overlayPair(state: AnswerState): string | null {
    if (state === "correct") return styleState.correctAnswerId;
    if (state === "incorrect" && styleState.selectedLeftItem && styleState.selectedRightItem)
      return `${styleState.selectedLeftItem}|${styleState.selectedRightItem}`;
    return null;
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<!--
  State and overlayPair are computed HERE in the {#each} body where Svelte CAN
  track styleState as a reactive dependency. They are then passed as explicit
  snippet args so the snippet re-renders whenever the caller does.
-->
{#snippet matchBtn(
  col: "left" | "right",
  item: string,
  i: number,
  state: AnswerState,
  pair: string | null,
)}
  {@const keys = col === "left" ? LEFT_KEYS : RIGHT_KEYS}
  <AnswerButton
    {...col === "left" ? { "data-match-left": item } : { "data-match-right": item }}
    {state}
    questionType="match"
    onclick={(e) => onSelect(col, item, answerInputOf(e))}
    onmouseenter={() => { hoveredCol = col; hoveredItem = item; }}
    onmouseleave={() => { hoveredCol = null; hoveredItem = null; }}
    {disabled}
  >
    {#if state === "idle" && i < keys.length}
      <span
        class="absolute left-2 top-2 hidden sm:flex size-5 items-center justify-center rounded bg-current"
        aria-hidden="true"
        in:fade={{ duration: 200, easing: cubicOut }}
        out:fade={{ duration: 100, easing: cubicOut }}
      >
        <span class="text-background font-sans font-black text-xs">{keys[i]}</span>
      </span>
    {/if}
    {item}
    {#if overlay && pair}{@render overlay(pair)}{/if}
  </AnswerButton>
{/snippet}

<div role="group">
  <div class="relative isolate" data-match-container bind:this={containerEl}>
    <div class="grid grid-cols-2 gap-x-10 gap-y-2 md:gap-x-20">
      <span class="text-center text-xs font-semibold uppercase tracking-widest text-foreground-darker font-sans">Match from</span>
      <span class="text-center text-xs font-semibold uppercase tracking-widest text-foreground-darker font-sans">Match to</span>
      {#each matchItems.left as lItem, i (lItem)}
        {@const rItem   = matchItems.right[i]}
        {@const lRaw    = resolveMatchItemState("left",  lItem, styleState)}
        {@const rRaw    = resolveMatchItemState("right", rItem, styleState)}
        {@const lState  = disabled && lRaw === "idle" ? "dimmed" : lRaw}
        {@const rState  = disabled && rRaw === "idle" ? "dimmed" : rRaw}
        {@render matchBtn("left",  lItem, i, lState, overlayPair(lState))}
        {@render matchBtn("right", rItem,  i, rState, overlayPair(rState))}
      {/each}
    </div>
    <svg data-match-svg class="absolute inset-0 pointer-events-none overflow-visible -z-10" style="width:100%;height:100%" aria-hidden="true"></svg>
    <svg class="absolute inset-0 pointer-events-none overflow-visible" style="width:100%;height:100%" aria-hidden="true" bind:this={hoverSvgEl}></svg>
  </div>
</div>
