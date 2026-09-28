<script lang="ts">
  import { storage } from "@/lib/storage.js";
  import { getQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import { goto } from "$app/navigation";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import IdentityCard from "../IdentityCard.svelte";
  import QuizAvatarDialog from "../QuizAvatarDialog.svelte";
  import { toast } from "@/lib/toast.js";

  const session = getQuizSession();

  $effect(() => {
    if (session.error) toast.error(session.error);
  });

  async function next() {
    const found = await session.validateCode();
    if (found) {
      const code = session.lobbyCode.trim().toLowerCase();
      storage.setLobbyCode(code);
      goto(`/quiz/setup?code=${encodeURIComponent(code)}`);
    }
  }
</script>

<svelte:head><title>Join a quiz — Orakl</title></svelte:head>

<!-- Header info -->
<div class="flex flex-col gap-1 pt-2">
  <h1 class="text-4xl font-bold">Join a quiz</h1>
  <p class="text-foreground-darker">
    Enter the lobby code to continue. No code? Ask the curator for one.
  </p>
</div>

{#if session.hasStoredData}
  <IdentityCard />
{/if}

<QuizAvatarDialog />

<Card class="flex flex-col gap-4">
  <div class="compact-input">
    <Input
      id="lobby-code-entry"
      label="Lobby code"
      name="lobby-code-entry"
      bind:value={session.lobbyCode}
      error={session.error || undefined}
      onkeydown={(e) => {
        if (e.key === "Enter") next();
      }}
      maxlength={20}
      placeholder="e.g. iron-vault"
      autofocus
      autocomplete="off"
      autocapitalize="none"
      required="true"
      class="font-sans font-bold text-lg lowercase"
    />
  </div>

</Card>
<Button type="button" variant="primary" intent="cta" onclick={next} disabled={!session.lobbyCode.trim() || session.isJoining} class="self-end">
  {#if session.isJoining}
    <span class="is-loading">Checking<span>.</span><span>.</span><span>.</span></span>
  {:else}
    Next
  {/if}
</Button>
