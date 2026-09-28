<script lang="ts">
  import { enhance } from "$app/forms";
  import { settleApiResult } from "$lib/api-form";
  import type { PageData } from "./$types";

  /** What the verify and resend endpoints hand back. */
  type ActionData = { error?: string } | { sent: boolean } | null;
  import Button from "@/lib/components/ui/Button.svelte";
  import Input from "@/lib/components/ui/Input.svelte";
  import Link from "@/lib/components/ui/Link.svelte";
  import { toast } from "@/lib/toast.js";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let verifying = $state(false);
  let resending = $state(false);

  $effect(() => {
    if (form && "error" in form && form.error) toast.error(form.error);
    if (form && "sent" in form && form.sent)
      toast.success("A new code is on its way.");
  });
</script>

<svelte:head>
  <title>Verify email — Orakl</title>
</svelte:head>

<div class="w-full max-w-lg mx-auto flex flex-col gap-8">
  <div class="flex flex-col gap-2">
    <h1 class="text-4xl font-bold tracking-tight text-balance">Verify email</h1>
    <p class="text-base text-foreground-darker">
      Enter the 6-digit code sent to {data.email}. It expires in 15 minutes.
    </p>
  </div>

  <form
    method="POST"
    action="/api/auth/verify-email"
    use:enhance={() => {
      verifying = true;
      return async ({ result, update }) => {
        try {
          await settleApiResult(result, update);
        } finally {
          verifying = false;
        }
      };
    }}
    class="flex flex-col gap-4"
  >
    <Input
      id="code"
      label="Verification code"
      name="code"
      inputmode="numeric"
      autocomplete="one-time-code"
      required="Required"
      maxlength={6}
    />
    <Button type="submit" variant="primary" disabled={verifying} loading={verifying}>Verify email</Button>
  </form>

  <form
    method="POST"
    action="/api/auth/verify-email/resend"
    use:enhance={() => {
      resending = true;
      return async ({ result, update }) => {
        try {
          await settleApiResult(result, update);
        } finally {
          resending = false;
        }
      };
    }}
  >
    <p class="text-sm text-foreground-darker font-sans flex items-center gap-1">
      Didn't receive it?
      <Button type="submit" variant="ghost" intent="compact" disabled={resending} loading={resending}>Resend code</Button>
    </p>
  </form>

  <p class="text-sm text-foreground-darker font-sans flex items-center gap-1">
    Back to
    <Link href="/profile" intent="inline">profile</Link>
  </p>
</div>
