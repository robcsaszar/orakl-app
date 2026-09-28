<script lang="ts">
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
</script>

<svelte:head><title>Lobby closed — Orakl</title></svelte:head>

<Card class="flex flex-col gap-4 items-center text-center">
  <h1 class="text-2xl font-bold">The curator closed the lobby</h1>
  <p class="text-foreground-darker">Nothing from this session was saved.</p>
  <Button href="/join" variant="primary" intent="cta">Join a quiz</Button>
</Card>
