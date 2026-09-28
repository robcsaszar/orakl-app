<script lang="ts">
  import { tick } from "svelte";
  import { getQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import { MAX_NICKNAME_LENGTH } from "@/lib/constants/game.constants.js";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Avatar from "$lib/components/ui/Avatar.svelte";
  import { slide } from "svelte/transition";
  import { elasticIn } from "svelte/easing";
  import Icon from '@/lib/components/ui/Icon.svelte';

  const session = getQuizSession();

  let isEditingNickname = $state(false);
  let editNicknameValue = $state("");
  let editNicknameError = $state("");
  let inputEl = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);

  $effect(() => {
    if (!isEditingNickname) editNicknameValue = session.nickname;
  });

  function startEdit() {
    editNicknameError = "";
    isEditingNickname = true;
    tick().then(() => {
      inputEl?.focus();
      if (inputEl instanceof HTMLInputElement) inputEl.select();
    });
  }

  async function saveNickname() {
    const err = await session.saveNickname(editNicknameValue);
    if (err) {
      editNicknameError = err;
      return;
    }
    isEditingNickname = false;
  }
</script>

<Card variant="mezzanine" class="relative flex md:flex-row md:gap-12 items-start self-start">
  <div class="flex flex-col items-start gap-2">
    <div class="flex gap-2 items-center justify-start">
      <span class="text-lg">Your avatar</span>
      <Button
          type="button"
          variant="ghost"
          intent="icon-inline"
          onclick={() => session.openAvatarSelector()}
          aria-label="Edit avatar"
          iconBefore="edit"
        ></Button>
    </div>
    <div class="flex gap-2 items-end">
      <Avatar
        src={session.selectedAvatarId ? session.getAvatarSrc(session.selectedAvatarId) : undefined}
        alt="Your avatar"
        class="size-16"
      />

    </div>
  </div>
  <div class="flex items-stretch max-w-lg">
    <Input
      id="edit-nickname"
      label="Your nickname"
      name="edit-nickname"
      bind:inputRef={inputEl}
      type="text"
      disabled={!isEditingNickname}
      aria-label="Your nickname"
      bind:value={editNicknameValue}
      maxlength={MAX_NICKNAME_LENGTH}
      labelEndJustify="start"
      onkeydown={(e) => {
        if (e.key === "Enter") saveNickname();
        if (e.key === "Escape") isEditingNickname = false;
      }}
    >
      {#snippet labelEnd()}
        <Button
          type="button"
          variant={isEditingNickname ? "secondary" : "ghost"}
          intent="icon-inline"
          behavior="toggle"
          onclick={startEdit}
          aria-label="Edit nickname"
          iconBefore="edit"
          data-state={isEditingNickname ? "on" : "off"}
        ></Button>
      {/snippet}
      {#snippet inputEnd()}
        {#if isEditingNickname}
          <div
            class="flex items-center gap-2 justify-center"
            in:slide={{ duration: 150, axis: "x", easing: elasticIn }}
          >
            <Button type="button" variant="success" intent="icon" iconBefore="check" onclick={saveNickname} aria-label="Save"
            ></Button>
            <Button type="button" variant="danger" intent="icon" iconBefore="x" onclick={() => (isEditingNickname = false)} aria-label="Cancel"
            ></Button>
          </div>
          {#if editNicknameError}<p class="mt-1 text-xs text-danger text-center">{editNicknameError}</p>{/if}
        {/if}
      {/snippet}
    </Input>
  </div>
  <Icon name="bonfire" class="text-secondary-600/20 size-40 absolute bottom-0 -right-30 rotate-12 -z-10" />
</Card>
