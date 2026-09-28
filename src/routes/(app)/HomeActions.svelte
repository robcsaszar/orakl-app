<script lang="ts">
  import { onMount } from "svelte";
  import { buttonVariants } from "@/lib/button-variants";
  import { confirmDismiss } from "@/lib/home-actions";
  import { storage } from "@/lib/storage";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from '@/lib/components/ui/Icon.svelte';
  import Button from '@/lib/components/ui/Button.svelte';
  import Badge from '@/lib/components/ui/Badge.svelte';

  interface Props {
    /** Null for a visitor who cannot host; `badge` is the allowance text for
     *  a member (null for an entitled account); `open` false lands the
     *  button on the profile's Host quizzes card. */
    host: { badge: string | null; open: boolean } | null;
  }

  let { host }: Props = $props();

  let hasQuiz = $state(false);

  onMount(() => {
    hasQuiz = !!storage.getQuizConfig();
  });

  const secondaryCta = buttonVariants({
    variant: "secondary",
    intent: "cta",
    class: "flex-1",
  });
</script>

{#if host}
  <div class="flex gap-4 items-center pointer-events-auto">
    <Button
      href={host.open ? "/curator/create" : "/profile#host"}
      variant="secondary"
      intent="cta"
      class="flex-1 relative"
      disabled={!hasQuiz}
    >
      {hasQuiz && host.open ? "Edit quiz" : "Host quiz"}
      {#if host.badge}
        <Badge variant="primary" class="absolute -top-2.5 right-2">{host.badge}</Badge>
      {/if}
    </Button>

    {#if hasQuiz}
      <ConfirmButton
        label=""
        confirmLabel=""
        confirmAriaLabel="Click again to confirm dismissal"
        progressStyle="border"
        revealDelay={400}
        onConfirm={() => confirmDismiss(() => { hasQuiz = false; })}
        class={buttonVariants({ variant: "danger", intent: "icon" })}
      >
        {#snippet icon()}
          <Icon name="x" class="shrink-0 size-7" />
        {/snippet}
        {#snippet confirmIcon()}
          <Icon name="check" class="shrink-0 size-7" />
        {/snippet}
      </ConfirmButton>
    {/if}
  </div>
{/if}
