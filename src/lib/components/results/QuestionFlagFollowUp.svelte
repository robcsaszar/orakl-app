<script lang="ts">
  /**
   * Flag affordance shown under a `ResultCard` for any question in a
   * results or history breakdown — once the game is over, a player can
   * report a problem with a question they have had time to think about.
   * Collapsed to a single button by default; expands to three terminal
   * actions:
   *   - submit without elaboration (fire-and-forget, low prio)
   *   - elaborate + submit (reason/url via a ResponsiveOverlay dialog)
   *   - cancel (collapses back, no request)
   *
   * The API resolves the answer by *text*, never by id (answer ids are
   * shuffle-order-dependent per game serve — see `question-flags.ts`'s
   * `buildQuestionSnapshot` doc comment) — this component only ever sends
   * `selectedAnswerText`.
   */
  import Button from "@/lib/components/ui/Button.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import Input from "@/lib/components/ui/Input.svelte";
  import Card from "@/lib/components/ui/Card.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import { toast } from "@/lib/toast.js";
  import { scale } from "svelte/transition";

  let {
    questionId,
    selectedAnswerText = null,
    alreadyFlagged = false,
  }: {
    questionId: string;
    selectedAnswerText?: string | null;
    alreadyFlagged?: boolean;
  } = $props();

  let expanded = $state(false);
  // Set once a submission this component made succeeds — combined with the
  // `alreadyFlagged` prop (state as of the last page load) so either source
  // hides the control.
  let justFlagged = $state(false);
  /** The question was deleted before the report reached it — no flag exists. */
  let gone = $state(false);
  const flagged = $derived(alreadyFlagged || justFlagged);
  let dialogOpen = $state(false);
  let reason = $state("");
  let url = $state("");
  let submitting = $state(false);

  async function submitFlag(body: {
    reason?: string;
    url?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch(`/api/questions/${questionId}/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          ...(selectedAnswerText ? { selectedAnswerText } : {}),
          ...body,
        }),
      });
      if (res.status === 409) {
        // Precheck at render time could be stale (e.g. flagged the same
        // question in another tab) — treat as already done, not an error.
        toast.info("You already flagged this question.");
        return true;
      }
      if (res.status === 404) {
        // The question left the archive after this run — nothing to retry.
        toast.info("This question has left the archive.");
        gone = true;
        return true;
      }
      if (!res.ok) {
        toast.error("Could not save your report. Try again.");
        return false;
      }
      toast.success("Report saved. A human will review it.");
      return true;
    } catch {
      toast.error("Could not save your report. Try again.");
      return false;
    }
  }

  async function submitWithoutElaboration() {
    if (submitting) return;
    submitting = true;
    const ok = await submitFlag({});
    submitting = false;
    if (ok) justFlagged = true;
  }

  function openElaborate() {
    reason = "";
    url = "";
    dialogOpen = true;
  }

  function closeElaborate() {
    dialogOpen = false;
  }

  async function submitElaborated() {
    if (submitting) return;
    submitting = true;
    const trimmedReason = reason.trim();
    const trimmedUrl = url.trim();
    const ok = await submitFlag({
      ...(trimmedReason ? { reason: trimmedReason } : {}),
      ...(trimmedUrl ? { url: trimmedUrl } : {}),
    });
    submitting = false;
    if (ok) {
      dialogOpen = false;
      justFlagged = true;
    }
  }

  function cancel() {
    expanded = false;
  }
</script>

{#if gone}
  <p class="text-sm text-foreground-darker">Question removed.</p>
{:else if flagged}
  <p class="flex items-center gap-2 text-sm text-foreground-darker">
    <Icon name="flag" class="size-4 shrink-0" />
    Flagged.
  </p>
{:else if !expanded}
  <Button
    type="button"
    variant="ghost"
    class="min-h-11 self-start"
    onclick={() => (expanded = true)}
  >
    <Icon name="flag" class="size-4" />
    Flag this question
  </Button>
{:else}
  <div in:scale={{ start: 0.95, duration: 150 }}>
    <Card variant="default" padding="sm" class="flex flex-col gap-3">
      <p class="flex items-start gap-2 text-sm text-foreground">
        <Icon name="flag" class="mt-0.5 size-4 shrink-0" />
        <span>
          Report a problem with this question.
          <span class="text-foreground-darker"
            ><Icon name="info" class="inline size-3.5" /> A human will review your report.</span
          >
        </span>
      </p>

      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onclick={submitWithoutElaboration}
        >
          Submit without elaboration
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={submitting}
          onclick={openElaborate}
        >
          Elaborate and submit
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={submitting}
          onclick={cancel}
        >
          Cancel
        </Button>
      </div>
    </Card>
  </div>
{/if}

<ResponsiveOverlay
  id="question-flag-elaborate-{questionId}"
  open={dialogOpen}
  ariaLabel="Elaborate on your report"
  bodyClass="flex flex-col gap-3"
  footerClass="flex justify-end gap-2"
  onClose={closeElaborate}
>
  <Input
    id="question-flag-reason-{questionId}"
    name="reason"
    label="What's wrong with this question?"
    type="textarea"
    rows={3}
    maxlength={1000}
    bind:value={reason}
    placeholder="Describe the issue"
  />
  <Input
    id="question-flag-url-{questionId}"
    name="url"
    label="Supporting link (optional)"
    type="text"
    maxlength={500}
    bind:value={url}
    placeholder="https://…"
  />

  {#snippet footer()}
    <Button type="button" variant="ghost" class="min-h-11" onclick={closeElaborate}>
      Cancel
    </Button>
    <Button
      type="button"
      variant="primary"
      class="min-h-11"
      disabled={submitting}
      onclick={submitElaborated}
    >
      {submitting ? "Submitting…" : "Submit"}
    </Button>
  {/snippet}
</ResponsiveOverlay>
