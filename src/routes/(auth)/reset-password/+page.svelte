<script lang="ts">
  import { enhance } from "$app/forms";
  import { settleApiResult } from "$lib/api-form";
  import type { PageData } from "./$types";

  /** What POST /api/auth/reset-password hands back on a refused reset. */
  type ActionData = { error?: string; token?: string } | null;
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import { toast } from "@/lib/toast.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let submitting = $state(false);

  $effect(() => {
    if (!data.valid) toast.error("This reset link is invalid or has expired. Request a new one from the forgot password page.");
    if (form?.error) toast.error(form.error);
  });
</script>

<svelte:head>
  <title>Reset password — Orakl</title>
</svelte:head>

<div class="w-full max-w-lg mx-auto flex flex-col gap-8">
  <div class="flex flex-col gap-2">
    <h1 class="text-4xl font-bold tracking-tight text-balance">Reset password</h1>
    <p class="text-base text-foreground-darker">Choose a new password for your account.</p>
  </div>

  {#if data.valid}
    <form
      method="POST"
      action="/api/auth/reset-password"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          try {
            await settleApiResult(result, update);
          } finally {
            submitting = false;
          }
        };
      }}
      class="flex flex-col gap-4"
    >
      <input type="hidden" name="token" value={form?.token ?? data.token} />
      <Input
        id="password"
        label="New password"
        name="password"
        type="password"
        required="Required"
        autocomplete="new-password"
        minlength={8}
        showStrength
      />
      <Input
        id="confirm"
        label="Confirm password"
        name="confirm"
        type="password"
        required="Required"
        autocomplete="new-password"
      />
      <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>Set new password</Button>
    </form>
  {:else}
    <p class="text-base text-foreground-darker">This reset link is invalid or has expired. <Link href="/forgot-password" intent="inline">Request a new one.</Link></p>
  {/if}

  <p class="text-sm text-foreground-darker font-sans flex items-center gap-1">
    Back to
    <Link href="/login" intent="inline">sign in</Link>
  </p>
</div>
