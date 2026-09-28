<script lang="ts">
import { toIsoTimestamp } from "@orakl/shared";
  import { onMount } from "svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import QuestionMedia from "$lib/components/quiz/QuestionMedia.svelte";
  import MultipleChoiceAnswers from "$lib/components/quiz/MultipleChoiceAnswers.svelte";
  import TrueFalseAnswers from "$lib/components/quiz/TrueFalseAnswers.svelte";
  import RevisionList from "$lib/components/questions/RevisionList.svelte";
  import {
    type AuthoredQuestionDto,
    type RevisionsDto,
    authorLabel,
  } from "@orakl/shared";
  import type { AuthoredQuestionRow } from "@orakl/protocol";
  
  import { formatDateTimeEnGb } from "@/lib/format.js";

  let {
    row,
    open,
    onClose,
    onPromote,
    onReconfirm,
    onWithdraw,
  }: {
    row: AuthoredQuestionRow;
    open: boolean;
    onClose: () => void;
    /** Resolves to a refusal message, or null once promoted. */
    onPromote: (row: AuthoredQuestionRow) => Promise<string | null>;
    /** Resolves to a refusal message, or null once reconfirmed. */
    onReconfirm: (row: AuthoredQuestionRow) => Promise<string | null>;
    onWithdraw: (row: AuthoredQuestionRow) => void;
  } = $props();

  let detail = $state<AuthoredQuestionDto | null>(null);
  let loading = $state(true);
  let loadError = $state("");
  let actionError = $state("");

  let history = $state<RevisionsDto | null>(null);
  let revisionsLoading = $state(true);
  let revisionsError = $state("");

  async function load() {
    loading = true;
    loadError = "";
    try {
      const res = await fetch(`/api/manage/questions/${row.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      detail = (await res.json()) as AuthoredQuestionDto;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load question";
    } finally {
      loading = false;
    }
  }

  async function loadRevisions() {
    revisionsLoading = true;
    revisionsError = "";
    try {
      const res = await fetch(`/api/manage/questions/${row.id}/revisions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      history = (await res.json()) as RevisionsDto;
    } catch (e) {
      revisionsError = e instanceof Error ? e.message : "Failed to load history";
    } finally {
      revisionsLoading = false;
    }
  }

  onMount(() => {
    load();
    loadRevisions();
  });

  // The decision is taken here, on the question just read; the row updates
  // through the same handlers the table uses, and the detail re-reads.
  async function act(fn: (row: AuthoredQuestionRow) => Promise<string | null>) {
    actionError = "";
    const refusal = await fn(row);
    if (refusal) {
      actionError = refusal;
      return;
    }
    await load();
  }

  const author = $derived(detail ? authorLabel(detail.author) : "");
  const withdrawer = $derived(
    detail?.unpublished_by
      ? authorLabel({
          id: detail.unpublished_by,
          nickname: detail.unpublisher?.nickname ?? null,
          email: detail.unpublisher?.email ?? null,
        })
      : null,
  );

  const correctAnswerId = $derived(
    detail?.snapshot.answers.find((a) => a.isCorrect)?.id ?? "",
  );

  // The choice grids do not fit matching pairs; a plain table in stored
  // order does, with the correct pair marked.
  const pairs = $derived.by(() => {
    const items = detail?.matchItems;
    if (!items) return [];
    return items.left.map((left, i) => ({
      left,
      right: items.right[i] ?? "",
      isCorrect: i === items.correctPairIndex,
    }));
  });

  function formatDate(stamp: string): string {
    return formatDateTimeEnGb(toIsoTimestamp(stamp));
  }
</script>

{#snippet promoteIcon()}
  <Icon name="check" class="size-4" />
{/snippet}

<ResponsiveOverlay
  id="authored-question-modal"
  {open}
  hasTitle={true}
  panelClass="lg:max-w-[42rem]"
  bodyClass="flex flex-col gap-5"
  onClose={onClose}
>
  {#snippet title()}
    Authored question
    {#if detail}
      <span class="ml-2 font-mono text-xs text-foreground-darker">{row.id.slice(0, 8)}</span>
    {/if}
  {/snippet}

  {#if loading}
    <p class="text-sm text-foreground-darker">Loading…</p>
  {:else if loadError}
    <p class="text-sm text-danger" role="alert">{loadError}</p>
  {:else if detail}
    <div class="flex flex-col gap-2">
      <p class="text-sm">
        <span class="text-foreground-darker">Written by</span>
        {author}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        {#if detail.published_at}
          {#if detail.changed_since_publish === 1}
            <Badge variant="status" tone="warning">Shared · edited</Badge>
          {:else}
            <Badge variant="status" tone="success">Shared</Badge>
          {/if}
        {:else}
          <Badge variant="status" tone="neutral">Private</Badge>
        {/if}
        <Badge variant="category">{detail.category}</Badge>
        <Badge variant={detail.snapshot.difficulty as "easy" | "medium" | "hard"}>
          {detail.snapshot.difficulty}
        </Badge>
      </div>
    </div>

    {#if detail.changed_since_publish === 1}
      <p role="status" class="text-xs text-warning">
        Edited by its author since promotion. Re-read the history below before confirming.
      </p>
    {/if}

    {#if !detail.published_at && detail.unpublish_reason}
      <p class="text-xs text-foreground-darker">
        Withdrawn {formatDate(detail.unpublished_at ?? "")}{#if withdrawer}<span>{" by "}{withdrawer}</span>{/if}: {detail.unpublish_reason}
      </p>
    {/if}

    <h2 class="text-pretty text-xl font-bold leading-tight md:text-2xl">
      {detail.snapshot.text}
    </h2>

    {#if detail.snapshot.mediaUrl && detail.snapshot.mediaType === "image"}
      <QuestionMedia src={detail.snapshot.mediaUrl} />
    {/if}

    {#if detail.matchItems}
      <Card padding="none" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-background-lighter/20 text-foreground-darker">
            <tr>
              <th class="px-3 py-2 font-medium">Match from</th>
              <th class="px-3 py-2 font-medium">Match to</th>
            </tr>
          </thead>
          <tbody>
            {#each pairs as pair, i (i)}
              <tr
                class="border-t border-background-lighter/20"
                class:bg-success-light={pair.isCorrect}
              >
                <td class="px-3 py-2">{pair.left}</td>
                <td class="px-3 py-2">{pair.right}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Card>
    {:else if detail.snapshot.type === "true_false"}
      <div class="[&>div]:mx-0 [&>div]:max-w-none">
        <TrueFalseAnswers
          answers={detail.snapshot.answers}
          styleState={{ correctAnswerId, selectedAnswerId: null, answered: true }}
          disabled={true}
          onSelect={() => {}}
        />
      </div>
    {:else}
      <div class="[&>div]:mx-0 [&>div]:max-w-none">
        <MultipleChoiceAnswers
          answers={detail.snapshot.answers}
          styleState={{ correctAnswerId, selectedAnswerId: null, answered: true }}
          disabled={true}
          onSelect={() => {}}
        />
      </div>
    {/if}

    <div class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold">History</h3>
      {#if revisionsLoading}
        <p class="text-sm text-foreground-darker">Loading…</p>
      {:else if revisionsError}
        <p class="text-sm text-danger" role="alert">{revisionsError}</p>
      {:else if history}
        <RevisionList
          revisions={history.revisions}
          current={history.current}
          showActor
          emptyLabel="No edits since it was written."
        />
      {/if}
    </div>

    {#if actionError}
      <Card variant="warning" role="alert">
        <span class="text-sm">
          {actionError}
          <Link href="/manage/flagged-questions" intent="inline">Flagged questions</Link>
        </span>
      </Card>
    {/if}
  {/if}

  {#snippet footer()}
    <div class="flex flex-wrap items-center justify-end gap-3">
      {#if detail}
        {#if !detail.published_at}
          <ConfirmButton
            label="Promote"
            confirmLabel="Promote to the shared bank?"
            confirmVariant="success"
            icon={promoteIcon}
            class="mx-0 rounded-2xl corner-shape-squircle border-2 border-success/40 bg-success/15 px-3 py-1.5 text-sm font-semibold leading-none text-success hover:bg-success/25"
            onConfirm={() => act(onPromote)}
          />
        {:else}
          {#if detail.changed_since_publish === 1}
            <ConfirmButton
              label="Confirm"
              confirmLabel="Keep it in the shared bank?"
              confirmVariant="success"
              icon={promoteIcon}
              class="mx-0 rounded-2xl corner-shape-squircle border-2 border-success/40 bg-success/15 px-3 py-1.5 text-sm font-semibold leading-none text-success hover:bg-success/25"
              onConfirm={() => act(onReconfirm)}
            />
          {/if}
          {#if detail.author.id !== null}
            <Button variant="outline" intent="compact" onclick={() => onWithdraw(row)}>Withdraw</Button>
          {/if}
        {/if}
      {/if}
      <Button variant="ghost" intent="compact" onclick={onClose}>Close</Button>
    </div>
  {/snippet}
</ResponsiveOverlay>
