<script lang="ts">
import { avatars as staticAvatars, rallyCandidates, randomAvatar } from "@orakl/shared";
  import { tick } from "svelte";
  import { getQuizSession } from "@/lib/svelte/quizSession.svelte.js";

  import Button from "$lib/components/ui/Button.svelte";
  import Checkbox from "$lib/components/ui/Checkbox.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import { cn } from "tailwind-variants";

  const session = getQuizSession();
  const pool = $derived(
    rallyCandidates(session.avatarGroups, session.dbAvatars, staticAvatars),
  );

  let gridEl: HTMLElement | undefined;

  async function rallyAvatar() {
    session.previewAvatar(randomAvatar(pool));
    await tick();
    const tile = gridEl?.querySelector<HTMLElement>(`[aria-pressed="true"]`);
    tile?.scrollIntoView({ block: "nearest" });
  }
</script>

<ResponsiveOverlay
  id="quiz-avatar-overlay"
  open={session.avatarPickerOpen}
  hasTitle={true}
  panelClass="lg:max-w-[42rem]"
  bodyClass="flex flex-col gap-6"
  footerClass="flex flex-col gap-3"
  onClose={() => session.closeAvatarSelector()}
>
  {#snippet title()}
    Choose your avatar
  {/snippet}

  {#if session.avatarGroups.length === 0}
    <p class="text-sm text-foreground-darker/60">Loading avatars…</p>
  {:else}
    <Button
      type="button"
      variant="ghost"
      intent="compact"
      onclick={rallyAvatar}
      class="self-start text-sm"
    >
      Rally an avatar
    </Button>
  {/if}

  <div bind:this={gridEl} class="flex flex-col gap-6">
  {#each session.avatarGroups as group (group.category)}
    <div class="flex flex-col gap-3">
      {#if group.category}
        <p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-foreground-darker/65">
          {group.category}
        </p>
      {/if}
      <div class="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {#each group.items as av (av.id)}
          <Button
            unstyled
            type="button"
            onclick={() => session.previewAvatar(av)}
            aria-pressed={session.dialogAvatarId === av.id}
            aria-label={av.title}
            class={cn(
              "flex aspect-square items-center justify-center rounded-2xl corner-shape-squircle border-2 p-2 transition-transform duration-150 ease-ease-in-out-quart focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary/40 active:scale-[0.97]",
              session.dialogAvatarId === av.id
                ? "border-secondary/55 bg-secondary/12 inset-shadow-2xs inset-shadow-foreground/10"
                : "border-background-lighter/30 bg-background-lighter/10 hover:border-secondary/35 hover:bg-background-lighter/20",
            )}
          >
            <img
              src={av.src}
              alt={av.title}
              class="h-10 w-10"
              style="image-rendering: pixelated;"
              loading="lazy"
              decoding="async"
            />
          </Button>
        {/each}
      </div>
    </div>
  {/each}
  </div>

  {#snippet footer()}
    {#if session.dialogAvatarId}
      <div class="flex items-start gap-3 rounded-2xl corner-shape-squircle border-2 border-secondary/35 bg-secondary/10 px-3 py-3">
        <img
          src={session.dialogAvatarSrc}
          class="h-16 w-16 shrink-0"
          aria-hidden="true"
          alt=""
          style="image-rendering: pixelated;"
        />
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-foreground">{session.dialogAvatarTitle}</p>
          <p class="mt-1 text-xs text-foreground-darker">{session.dialogAvatarDesc}</p>
        </div>
      </div>
    {/if}

    {#if session.showSaveToProfileCheckbox}
      <Checkbox
        id="avatar-save-to-profile"
        label="Also save this avatar to my profile"
        bind:checked={session.saveToProfile}
        class="rounded-2xl corner-shape-squircle border-2 border-background-lighter/30 bg-background-lighter/10 px-3 py-2"
      />
    {/if}

    <div class="flex items-center justify-end gap-2">
      <Button variant="outline" intent="compact" onclick={() => session.closeAvatarSelector()}>Cancel</Button>
      <Button intent="compact" disabled={!session.dialogAvatarId} onclick={() => session.confirmAvatar()}>Save</Button>
    </div>
  {/snippet}
</ResponsiveOverlay>
