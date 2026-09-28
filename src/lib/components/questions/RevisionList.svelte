<script lang="ts">
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { authorLabel } from "@orakl/shared";
  import { diffQuestions } from "@/lib/question-diff.js";
  import { formatDateTimeDefault } from "@/lib/format.js";
  import type {
    OperatorQuestionRevision,
    QuestionRevision,
  } from "@orakl/protocol";
  import type { Question } from "@orakl/protocol";

  let {
    revisions,
    current,
    emptyLabel,
    showActor = false,
  }: {
    /** Newest first; each holds the question as it was before that edit. */
    revisions: QuestionRevision[];
    /** The question as it is now, so the newest entry can say what it changed. */
    current: Question;
    emptyLabel?: string;
    showActor?: boolean;
  } = $props();

  // Each edit is read against the version that followed it: the next-newer
  // revision's snapshot, or the current question for the newest entry.
  const entries = $derived(
    revisions.map((revision, i) => ({
      revision,
      changes: diffQuestions(
        revision.question,
        i === 0 ? current : revisions[i - 1].question,
      ),
    })),
  );

  let expanded = $state(new Set<string>());
  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  }

  function actorFor(revision: QuestionRevision): string {
    const actor = (revision as OperatorQuestionRevision).actor ?? null;
    return authorLabel({
      id: revision.actorId,
      nickname: actor?.nickname ?? null,
      email: actor?.email ?? null,
    });
  }

  function formatDate(iso: string): string {
    return formatDateTimeDefault(iso);
  }

  // Image-matching pairs, correct one marked; other types render correctAnswer/incorrectAnswers.
  function pairsFor(question: QuestionRevision["question"]) {
    if (question.type !== "image_matching") return null;
    return question.matchItems.left.map((left, i) => {
      const right = question.matchItems.right[i] ?? "";
      return { left, right, isCorrect: `${left}|${right}` === question.correctAnswer };
    });
  }
</script>

{#if revisions.length === 0}
  <p role="status" class="text-sm text-foreground-darker">{emptyLabel ?? "No edits yet."}</p>
{:else}
  <ul class="flex flex-col gap-3">
    {#each entries as { revision, changes } (revision.id)}
      {@const pairs = pairsFor(revision.question)}
      {@const open = expanded.has(revision.id)}
      <li>
        <Card padding="sm" class="gap-2">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="text-xs text-foreground-darker">
              <span>{formatDate(revision.createdAt)}</span>{#if showActor}<span>{" · by "}{actorFor(revision)}</span>{/if}
            </span>
            <Button
              variant="ghost"
              intent="compact"
              aria-expanded={open}
              onclick={() => toggle(revision.id)}
            >{open ? "Hide version" : "Show version"}</Button>
          </div>

          {#if changes.length === 0}
            <p class="text-sm text-foreground-darker">Saved without changes.</p>
          {:else}
            <dl class="flex flex-col gap-1.5 text-sm">
              {#each changes as change (change.label)}
                <div class="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <dt class="shrink-0 text-foreground-darker sm:w-28">{change.label}</dt>
                  {#if change.kind === "value"}
                    <dd class="flex flex-wrap items-baseline gap-x-2">
                      <span class="text-foreground-darker line-through">{change.before}</span>
                      <span aria-hidden="true" class="text-foreground-darker">→</span>
                      <span>{change.after}</span>
                    </dd>
                  {:else}
                    <dd class="flex flex-col gap-0.5">
                      {#each change.removed as item (item)}
                        <span class="text-foreground-darker line-through">{item}</span>
                      {/each}
                      {#each change.added as item (item)}
                        <span><span aria-hidden="true" class="text-foreground-darker">+ </span>{item}</span>
                      {/each}
                    </dd>
                  {/if}
                </div>
              {/each}
            </dl>
          {/if}

          {#if open}
            <div class="flex flex-col gap-2 border-t border-secondary/10 pt-2">
              <p class="text-sm">{revision.question.question.text}</p>
              <ul class="flex flex-col gap-1 text-sm">
                {#if pairs}
                  {#each pairs as pair (pair.left + pair.right)}
                    <li class="flex items-center gap-2">
                      <span>{pair.left} — {pair.right}</span>
                      {#if pair.isCorrect}<Badge variant="status" tone="success">Correct</Badge>{/if}
                    </li>
                  {/each}
                {:else}
                  <li class="flex items-center gap-2">
                    <span>{revision.question.correctAnswer}</span>
                    <Badge variant="status" tone="success">Correct</Badge>
                  </li>
                  {#each revision.question.incorrectAnswers as answer (answer)}
                    <li>{answer}</li>
                  {/each}
                {/if}
              </ul>
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="category">{revision.question.category}</Badge>
                <Badge variant={revision.question.difficulty}>{revision.question.difficulty}</Badge>
              </div>
            </div>
          {/if}
        </Card>
      </li>
    {/each}
  </ul>
{/if}
