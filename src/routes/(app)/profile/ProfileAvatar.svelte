<script lang="ts">
import { DEFAULT_AVATAR_DESC, buildAvatarGroups, getAvatarSrc as getAvatarSrcHelper } from "@orakl/shared";
import type { AvatarGroup, DbAvatar } from "@orakl/shared";
  import { onMount } from "svelte";
  
  import Button from "$lib/components/ui/Button.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import Avatar from '@/lib/components/ui/Avatar.svelte';
  import { toast } from "@/lib/toast.js";

  let { profileAvatarId }: { profileAvatarId: string } = $props();

  // Writable derived: picking an avatar reassigns locally; resets to server
  // truth when the prop refreshes.
  let selectedAvatarId = $derived(profileAvatarId);
  let dbAvatars = $state<DbAvatar[]>([]);
  let avatarGroups = $state<AvatarGroup[]>([]);

  let dialogAvatarId = $state("");
  let dialogAvatarSrc = $state("");
  let dialogAvatarTitle = $state("");
  let dialogAvatarDesc = $state("");

  let avatarPickerOpen = $state(false);

  function getAvatarSrc(avatarId: string): string {
    return getAvatarSrcHelper(avatarId, dbAvatars);
  }

  function previewAvatar(av: { id: string; title: string; description: string; src: string }) {
    dialogAvatarId = av.id;
    dialogAvatarSrc = av.src;
    dialogAvatarTitle = av.title;
    dialogAvatarDesc = av.description || DEFAULT_AVATAR_DESC;
  }

  async function confirmAvatar() {
    selectedAvatarId = dialogAvatarId;
    avatarPickerOpen = false;
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: selectedAvatarId }),
      });
      if (res.ok) {
        toast.success("Avatar saved");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string })?.error ?? "Failed to save avatar");
      }
    } catch {
      toast.error("Network error — avatar not saved");
    }
  }

  function openAvatarSelector() {
    dialogAvatarId = "";
    avatarPickerOpen = true;
  }

  function closeAvatarSelector() {
    dialogAvatarId = "";
    avatarPickerOpen = false;
  }

  onMount(async () => {
    try {
      const res = await fetch("/api/avatars");
      if (res.ok) {
        dbAvatars = await res.json();
        avatarGroups = buildAvatarGroups(dbAvatars);
      }
    } catch {
      /* silent */
    }
  });
</script>

<div class="flex flex-col gap-4">
  <!-- Avatar button -->
  <Button
    variant="secondary"
    aria-haspopup="dialog"
    onclick={openAvatarSelector}
    class="p-5 flex flex-col gap-2"
  >
    <Avatar src={getAvatarSrc(selectedAvatarId)} alt="Your avatar" class="size-10" />

    <span class="text-sm">{selectedAvatarId ? "Change avatar" : "Choose avatar"}</span>
  </Button>

  <!-- Avatar selector dialog -->
  <ResponsiveOverlay
    id="profile-avatar-overlay"
    open={avatarPickerOpen}
    hasTitle={true}
    panelClass="lg:max-w-[42rem]"
    bodyClass="flex flex-col gap-6"
    footerClass="flex flex-col gap-3"
    onClose={closeAvatarSelector}
  >
    {#snippet title()}
      Choose your avatar
    {/snippet}

    {#each avatarGroups as group (group.category)}
      <div class="flex flex-col gap-3">
        {#if group.category}
          <p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-foreground-darker/65">
            {group.category}
          </p>
        {/if}
        <div class="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {#each group.items as av (av.id)}
            <Button
              type="button"
              variant="ghost"
              intent="icon"
              onclick={() => previewAvatar(av)}
              aria-pressed={dialogAvatarId === av.id}
              aria-label={av.title}
              class={[
                "h-auto w-full aspect-square rounded-2xl border p-2 focus-visible:ring-secondary/40 active:scale-[0.97]",
                dialogAvatarId === av.id
                  ? "border-secondary/55 bg-secondary/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border-background-lighter/30 bg-background-lighter/10 hover:border-secondary/35 hover:bg-background-lighter/20",
              ].join(" ")}
            >
              <!-- loading=lazy defers fetching off-screen avatars until dialog opens and user scrolls near them -->
              <img src={av.src} alt={av.title} class="h-10 w-10" style="image-rendering: pixelated;" loading="lazy" decoding="async" />
            </Button>
          {/each}
        </div>
      </div>
    {/each}

    {#snippet footer()}
      {#if dialogAvatarId}
        <div class="flex items-start gap-3 rounded-2xl border border-secondary/35 bg-secondary/10 px-3 py-3">
          <img src={dialogAvatarSrc} class="h-16 w-16 shrink-0" aria-hidden="true" style="image-rendering: pixelated;" alt="" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-foreground">{dialogAvatarTitle}</p>
            <p class="mt-1 text-xs text-foreground-darker">{dialogAvatarDesc}</p>
          </div>
        </div>
      {/if}

      <div class="flex items-center justify-end gap-2">
        <Button variant="outline" intent="compact" onclick={closeAvatarSelector}>Cancel</Button>
        <Button intent="compact" disabled={!dialogAvatarId} onclick={confirmAvatar}>Save</Button>
      </div>
    {/snippet}
  </ResponsiveOverlay>
</div>
