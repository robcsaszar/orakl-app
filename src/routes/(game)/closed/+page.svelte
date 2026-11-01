<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";

  // `moderated`: an Admin closed it. Any other reason (a reconnect that found
  // the Lobby gone) names nobody. No reason: the Curator closed it.
  const reason = $derived(page.url.searchParams.get("reason"));
</script>

<svelte:head><title>Lobby closed — Orakl</title></svelte:head>

<Card class="flex flex-col gap-4 items-center text-center">
  {#if reason === "moderated"}
    <h1 class="text-2xl font-bold">Orakl closed this lobby</h1>
    <p class="text-foreground-darker">
      A moderator ended it. Nothing from this lobby was saved.
    </p>
  {:else if reason}
    <h1 class="text-2xl font-bold">This lobby has closed</h1>
  {:else}
    <h1 class="text-2xl font-bold">The curator closed the lobby</h1>
    <p class="text-foreground-darker">Nothing from this session was saved.</p>
  {/if}
  <Button href="/join" variant="primary" intent="cta">Join a quiz</Button>
</Card>
