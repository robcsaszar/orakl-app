<script lang="ts">
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import { toast } from "@/lib/toast.js";
  import type { AuthoredQuestionRow } from "@orakl/protocol";

  let {
    row,
    open,
    onClose,
    onWithdrawn,
  }: {
    row: AuthoredQuestionRow;
    open: boolean;
    onClose: () => void;
    onWithdrawn: (result: {
      unpublished_at: string;
      unpublished_by: string;
      unpublish_reason: string;
    }) => void;
  } = $props();

  let reason = $state("");
  let submitting = $state(false);

  function close() {
    reason = "";
    onClose();
  }

  async function confirm() {
    const trimmed = reason.trim();
    if (!trimmed || submitting) return;
    submitting = true;
    try {
      const res = await fetch(`/api/manage/questions/${row.id}/unpublish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed }),
      });
      const data = (await res.json()) as {
        unpublished_at?: string;
        unpublished_by?: string;
        unpublish_reason?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to withdraw question");
        return;
      }
      onWithdrawn({
        unpublished_at: data.unpublished_at ?? "",
        unpublished_by: data.unpublished_by ?? "",
        unpublish_reason: data.unpublish_reason ?? trimmed,
      });
      toast.success("Question withdrawn from the shared bank.");
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to withdraw question");
    } finally {
      submitting = false;
    }
  }
</script>

<ResponsiveOverlay
  id="withdraw-question-dialog"
  {open}
  hasTitle={true}
  panelClass="lg:max-w-[32rem]"
  bodyClass="flex flex-col gap-4"
  onClose={close}
>
  {#snippet title()}
    Withdraw from the shared bank?
  {/snippet}

  <p class="text-sm text-foreground-darker" title={row.label}>
    "{row.label}" returns to {row.author_nickname ?? row.author_email ?? "its author"}'s
    private library. It stays out of other curators' games until promoted again.
  </p>

  <Input
    id="withdraw-reason"
    label="Reason"
    name="reason"
    type="textarea"
    rows={3}
    maxlength={500}
    required="Reason required"
    bind:value={reason}
    placeholder="Why is this question leaving the shared bank?"
  />

  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="outline" intent="compact" onclick={close}>Cancel</Button>
      <Button
        variant="danger"
        intent="compact"
        disabled={!reason.trim() || submitting}
        onclick={confirm}
      >
        {submitting ? "Withdrawing…" : "Withdraw"}
      </Button>
    </div>
  {/snippet}
</ResponsiveOverlay>
