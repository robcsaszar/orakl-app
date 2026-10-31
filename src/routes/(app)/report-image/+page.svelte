<script lang="ts">
  import { page } from "$app/state";
  import { tick } from "svelte";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Checkbox from "$lib/components/ui/Checkbox.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Link from "$lib/components/ui/Link.svelte";

  let name = $state("");
  let email = $state("");
  let questionRef = $state(page.url.searchParams.get("question") ?? "");
  let reason = $state("");
  let rightOrLaw = $state("");
  let goodFaith = $state(false);
  let dmca = $state(false);
  let workIdentified = $state("");
  let signature = $state("");
  let perjury = $state(false);

  let submitting = $state(false);
  let error = $state<string | null>(null);
  let reference = $state<string | null>(null);
  let fieldErrors = $state<Record<string, string>>({});
  let bannerEl = $state<HTMLElement | null>(null);
  let successEl = $state<HTMLElement | null>(null);

  const FIELD_IDS: Record<string, string> = {
    name: "notice-name",
    email: "notice-email",
    question_ref: "notice-question",
    reason: "notice-reason",
    right_or_law: "notice-right",
    work_identified: "notice-work",
    signature: "notice-signature",
    perjury: "notice-perjury",
    good_faith: "notice-good-faith",
  };

  async function focusFirstError() {
    await tick();
    const first = Object.keys(fieldErrors)[0];
    if (first) document.getElementById(FIELD_IDS[first])?.focus();
    else bannerEl?.focus();
  }

  $effect(() => {
    if (reference) successEl?.focus();
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    fieldErrors = {};
    if (dmca && !perjury) fieldErrors.perjury = "Confirm this statement to send a copyright claim.";
    if (!goodFaith) fieldErrors.good_faith = "Confirm this statement to send the notice.";
    if (Object.keys(fieldErrors).length) {
      await focusFirstError();
      return;
    }
    submitting = true;
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          question_ref: questionRef,
          reason,
          right_or_law: rightOrLaw,
          good_faith: goodFaith,
          ...(dmca
            ? {
                kind: "dmca",
                work_identified: workIdentified,
                signature,
                perjury,
              }
            : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
        reason?: string;
      };
      if (res.ok && body.id) reference = body.id;
      else {
        // Validation reasons read "<field>: <message>".
        const match = /^([a-z_]+): (.+)$/.exec(body.reason ?? "");
        if (match && match[1] in FIELD_IDS) fieldErrors = { [match[1]]: match[2] };
        else error = body.reason ?? body.error ?? "Could not send the notice. Try again.";
        await focusFirstError();
      }
    } catch {
      error = "Could not send the notice. Try again.";
      await focusFirstError();
    } finally {
      submitting = false;
    }
  }
</script>

<Metatags
  title="Report an image"
  description="Tell us about an image in a quiz that you think should not be there."
/>

<div class="w-full max-w-lg mx-auto flex flex-col gap-8">
  <div class="flex flex-col gap-2">
    <h1 class="text-4xl font-bold tracking-tight text-balance">Report an image</h1>
    <p class="text-base text-foreground-darker">
      Tell us which image and why. We review each notice within 72 hours and email you the outcome.
    </p>
  </div>

  {#if reference}
    <Card variant="success" padding="md">
      <div role="status" class="flex flex-col gap-2">
        <p bind:this={successEl} tabindex="-1" class="font-bold outline-none">Notice received</p>
        <p>Reference: <span class="font-mono select-all">{reference}</span></p>
        <p class="text-foreground-darker">An email with this reference is on its way.</p>
      </div>
    </Card>
  {:else}
    <form onsubmit={submit} class="flex flex-col gap-4">
      <Input id="notice-name" label="Your name" name="name" error={fieldErrors.name} required="Required" autocomplete="name" bind:value={name} />
      <Input id="notice-email" label="Your email" name="email" error={fieldErrors.email} type="email" required="Required" autocomplete="email" bind:value={email} />
      <Input
        id="notice-question"
        label="Question link or id"
        name="question_ref" error={fieldErrors.question_ref}
        required="Required"
        description="The report link on the image fills this in."
        bind:value={questionRef}
      />
      <Input id="notice-reason" label="Reason" name="reason" error={fieldErrors.reason} type="textarea" required="Required" bind:value={reason} />
      <Input
        id="notice-right"
        label="Right or law concerned"
        name="right_or_law" error={fieldErrors.right_or_law}
        required="Required"
        description="For example copyright, privacy or personality rights."
        bind:value={rightOrLaw}
      />
      <Checkbox
        id="notice-dmca"
        name="dmca"
        label="This is a copyright claim (DMCA)"
        aria-controls="notice-dmca-fields"
        aria-expanded={dmca}
        bind:checked={dmca}
      />
      <div id="notice-dmca-fields" class="flex flex-col gap-4" hidden={!dmca}>
      {#if dmca}
        <Input
          id="notice-work"
          label="Work identified"
          name="work_identified" error={fieldErrors.work_identified}
          type="textarea"
          required="Required"
          description="Describe the copyrighted work, with a link if you can."
          bind:value={workIdentified}
        />
        <Input
          id="notice-signature"
          label="Electronic signature"
          name="signature" error={fieldErrors.signature}
          required="Required"
          description="Type your full name."
          bind:value={signature}
        />
        <Checkbox
          id="notice-perjury"
          name="perjury"
          error={fieldErrors.perjury}
          label="I state under penalty of perjury that this notice is accurate and that I am the owner of the work or authorised to act for the owner."
          bind:checked={perjury}
        />
      {/if}
      </div>
      <Checkbox
        id="notice-good-faith"
        name="good_faith"
        error={fieldErrors.good_faith}
        label="I believe in good faith that the information in this notice is accurate and complete."
        bind:checked={goodFaith}
      />
      {#if error}
        <Card variant="danger" padding="md"><p role="alert" bind:this={bannerEl} tabindex="-1" class="outline-none">{error}</p></Card>
      {/if}
      <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>
        Send notice
      </Button>
    </form>
  {/if}

  <p class="text-sm text-foreground-darker font-sans">
    We keep your details to handle the notice. See the <Link href="/legal/privacy" intent="inline">privacy policy</Link>.
  </p>
</div>
