<script lang="ts">
import { percent } from "@orakl/shared";
  import { onMount } from "svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import QuestionBlock from "$lib/components/quiz/QuestionBlock.svelte";
  import QuestionMedia from "$lib/components/quiz/QuestionMedia.svelte";
  import PostAnswerNote from "$lib/components/quiz/PostAnswerNote.svelte";
  import MultipleChoiceAnswers from "$lib/components/quiz/MultipleChoiceAnswers.svelte";
  import TrueFalseAnswers from "$lib/components/quiz/TrueFalseAnswers.svelte";
  import { toast } from "@/lib/toast.js";
  
  import { toSourceLink } from "@/lib/source-link.js";
  import type { FlagDetail } from "@orakl/protocol";
  import { formatDateTimeEnGb } from "@/lib/format.js";

  let {
    questionId,
    open,
    onClose,
    onResolved,
  }: {
    questionId: string;
    open: boolean;
    onClose: () => void;
    onResolved: (questionId: string) => void;
  } = $props();

  let detail = $state<FlagDetail | null>(null);
  let loading = $state(true);
  let loadError = $state("");
  let resolving = $state(false);

  async function load() {
    loading = true;
    loadError = "";
    try {
      const res = await fetch(`/api/manage/flagged-questions/${questionId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      detail = (await res.json()) as FlagDetail;
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load flag detail";
    } finally {
      loading = false;
    }
  }

  onMount(load);

  async function resolve() {
    resolving = true;
    try {
      const res = await fetch(`/api/manage/flagged-questions/${questionId}/resolve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (detail) detail = { ...detail, status: "resolved" };
      onResolved(questionId);
      toast.success("Flags resolved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve flags");
    } finally {
      resolving = false;
    }
  }

  // Only render a flagger's URL as a real link when it's a well-formed
  // http(s) URL — never trust freeform text as a href.
  function isHttpUrl(url: string | null): url is string {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  const sourceLink = $derived(toSourceLink(detail?.snapshot.source));

  const correctAnswerId = $derived(
    detail?.snapshot.answers.find((a) => a.isCorrect)?.id ?? "",
  );

  // Percentage denominator is reporters who actually named an answer — not
  // every reporter (some flags carry no selectedAnswerId).
  const reportersWithSelection = $derived(
    detail?.reporters.filter((r) => r.selectedAnswerId !== null) ?? [],
  );

  function percentageFor(answerId: string): number {
    const total = reportersWithSelection.length;
    if (total === 0) return 0;
    const count = reportersWithSelection.filter(
      (r) => r.selectedAnswerId === answerId,
    ).length;
    return percent(count, total);
  }

  function formatDate(iso: string): string {
    return formatDateTimeEnGb(iso);
  }
</script>

{#snippet answerOverlay(answerId: string)}
  {#if reportersWithSelection.length > 0}
    <div class="absolute right-2 top-0 -translate-y-1/2 flex items-center">
      <Badge variant="status" tone={answerId === correctAnswerId ? "success" : "neutral"}
        >{percentageFor(answerId)}%</Badge
      >
    </div>
  {/if}
{/snippet}

<ResponsiveOverlay
  id="flagged-question-modal"
  {open}
  hasTitle={true}
  panelClass="lg:max-w-[42rem]"
  bodyClass="flex flex-col gap-5"
  onClose={onClose}
>
  {#snippet title()}
    Flagged question
    {#if detail}
      <span class="ml-2 font-mono text-xs text-foreground-darker">{questionId.slice(0, 8)}</span>
    {/if}
  {/snippet}

  {#if loading}
    <p class="text-sm text-foreground-darker">Loading…</p>
  {:else if loadError}
    <p class="text-sm text-danger" role="alert">{loadError}</p>
  {:else if detail}
    <div class="flex items-center gap-2">
      <Badge variant="status" tone={detail.status === "open" ? "warning" : "success"}>{detail.status}</Badge>
      <span class="text-xs text-foreground-darker">
        {detail.reporters.length} {detail.reporters.length === 1 ? "report" : "reports"}
      </span>
    </div>

    <QuestionBlock
      timerState="counting"
      timeRemaining={0}
      timerFraction={1}
      observer={true}
    >
      {detail.snapshot.text}
    </QuestionBlock>

    {#if detail.snapshot.mediaUrl && detail.snapshot.mediaType === "image"}
      <QuestionMedia src={detail.snapshot.mediaUrl} />
    {/if}

    {#if detail.snapshot.postAnswerNote}
      <PostAnswerNote note={detail.snapshot.postAnswerNote} />
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

    {#if detail.snapshot.type === "true_false"}
      <TrueFalseAnswers
        answers={detail.snapshot.answers}
        styleState={{ correctAnswerId, selectedAnswerId: null, answered: true }}
        disabled={true}
        onSelect={() => {}}
        overlay={answerOverlay}
      />
    {:else}
      <MultipleChoiceAnswers
        answers={detail.snapshot.answers}
        styleState={{ correctAnswerId, selectedAnswerId: null, answered: true }}
        disabled={true}
        onSelect={() => {}}
        overlay={answerOverlay}
      />
    {/if}

    <div class="flex flex-col gap-2">
      <p class="text-lg">Reporters</p>
      <Card padding="none" class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-background-lighter/20 text-foreground-darker">
            <tr>
              <th class="px-3 py-2 font-medium">User</th>
              <th class="px-3 py-2 font-medium">Nickname</th>
              <th class="px-3 py-2 font-medium">Email</th>
              <th class="px-3 py-2 font-medium">Reason</th>
              <th class="px-3 py-2 font-medium">URL</th>
              <th class="px-3 py-2 font-medium">Reported</th>
            </tr>
          </thead>
          <tbody>
            {#each detail.reporters as r (r.userId)}
              <tr class="border-t border-background-lighter/20">
                <td class="px-3 py-2 font-mono text-foreground-darker">{r.userId.slice(0, 8)}</td>
                <td class="px-3 py-2">{r.nickname ?? "Not given"}</td>
                <td class="px-3 py-2 font-mono">{r.email}</td>
                <td class="px-3 py-2 italic text-foreground-darker">{r.reason ?? "None"}</td>
                <td class="px-3 py-2 max-w-[16rem] truncate">
                  {#if isHttpUrl(r.url)}
                    <Link
                      href={r.url}
                      intent="inline"
                      target="_blank"
                      rel="noopener noreferrer"
                      data-tooltip={r.url}
                    >{new URL(r.url).hostname}</Link>
                  {:else}
                    <span class="text-foreground-darker/40">None</span>
                  {/if}
                </td>
                <td class="px-3 py-2 whitespace-nowrap text-foreground-darker">{formatDate(r.createdAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </Card>
    </div>
  {/if}

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="outline" intent="compact" onclick={onClose}>Close</Button>
      {#if detail && detail.status === "open"}
        <Button intent="compact" onclick={resolve} disabled={resolving}>
          {resolving ? "Resolving…" : "Resolve"}
        </Button>
      {/if}
    </div>
  {/snippet}
</ResponsiveOverlay>
