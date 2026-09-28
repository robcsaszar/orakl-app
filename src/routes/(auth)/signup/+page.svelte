<script lang="ts">
  import { enhance } from "$app/forms";
  import { settleApiResult } from "$lib/api-form";
  import { page } from "$app/state";
  import type { PageData } from "./$types";

  /** What POST /api/auth/signup hands back on a refused sign-up. */
  type ActionData = { error?: string; email?: string; nickname?: string | null } | null;
  import Input from "$lib/components/ui/Input.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import RadioOption from "$lib/components/ui/RadioOption.svelte";
  import { MAX_NICKNAME_LENGTH } from "@/lib/constants/game.constants.js";
  import { toast } from "@/lib/toast.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let submitting = $state(false);

  $effect(() => {
    if (form?.error) toast.error(form.error);
  });
</script>

<svelte:head>
  <title>Create an account — Orakl</title>
</svelte:head>

<div class="w-full max-w-lg mx-auto flex flex-col gap-8">
  <div class="flex flex-col gap-2">
    <h1 class="text-4xl font-bold tracking-tight text-balance">Create an account</h1>
    <p class="text-base text-foreground-darker">Sign up to create and organize quizzes.</p>
  </div>
  <form
    method="POST"
    action="/api/auth/signup{page.url.search}"
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
      id="nickname"
      label="Nickname"
      name="nickname"
      type="text"
      autocomplete="nickname"
      maxlength={MAX_NICKNAME_LENGTH}
      value={form?.nickname ?? data.prefillNickname ?? ""}
    />
    <Input
      id="email"
      label="Email"
      name="email"
      type="email"
      required="Required"
      autocomplete="email"
      value={form?.email ?? ""}
    />
    <Input
      id="password"
      label="Password"
      name="password"
      type="password"
      required="Required"
      autocomplete="new-password"
      minlength={8}
      showStrength
    />
    <!-- Build-level flag: the constant (not `data`) is what lets the picker's
         markup leave the bundle when SIGNUP_ROLE_SELECTION is off. -->
    {#if __FEATURE_SIGNUP_ROLE_SELECTION__}
      <fieldset class="flex flex-col gap-2">
        <legend class="text-lg mb-2">Account type</legend>
        <div class="flex gap-3">
          <RadioOption class="flex-1">
            <input type="radio" name="role" value="member" checked class="sr-only" />
            <span>Member</span>
          </RadioOption>
          <RadioOption class="flex-1">
            <input type="radio" name="role" value="curator" class="sr-only" />
            <span>Curator</span>
          </RadioOption>
        </div>
      </fieldset>
    {/if}
    <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>Create account</Button>
    <!-- Age floor + acceptance by use (map #840, decision #10): one line, no
         checkbox, nothing stored. -->
    <p class="text-xs text-foreground-darker font-sans" data-testid="age-line">
      By creating an account you confirm you are 16 or older and accept the
      <Link href="/legal/terms" intent="inline" class="inline">terms</Link>
      and
      <Link href="/legal/privacy" intent="inline" class="inline">privacy policy</Link>.
    </p>
  </form>
  <p class="text-sm text-foreground-darker font-sans flex items-center gap-1">
    Got an account?
    <Link href="/login" intent="inline">Sign in</Link>
  </p>
</div>
