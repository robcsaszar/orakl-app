<script lang="ts">
import { avatarPool, avatars as staticAvatars, rallyCandidates, randomAvatar, shouldAutoRally } from "@orakl/shared";
  import { page } from "$app/state";
  import { getQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import {
    headerActionState,
    registerHeaderActions,
  } from "@/lib/header-action-state.svelte.js";
  import { MAX_NICKNAME_LENGTH } from "@/lib/constants/game.constants.js";

  import { NICKNAMES, randomNickname } from "@/lib/nicknames.js";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import FieldDescription from "$lib/components/ui/partials/FieldDescription.svelte";
  import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
  import { toast } from "@/lib/toast.js";
  import AvatarPlaque from "./AvatarPlaque.svelte";

  const session = getQuizSession();
  const roleOptions = ["player", "observer"] as const;

  const pool = $derived(avatarPool(session.dbAvatars, staticAvatars));
  const selectedAvatar = $derived(pool.find((a) => a.id === session.selectedAvatarId));
  const rallyPool = $derived(
    rallyCandidates(session.avatarGroups, session.dbAvatars, staticAvatars),
  );

  // Waits for init() to have read the stored choice and the profile avatar
  // (identityReady) and for a pool to draw from, so the rally never
  // overrides either. A stored id that no longer resolves counts as none.
  let autoRallied = false;
  $effect(() => {
    if (!session.identityReady || session.dbAvatars.length === 0) return;
    const usableId = session.getAvatarSrc(session.selectedAvatarId)
      ? session.selectedAvatarId
      : "";
    if (!autoRallied && shouldAutoRally(usableId, rallyPool.length)) {
      autoRallied = true;
      session.previewAvatar(randomAvatar(rallyPool));
      session.confirmAvatar();
    }
  });

  function rallyAvatar() {
    session.previewAvatar(randomAvatar(rallyPool));
    session.confirmAvatar();
  }

  $effect(() => {
    if (session.membership === "pending") {
      return registerHeaderActions(headerActionState, { leaveLobby: () => void session.leaveLobby() });
    }
  });

  function handleJoinSubmit(e: Event) {
    e.preventDefault();
    session.error = "";
    const nick = session.nickname.trim();
    const err = session.validateNickname(nick);
    if (err) {
      session.error = err;
      return;
    }
    if (!session.selectedAvatarId || !session.getAvatarSrc(session.selectedAvatarId)) {
      toast.error("Choose an avatar to continue.");
      return;
    }
    session.isJoining = true;
    session.connect(nick);
  }
</script>

<svelte:head><title>Join quiz — Orakl</title></svelte:head>

{#if session.membership === "pending"}
  <!-- Invite-only lobby: awaiting curator approval. -->
  <div class="flex flex-col gap-1 pt-2">
    <h2 class="text-xl font-bold text-foreground-darker">Joining</h2>
    <h1 class="text-4xl font-bold">{session.quizName}</h1>
    {#if session.description}<p class="text-foreground-darker">{session.description}</p>{/if}
  </div>
  <Card variant="info" class="flex flex-col items-center gap-4 text-center">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-secondary/30 border-t-secondary" aria-hidden="true"></div>
    <div class="flex flex-col gap-1">
      <p class="text-base font-semibold">Waiting for approval</p>
      <p class="text-sm text-foreground-darker">The curator will let you in shortly.</p>
    </div>
    <Button type="button" variant="ghost" intent="compact" onclick={() => session.leaveLobby()} class="text-sm text-foreground-darker hover:text-foreground">
      Leave lobby
    </Button>
  </Card>
{:else}
  <div class="flex flex-col gap-1">
    <h2 class="text-2xl font-bold text-foreground-darker">Join</h2>
    {#if session.quizName}
      <div class="flex flex-col gap-3">
        <h1 class="text-4xl font-bold">{session.quizName}</h1>
        {#if session.description}<p class="text-foreground-darker">{session.description}</p>{/if}
        {#if session.lobbyCategories.length > 0}
          <div class="text-sm font-sans text-foreground-darker/70">
            <div class="flex flex-wrap items-center gap-2">
              <span>Categories:</span>
              <span class="font-bold">{session.lobbyCategories.length} selected</span>
            </div>
            {#if session.lobbyDifficulty}
              <div class="flex flex-wrap items-center gap-2">
                <span>Difficulty:</span>
                <span class="font-bold">{session.lobbyDifficulty}</span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <form onsubmit={handleJoinSubmit} class="flex flex-col gap-4 items-start">
    <div class="flex flex-col gap-2 group">
      <Input
        id="nickname"
        label="Nickname"
        name="nickname"
        bind:value={session.nickname}
        required="Required"
        maxlength={MAX_NICKNAME_LENGTH}
        placeholder="Beelzebub"
        autofocus
        class="text-base"
      >
        {#snippet inputEnd()}
          <Button
            type="button"
            variant="secondary"
            intent="icon"
            onclick={() => (session.nickname = randomNickname(NICKNAMES, session.nickname))}
            aria-label="Random nickname"
            iconBefore="dice"
          ></Button>
        {/snippet}
      </Input>
      <FieldDescription
        description="Pick the name the curator and other players will see during the quiz, or roll the dice for one."
        id="nickname-description"
      />
    </div>

    <div class="flex flex-col gap-2 group items-start">
      <span class="text-lg">Avatar</span>
      <div class="flex flex-col gap-3 items-start">
        <div class="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            intent="icon"
            onclick={rallyAvatar}
            aria-label="Rally an avatar"
            data-tooltip="Rally an avatar"
            iconBefore="dice"
          ></Button>
          <Button
            type="button"
            variant="outline"
            aria-haspopup="dialog"
            onclick={() => session.openAvatarSelector()}
          >
            Change your avatar
          </Button>
        </div>
        <AvatarPlaque
          src={session.selectedAvatarId ? session.getAvatarSrc(session.selectedAvatarId) : undefined}
          title={selectedAvatar?.title}
          description={selectedAvatar?.description}
        />
        <FieldDescription
          description="Choose the avatar shown beside your name in the lobby, during play, and on the final standings."
          id="avatar-description"
        />
      </div>
    </div>

    {#if page.data.uiFlags?.ROLE_SELECTION === true}
      <RadioGroup
        options={roleOptions}
        bind:selected={session.selectedRole}
        name="role"
        legend="Role"
        description="Observers can watch the quiz but can't answer questions."

      >
        {#snippet optionLabel(role)}
          <span class="font-mono text-base">{role === "player" ? "Player" : "Observer"}</span>
        {/snippet}
      </RadioGroup>
    {/if}

    <Button type="submit" variant="primary" intent="cta" disabled={session.isJoining} class="md:min-w-md md:self-end">
      {session.isJoining ? "Joining..." : "Join"}
    </Button>
  </form>

  {#if session.hasStoredData}
    <Button
      type="button"
      variant="ghost"
      intent="compact"
      onclick={() => session.clearStoredData()}
      class="mt-3 self-start px-0 text-sm text-red-400 hover:bg-transparent hover:text-red-300"
    >
      Clear saved data
    </Button>
  {/if}
{/if}
