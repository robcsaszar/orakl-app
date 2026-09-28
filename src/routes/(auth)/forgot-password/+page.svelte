<script lang="ts">
  import { enhance } from "$app/forms";
  import { settleApiResult } from "$lib/api-form";
  import type { PageData } from "./$types";

  /** What POST /api/auth/forgot-password hands back. */
  type ActionData = { error?: string; email?: string; sent?: boolean } | null;
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import { toast } from "@/lib/toast.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let submitting = $state(false);

  $effect(() => {
    if (form?.sent) toast.success("If that email is registered, a reset link is on its way. Check your inbox.");
    if (form?.error) toast.error(form.error);
  });
</script>

<svelte:head>
  <title>Forgot password — Orakl</title>
</svelte:head>

<div class="w-full max-w-lg mx-auto flex flex-col gap-8">
  <div class="flex flex-col gap-2">
    <h1 class="text-4xl font-bold tracking-tight text-balance">Forgot password</h1>
    <p class="text-base text-foreground-darker">Enter your email and we'll send a reset link if an account exists.</p>
  </div>

  {#if !(form?.sent || data.sent)}
    <form
      method="POST"
      action="/api/auth/forgot-password"
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
      <Input
        id="email"
        label="Email"
        name="email"
        type="email"
        required="Required"
        autocomplete="email"
        value={form?.email ?? data.prefillEmail}
      />
      <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>Send reset link</Button>
    </form>
  {:else}
    <p class="text-base text-foreground-darker">If that email is registered, a reset link is on its way. Check your inbox.</p>
  {/if}

  <p class="text-sm text-foreground-darker font-sans flex items-center gap-1">
    Remembered it?
    <Link href="/login" intent="inline">Sign in</Link>
  </p>
</div>
