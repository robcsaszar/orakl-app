<script lang="ts">
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import SegmentedPicker from "$lib/components/ui/SegmentedPicker.svelte";
  import { tick } from "svelte";
  import { formatDateTimeEnGb } from "@/lib/format.js";
  import { toast } from "@/lib/toast.js";
  import type { Notice } from "./types";

  const TARGET_HOURS = 72;
  const MAX_STATEMENT = 2000;

  const STATUS_OPTIONS = [
    { id: "open", label: "Open" },
    { id: "decided", label: "Decided" },
    { id: "all", label: "All" },
  ] as const;
  type StatusFilter = (typeof STATUS_OPTIONS)[number]["id"];

  let { initial }: { initial: Notice[] } = $props();

  // Writable derived: loads reassign locally; resets to server truth on refresh.
  let notices = $derived<Notice[]>(initial);
  let statusFilter = $state<StatusFilter>("open");
  let loading = $state(false);
  let openId = $state<string | null>(null);
  let statement = $state("");
  let busy = $state(false);
  let touched = $state(false);

  const selected = $derived(notices.find((n) => n.id === openId) ?? null);
  const statementReady = $derived(
    statement.trim().length > 0 && statement.length <= MAX_STATEMENT,
  );

  async function load(next: StatusFilter) {
    loading = true;
    try {
      const res = await fetch(`/api/manage/notices?status=${next}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      notices = ((await res.json()) as { notices: Notice[] }).notices;
      statusFilter = next;
      if (!notices.some((n) => n.id === openId)) openId = null;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load notices");
    } finally {
      loading = false;
    }
  }

  function toggle(id: string) {
    openId = openId === id ? null : id;
    statement = "";
    touched = false;
  }

  async function decide(n: Notice, action: "disable" | "restore" | "reject") {
    if (busy) return;
    if (!statementReady) {
      touched = true;
      await tick();
      document.getElementById(`statement-${n.id}`)?.focus();
      return;
    }
    busy = true;
    try {
      const res = await fetch(`/api/manage/notices/${n.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      toast.success(
        action === "disable"
          ? "Image disabled"
          : action === "restore"
            ? "Image restored"
            : "Notice rejected",
      );
      statement = "";
      await load(statusFilter);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record the decision");
    } finally {
      busy = false;
    }
  }

  // Notice timestamps are SQLite UTC text; log entries are ISO strings.
  const when = (ts: string) =>
    formatDateTimeEnGb(ts.includes("T") ? ts : `${ts.replace(" ", "T")}Z`);
  const TONE = {
    open: "warning",
    disabled: "danger",
    restored: "success",
    rejected: "neutral",
  } as const;
</script>

{#snippet actionIcon()}
  <Icon name="check" class="size-4" />
{/snippet}

<div class="flex flex-col gap-4">
  <h1 class="text-lg font-semibold">Image notices</h1>
  <div class="flex flex-wrap items-center gap-2">
    <SegmentedPicker
      variant="pill"
      label="Notice status"
      options={STATUS_OPTIONS}
      optionKey={(o) => o.id}
      selectedKey={statusFilter}
      onSelect={(o) => !loading && o.id !== statusFilter && load(o.id)}
    >
      {#snippet option(o)}{o.label}{/snippet}
    </SegmentedPicker>
    <span class="ml-2 text-xs text-foreground-darker">
      {#if loading}Loading…{:else}{notices.length} {notices.length === 1 ? "notice" : "notices"}, oldest first{/if}
    </span>
  </div>

  {#if notices.length === 0}
    <p class="text-sm text-foreground-darker">No notices match this filter.</p>
  {/if}

  {#each notices as n (n.id)}
    <Card class="gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="status" tone={TONE[n.status]} class="capitalize">{n.status}</Badge>
        {#if n.overdue}<Badge variant="status" tone="danger">Overdue</Badge>{/if}
        <Badge variant="status" tone="info" class="uppercase">{n.kind}</Badge>
        <span class="font-mono text-xs tabular-nums text-foreground-darker">
          {n.ageHours} of {TARGET_HOURS} h
        </span>
        <span class="ml-auto text-xs text-foreground-darker">{n.notifierName}</span>
      </div>
      <div class="flex items-start gap-3">
        {#if n.previewUrl}
          <img
            src={n.previewUrl}
            alt="Reported upload"
            class="size-20 shrink-0 rounded-lg object-cover"
          />
        {:else if n.imageDisabled}
          <div
            class="flex size-20 shrink-0 items-center justify-center rounded-lg bg-foreground-darker/10 p-1 text-center text-xs text-foreground-darker"
          >Image disabled</div>
        {/if}
        <div class="flex min-w-0 flex-col gap-1 text-sm">
          <p class="line-clamp-2">{n.reason}</p>
          <p class="text-xs text-foreground-darker">
            {n.excerpt ?? `Question not found: ${n.questionRef}`}
          </p>
        </div>
      </div>
      <div>
        <Button
          variant="outline"
          intent="compact"
          aria-expanded={openId === n.id}
          onclick={() => toggle(n.id)}
        >{openId === n.id ? "Hide details" : "Details"}</Button>
      </div>

      {#if selected?.id === n.id}
        <dl class="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
          <dt class="text-foreground-darker">Received</dt><dd>{when(n.createdAt)}</dd>
          {#if n.decidedAt}
            <dt class="text-foreground-darker">Decided</dt><dd>{when(n.decidedAt)}</dd>
          {/if}
          <dt class="text-foreground-darker">Notifier</dt><dd>{n.notifierName}, {n.notifierEmail}</dd>
          <dt class="text-foreground-darker">Reason</dt><dd class="whitespace-pre-wrap">{n.reason}</dd>
          <dt class="text-foreground-darker">Right or law</dt><dd>{n.rightOrLaw}</dd>
          <dt class="text-foreground-darker">Question</dt><dd class="font-mono text-xs">{n.questionId ?? n.questionRef}</dd>
          {#if n.workIdentified}
            <dt class="text-foreground-darker">Work identified</dt><dd class="whitespace-pre-wrap">{n.workIdentified}</dd>
          {/if}
          {#if n.signature}
            <dt class="text-foreground-darker">Signature</dt><dd>{n.signature}</dd>
          {/if}
        </dl>

        <div>
          <h2 class="mb-1 text-sm font-semibold">Action log</h2>
          {#if n.actions.length === 0}
            <p class="text-xs text-foreground-darker">No actions yet.</p>
          {:else}
            <ul class="flex flex-col gap-1 text-xs text-foreground-darker">
              {#each n.actions as a (a.at)}
                <li>{when(a.at)}, {a.action}: {a.statement}</li>
              {/each}
            </ul>
          {/if}
        </div>

        {#if n.status === "open" || n.status === "disabled"}
          <div class="contents" oninput={() => (touched = true)} role="presentation">
          <Input
            type="textarea"
            id={`statement-${n.id}`}
            name="statement"
            label="Statement of reasons"
            description={`Sent to the notifier and, for a disable or restore, to the uploader. Up to ${MAX_STATEMENT} characters.`}
            required="Write a statement of reasons"
            error={touched && statement.trim().length === 0 ? "A statement of reasons is required" : undefined}
            maxlength={MAX_STATEMENT}
            bind:value={statement}
          />
          </div>
          {#if !statementReady}
            <p class="text-xs text-foreground-darker">Write a statement to enable the actions.</p>
          {/if}
          <div class="flex flex-wrap gap-2">
            {#if !statementReady}
              {#if n.status === "open"}
                {#if n.hasImage}
                  <Button variant="danger" disabled>Disable image</Button>
                {/if}
                <Button variant="outline" disabled>Reject</Button>
              {:else}
                <Button variant="outline" disabled>Restore image</Button>
              {/if}
            {:else if n.status === "open"}
              {#if n.hasImage}
                <ConfirmButton
                  label="Disable image"
                  confirmLabel="Disable this image?"
                  variant="danger"
                  icon={actionIcon}
                  onConfirm={() => decide(n, "disable")}
                />
              {/if}
              <ConfirmButton
                label="Reject"
                confirmLabel="Reject this notice?"
                variant="outline"
                confirmVariant="neutral"
                icon={actionIcon}
                onConfirm={() => decide(n, "reject")}
              />
            {:else}
              <ConfirmButton
                label="Restore image"
                confirmLabel="Restore this image?"
                variant="outline"
                confirmVariant="success"
                icon={actionIcon}
                onConfirm={() => decide(n, "restore")}
              />
            {/if}
          </div>
        {/if}
      {/if}
    </Card>
  {/each}
</div>
