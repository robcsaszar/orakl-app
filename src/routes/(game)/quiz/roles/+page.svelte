<script lang="ts">
  import { getQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import Button from "$lib/components/ui/Button.svelte";
  import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
  import RingTimer from "$lib/components/ui/RingTimer.svelte";
  import { GAME } from "data/game.settings";
  import Card from "@/lib/components/ui/Card.svelte";
  import { toast } from "@/lib/toast.js";

  const session = getQuizSession();
  const roleOptions = ["player", "observer"] as const;

  let roleToastId: string | number | undefined;

  $effect(() => {
    if (session.error) {
      // The layout toasts the error; a "waiting" toast must not stay beside it.
      if (roleToastId !== undefined) {
        toast.dismiss(roleToastId);
        roleToastId = undefined;
      }
    } else if (session.roleSubmitted && !session.roleSelectionLocked) {
      roleToastId = toast.loading("Role submitted. Waiting for others...", { duration: Infinity });
    } else if (session.roleSelectionLocked) {
      if (roleToastId !== undefined) toast.dismiss(roleToastId);
      roleToastId = toast.loading("Roles locked. Waiting for curator...", { duration: Infinity });
    } else {
      if (roleToastId !== undefined) {
        toast.dismiss(roleToastId);
        roleToastId = undefined;
      }
    }
    return () => {
      if (roleToastId !== undefined) toast.dismiss(roleToastId);
    };
  });
</script>

<svelte:head><title>Choose your role — Orakl</title></svelte:head>

<div class="flex items-start pt-2 justify-between gap-8 flex-col md:flex-row">
  <div class="flex flex-col gap-1 order-2">
    <h2 class="text-xl font-bold text-foreground-darker">Continuing</h2>
    <h1 class="text-4xl font-bold">{session.quizName}</h1>
    {#if session.description}
      <p class="text-foreground-darker">
        {session.description}
      </p>
    {/if}
  </div>
  <RingTimer
    class="self-center md:order-2 order-1"
    size="lg"
    timeRemaining={session.roleSelectionTimeRemaining}
    timerState={"counting"}
    timerFraction={session.roleSelectionTimeRemaining /
      GAME.roleSelection.durationSeconds}
  />
</div>

<Card variant="mezzanine" class="flex flex-col gap-8 items-stretch">
  <div class="flex flex-col flex-1 gap-8">
    <RadioGroup
      options={roleOptions}
      bind:selected={session.selectedRole}
      name="role-selection"
      legend="Your role"
      description="Choose how you return for the next quiz."
      class="self-stretch flex-1"
    >
      {#snippet optionLabel(role)}
        <span class="flex flex-col items-center gap-1">
          <span class="text-2xl">
            {role === "player" ? "Player" : "Observer"}
          </span>
          <span class="text-xs text-current/75">
            {role === "player" ? "Play & answer" : "Watch & scheme"}
          </span>
        </span>
      {/snippet}
    </RadioGroup>
  </div>

</Card>
{#if !session.roleSubmitted && !session.roleSelectionLocked}
  <Button
    type="button"
    variant="primary"
    intent="cta"
    onclick={() => session.submitRoleChoice()}
    class="self-end"
  >
    Confirm
  </Button>
{/if}
