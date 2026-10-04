<script lang="ts">
  import QuestionForm from "$lib/components/questions/QuestionForm.svelte";
  import type {
    QuestionFormCategory,
    QuestionFormQuestion,
  } from "$lib/components/questions/question-form.js";
  import Button from "$lib/components/ui/Button.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import { toast } from "@/lib/toast.js";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import QuestionHistoryModal from "./QuestionHistoryModal.svelte";

  type Category = QuestionFormCategory;

  interface OwnQuestion {
    id: string;
    category: string;
    label: string;
    created_at: string;
    /** Thumbs counts since the last edit and all-time; absent with the rating flag off. */
    ratings?: { up: number; down: number; upAllTime: number; downAllTime: number };
  }

  let {
    categories,
    ownQuestions = [],
    questionsCursor = null,
  }: {
    categories: Category[];
    ownQuestions?: OwnQuestion[];
    questionsCursor?: string | null;
  } = $props();

  let editing = $state<QuestionFormQuestion | null>(null);
  // Writable derived: optimistic count/add updates reassign locally; resets
  // to server truth when the prop refreshes.
  let localCategories = $derived<Category[]>(categories);

  /** Saves the form's payload: POST for a new question, PATCH for the one being edited. */
  async function saveQuestion(payload: Record<string, unknown>): Promise<boolean> {
    const editedId = editing?.id ?? null;
    const isEditing = editedId !== null;
    const categoryId = payload.categoryId;
    try {
      const res = await fetch(
        isEditing ? `/api/custom-questions/${editedId}` : "/api/custom-questions",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.ok) {
        if (isEditing) {
          toast.success("Question saved.");
          const prior = libraryQuestions.find((q) => q.id === editedId);
          const newCategory = localCategories.find((c) => c.id === categoryId);
          libraryQuestions = libraryQuestions.map((q) =>
            q.id === editedId
              ? {
                  ...q,
                  label: String(payload.questionText),
                  category: newCategory?.name ?? q.category,
                  // An edit restarts the since-edit window; all-time stays.
                  ratings: q.ratings && { ...q.ratings, up: 0, down: 0 },
                }
              : q,
          );
          if (prior && newCategory && prior.category !== newCategory.name) {
            localCategories = localCategories.map((c) => {
              if (c.name === prior.category) return { ...c, count: Math.max(0, c.count - 1) };
              if (c.id === newCategory.id) return { ...c, count: c.count + 1 };
              return c;
            });
          }
          editing = null;
        } else {
          toast.success("Question added.");
          localCategories = localCategories.map((c) =>
            c.id === categoryId ? { ...c, count: c.count + 1 } : c,
          );
        }
      } else {
        const data = await res.json() as { error?: string };
        toast.error(data.error ?? (isEditing ? "Failed to save question." : "Failed to add question."));
      }
      return res.ok;
    } catch {
      toast.error("Network error. Try again.");
      return false;
    }
  }

  // Writable derived: optimistic deletes/appended pages reassign locally;
  // resets to server truth when the prop refreshes.
  let libraryQuestions = $derived<OwnQuestion[]>(ownQuestions);
  let nextCursor = $derived<string | null>(questionsCursor);
  let loadingMore = $state(false);
  let pendingDeleteId = $state<string | null>(null);
  let deleting = $state(false);
  let historyId = $state<string | null>(null);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    loadingMore = true;
    try {
      const res = await fetch(
        `/api/custom-questions?cursor=${encodeURIComponent(nextCursor)}`,
      );
      if (!res.ok) {
        toast.error("Could not load more questions. Try again.");
        return;
      }
      const data = await res.json() as { entries: OwnQuestion[]; nextCursor: string | null };
      libraryQuestions = [...libraryQuestions, ...data.entries];
      nextCursor = data.nextCursor;
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      loadingMore = false;
    }
  }

  async function confirmDelete() {
    const id = pendingDeleteId;
    if (!id || deleting) return;
    deleting = true;
    try {
      const res = await fetch(`/api/custom-questions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Delete failed.");
        return;
      }
      // Look up in the loaded list (not the first-page prop) so questions
      // appended via load more still decrement their category count.
      const deleted = libraryQuestions.find((q) => q.id === id);
      libraryQuestions = libraryQuestions.filter((q) => q.id !== id);
      localCategories = localCategories.map((c) =>
        deleted && c.name === deleted.category ? { ...c, count: Math.max(0, c.count - 1) } : c,
      );
      pendingDeleteId = null;
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      deleting = false;
    }
  }

  function questionLabel(q: OwnQuestion): string {
    return q.label || q.id;
  }


  async function startEdit(q: OwnQuestion) {
    try {
      const res = await fetch(`/api/custom-questions/${q.id}`);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Could not load question.");
        return;
      }
      editing = (await res.json()) as QuestionFormQuestion;
    } catch {
      toast.error("Network error. Try again.");
    }
  }
</script>

<QuestionForm
  categories={localCategories}
  question={editing}
  onsubmit={saveQuestion}
  oncancel={() => (editing = null)}
  oncategoryadded={(c) => (localCategories = [...localCategories, c])}
/>


{#if libraryQuestions.length > 0}
  <section aria-label="Your question library" class="mt-8 flex flex-col gap-3">
    <h2 class="text-xl">Your questions ({libraryQuestions.length})</h2>

    <ul class="flex flex-col gap-2">
      {#each libraryQuestions as q (q.id)}
        <li>
          <Card padding="sm" class="gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 flex-col gap-0.5 sm:flex-1">
              <span class="truncate text-sm">{questionLabel(q)}</span>
              <span class="text-xs text-foreground-darker">{q.category} · {q.created_at.slice(0, 10)}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:justify-end">
              {#if q.ratings}
                <Badge variant="status" tone="neutral" class="inline-flex items-center gap-1" data-tooltip="{q.ratings.upAllTime} all time">
                  <Icon name="thumb-up" class="size-4" />
                  <span aria-hidden="true">{q.ratings.up}</span>
                  <span class="sr-only">{q.ratings.up} good since last edit, {q.ratings.upAllTime} all time</span>
                </Badge>
                <Badge variant="status" tone="neutral" class="inline-flex items-center gap-1" data-tooltip="{q.ratings.downAllTime} all time">
                  <Icon name="thumb-down" class="size-4" />
                  <span aria-hidden="true">{q.ratings.down}</span>
                  <span class="sr-only">{q.ratings.down} bad since last edit, {q.ratings.downAllTime} all time</span>
                </Badge>
              {/if}
              <Button
                variant="ghost"
                intent="compact"
                aria-label="Question history"
                onclick={() => (historyId = q.id)}
              >
                History
              </Button>
              <Button
                variant="secondary"
                intent="compact"
                aria-label="Edit question"
                onclick={() => startEdit(q)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                intent="compact"
                aria-label="Delete question"
                onclick={() => (pendingDeleteId = q.id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        </li>
      {/each}
    </ul>

    {#if nextCursor}
      <Button
        variant="outline"
        intent="compact"
        class="self-start"
        loading={loadingMore}
        disabled={loadingMore}
        onclick={loadMore}
      >
        Load more
      </Button>
    {/if}
  </section>
{/if}

<ResponsiveOverlay
  id="delete-question-dialog"
  open={pendingDeleteId !== null}
  hasTitle={true}
  onClose={() => (pendingDeleteId = null)}
>
  {#snippet title()}Delete question{/snippet}
  <p class="text-sm text-foreground-darker">This removes the question from your library. It cannot be undone.</p>
  {#snippet footer()}
    <Button variant="outline" intent="compact" onclick={() => (pendingDeleteId = null)}>Cancel</Button>
    <Button variant="danger" intent="compact" onclick={confirmDelete} loading={deleting} disabled={deleting}>Delete</Button>
  {/snippet}
</ResponsiveOverlay>

{#if historyId}
  <QuestionHistoryModal questionId={historyId} open={true} onClose={() => (historyId = null)} />
{/if}
