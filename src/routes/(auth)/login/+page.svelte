<script lang="ts">
  import { enhance } from "$app/forms";
  import { settleApiResult } from "$lib/api-form";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import type { PageData } from "./$types";

  /** What POST /api/auth/login hands back on a refused sign-in. */
  type ActionData = { error?: string; email?: string } | null;
  import Input from "$lib/components/ui/Input.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import { toast } from "@/lib/toast.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  // Writable derived: input binding writes locally; re-seeds from the action
  // result when a failed submit returns the typed email.
  let email = $derived(form?.email ?? "");
  let submitting = $state(false);

  $effect(() => {
    if (data.resetSuccess) toast.success("Password updated. Sign in with your new password.");
  });

  $effect(() => {
    if (form?.error) toast.error(form.error);
  });
</script>

<svelte:head>
  <title>Sign in — Orakl</title>
</svelte:head>

<div class="w-full max-w-lg mx-auto flex flex-col gap-8">
  <div class="flex flex-col gap-2">
    <h1 class="text-4xl font-bold tracking-tight text-balance">Sign in</h1>
    <p class="text-base text-foreground-darker">Sign in to access solo play features.</p>
  </div>
  <form
    method="POST"
    action="/api/auth/login{page.url.search}"
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
      bind:value={email}
    />
    <Input
      id="password"
      label="Password"
      name="password"
      type="password"
      required="Required"
      autocomplete="current-password"
    >
      {#snippet labelEnd()}
        <Link href="/forgot-password{email ? `?email=${encodeURIComponent(email)}` : ''}" intent="inline" class="text-sm">
          Forgot password?
        </Link>
      {/snippet}
    </Input>
    <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>Sign in</Button>
  </form>
  <p class="text-sm text-foreground-darker font-sans flex items-center gap-1">
    No account?
    <Link href="/signup" intent="inline">Sign up</Link>
  </p>
</div>
