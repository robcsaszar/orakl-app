<script lang="ts">
  import { onMount } from "svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import RevisionList from "$lib/components/questions/RevisionList.svelte";
  import type { QuestionRevision } from "@orakl/protocol";
  import type { Question } from "@orakl/protocol";

  let {
    questionId,
    open,
    onClose,
  }: {
    questionId: string;
    open: boolean;
    onClose: () => void;
  } = $props();

  let history = $state<{ current: Question; revisions: QuestionRevision[] } | null>(null);
  let loading = $state(true);
  let loadError = $state("");

  async function load() {
    loading = true;
    loadError = "";
    try {
      const res = await fetch(`/api/custom-questions/${questionId}/revisions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      history = (await res.json()) as { current: Question; revisions: QuestionRevision[] };
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load history";
    } finally {
      loading = false;
    }
  }

  onMount(load);
</script>

<ResponsiveOverlay
  id="question-history-modal"
  {open}
  hasTitle={true}
  panelClass="lg:max-w-[42rem]"
  bodyClass="flex flex-col gap-3"
  onClose={onClose}
>
  {#snippet title()}Question history{/snippet}

  {#if loading}
    <p class="text-sm text-foreground-darker">Loading…</p>
  {:else if loadError}
    <p class="text-sm text-danger" role="alert">{loadError}</p>
  {:else if history}
    <RevisionList revisions={history.revisions} current={history.current} />
  {/if}

  {#snippet footer()}
    <Button variant="outline" intent="compact" onclick={onClose}>Close</Button>
  {/snippet}
</ResponsiveOverlay>
