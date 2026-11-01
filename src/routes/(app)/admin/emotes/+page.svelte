<script lang="ts">
  import { untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { invalidate } from "$app/navigation";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import FileInput from "$lib/components/ui/FileInput.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { toast } from "$lib/toast";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  type Emote = PageData["packs"][number]["emotes"][number];
  type Pack = PageData["packs"][number];

  const reduceMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  let busy = $state<string | null>(null);
  type Draft = { title: string; description: string; packId: string };
  let drafts = $state<Record<string, Draft>>({});
  let packDrafts = $state<Record<string, { title: string; description: string }>>({});
  let newTitle = $state("");
  let newDescription = $state("");
  let uploadFile = $state<File | null>(null);
  let uploadKey = $state(0);
  let uploadTitle = $state("");
  let uploadDescription = $state("");
  let uploadPackId = $state("");
  // A fresh load with no pack chosen yet, or the chosen pack gone, picks the first.
  $effect.pre(() => {
    if (!data.packs.some((p) => p.id === uploadPackId))
      uploadPackId = data.packs[0]?.id ?? "";
  });

  // Fresh data (first load, or after any save) resets each form to what is
  // stored, unless that form holds an edit not yet saved: saving one row must
  // not wipe what was typed in another.
  let storedEmotes: Record<string, Draft> = {};
  let storedPacks: Record<string, { title: string; description: string }> = {};
  const same = (a: object | undefined, b: object | undefined) =>
    JSON.stringify(a) === JSON.stringify(b);
  $effect.pre(() => {
    const emotes: Record<string, Draft> = Object.fromEntries(
      data.packs.flatMap((p) =>
        p.emotes.map((e) => [
          e.id,
          { title: e.title, description: e.description, packId: p.id },
        ]),
      ),
    );
    const packs = Object.fromEntries(
      data.packs.map((p) => [p.id, { title: p.title, description: p.description }]),
    );
    const keep = <T extends object>(
      next: Record<string, T>,
      prev: Record<string, T>,
      current: Record<string, T>,
    ) =>
      Object.fromEntries(
        Object.entries(next).map(([id, fresh]) => {
          const draft = $state.snapshot(current[id]) as T | undefined;
          return [id, draft && !same(draft, prev[id]) ? draft : fresh];
        }),
      );
    // Read the drafts untracked: typing must not rerun this.
    untrack(() => {
      drafts = keep(emotes, storedEmotes, drafts);
      packDrafts = keep(packs, storedPacks, packDrafts);
    });
    storedEmotes = emotes;
    storedPacks = packs;
  });

  /** Sends one edit, then reloads the page data. Returns whether it saved. */
  async function save(
    key: string,
    method: string,
    path: string,
    body: unknown,
    done: string,
  ): Promise<boolean> {
    busy = key;
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        const reason = ((await res.json().catch(() => ({}))) as { error?: string })
          .error;
        toast.error(reason ?? "Could not save.");
        return false;
      }
      toast.success(done);
      await invalidate("app:admin-emotes");
      return true;
    } catch {
      toast.error("Could not save.");
      return false;
    } finally {
      busy = null;
    }
  }

  const saveEmote = (emote: Emote) => {
    const d = drafts[emote.id];
    return save(
      emote.id,
      "PATCH",
      `/api/admin/emotes/${encodeURIComponent(emote.id)}`,
      { title: d.title, description: d.description, packId: d.packId },
      `Saved ${d.title.trim() || emote.title}.`,
    );
  };

  const savePack = (pack: Pack) => {
    const d = packDrafts[pack.id];
    return save(
      pack.id,
      "PATCH",
      `/api/admin/emotes/packs/${encodeURIComponent(pack.id)}`,
      { title: d.title, description: d.description },
      `Saved ${d.title.trim() || pack.title}.`,
    );
  };

  const setRetired = (emote: Emote, retire: boolean) =>
    save(
      emote.id,
      "POST",
      `/api/admin/emotes/${encodeURIComponent(emote.id)}/${retire ? "retire" : "restore"}`,
      undefined,
      `${retire ? "Retired" : "Restored"} ${emote.title}.`,
    );

  const deletePack = (pack: Pack) =>
    save(
      `delete:${pack.id}`,
      "DELETE",
      `/api/admin/emotes/packs/${encodeURIComponent(pack.id)}`,
      undefined,
      `Deleted ${pack.title}.`,
    );

  const makeDefault = (pack: Pack) =>
    save(
      `default:${pack.id}`,
      "PUT",
      `/api/admin/emotes/packs/${encodeURIComponent(pack.id)}/default`,
      undefined,
      `${pack.title} is the default pack.`,
    );

  /** Swaps an emote with its neighbour and saves the pack's whole order. */
  function move(pack: Pack, index: number, by: -1 | 1) {
    const ids = pack.emotes.map((e) => e.id);
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    return save(
      `order:${pack.id}`,
      "PUT",
      `/api/admin/emotes/packs/${encodeURIComponent(pack.id)}/order`,
      { emoteIds: ids },
      "Order saved.",
    );
  }

  async function uploadEmote(event: SubmitEvent) {
    event.preventDefault();
    if (!uploadFile) {
      toast.error("Choose an image to upload.");
      return;
    }
    const form = new FormData();
    form.append("file", uploadFile);
    form.append("title", uploadTitle);
    form.append("description", uploadDescription);
    form.append("packId", uploadPackId);
    busy = "upload";
    try {
      const res = await fetch("/api/admin/emotes", { method: "POST", body: form });
      if (!res.ok) {
        // A schema refusal names its field in `reason` (e.g. the 2 MB cap).
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          reason?: string;
        };
        toast.error(body.reason ?? body.error ?? "Could not upload emote.");
        return;
      }
      toast.success("Emote uploaded.");
      uploadFile = null;
      // A fresh file input, so picking the same file again fires a change.
      uploadKey += 1;
      uploadTitle = "";
      uploadDescription = "";
      await invalidate("app:admin-emotes");
    } catch {
      toast.error("Could not upload emote.");
    } finally {
      busy = null;
    }
  }

  async function createPack(event: SubmitEvent) {
    event.preventDefault();
    const saved = await save(
      "new-pack",
      "POST",
      "/api/admin/emotes/packs",
      { title: newTitle, description: newDescription },
      "Pack created.",
    );
    if (saved) {
      newTitle = "";
      newDescription = "";
    }
  }
</script>

{#if __FEATURE_PLAYER_EMOTES__}
<Metatags title="Emote gallery" description="Packs and emotes players choose from." />

<div class="flex flex-col gap-8 py-8">
  <header class="flex flex-col gap-2">
    <h1 class="text-lg font-semibold">Emote gallery</h1>
    <p class="text-foreground-darker font-sans max-w-prose">
      Packs and emotes players choose from. The default pack's first five emotes
      go to players who chose none.
    </p>
  </header>

  {#each data.packs as pack (pack.id)}
    <section aria-labelledby={`pack-${pack.id}`}>
      <Card variant="default" class="gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 flex-col gap-1">
            <h2 id={`pack-${pack.id}`} class="flex items-center gap-2 font-semibold">
              <span class="min-w-0 break-words">{pack.title}</span>
              {#if pack.isDefault}<Badge variant="status" tone="primary">Default</Badge>{/if}
            </h2>
            {#if pack.description}
              <p class="text-foreground-darker font-sans text-sm">{pack.description}</p>
            {/if}
          </div>
          {#if !pack.isDefault}
            <Button
              type="button"
              variant="outline"
              intent="compact"
              disabled={busy === `default:${pack.id}`}
              onclick={() => makeDefault(pack)}
            >
              Make default
            </Button>
          {/if}
        </div>

        <form
          class="flex flex-wrap items-end gap-3"
          onsubmit={(e) => {
            e.preventDefault();
            savePack(pack);
          }}
        >
          <Input
            id={`pack-title-${pack.id}`}
            name="title"
            label="Pack title"
            bind:value={packDrafts[pack.id].title}
            class="min-w-48"
          />
          <Input
            id={`pack-description-${pack.id}`}
            name="description"
            label="Pack description"
            bind:value={packDrafts[pack.id].description}
            class="min-w-64"
          />
          <Button type="submit" variant="outline" intent="compact" disabled={busy === pack.id}>
            Rename pack
          </Button>
        </form>

        {#if pack.emotes.length === 0}
          <p class="text-foreground-darker font-sans text-sm">No emotes in this pack.</p>
          {#if !pack.isDefault}
            <div>
              <ConfirmButton
                label="Delete pack"
                ariaLabel={`Delete ${pack.title}`}
                confirmLabel="Delete pack?"
                confirmAriaLabel={`Click again to delete ${pack.title}`}
                variant="outline"
                confirmVariant="danger"
                onConfirm={() => deletePack(pack)}
              >
                {#snippet icon()}{/snippet}
                {#snippet confirmIcon()}{/snippet}
              </ConfirmButton>
            </div>
          {/if}
        {:else}
          <ul class="flex flex-col gap-3">
            {#each pack.emotes as emote, index (emote.id)}
              <li>
                <form
                  class="flex flex-wrap items-end gap-3"
                  onsubmit={(e) => {
                    e.preventDefault();
                    saveEmote(emote);
                  }}
                >
                  <img
                    src={reduceMotion.current ? emote.stillSrc : emote.src}
                    alt=""
                    width="48"
                    height="48"
                    class="size-12 shrink-0 object-contain"
                  />
                  <Input
                    id={`emote-title-${emote.id}`}
                    name="title"
                    label={`Title of ${emote.title}`}
                    bind:value={drafts[emote.id].title}
                    class="min-w-40"
                  />
                  <Input
                    id={`emote-description-${emote.id}`}
                    name="description"
                    label={`Description of ${emote.title}`}
                    bind:value={drafts[emote.id].description}
                    class="min-w-56"
                  />
                  <Select
                    id={`emote-pack-${emote.id}`}
                    label={`Pack of ${emote.title}`}
                    bind:value={drafts[emote.id].packId}
                    class="min-w-40"
                  >
                    {#each data.packs as option (option.id)}
                      <option value={option.id}>{option.title}</option>
                    {/each}
                  </Select>
                  {#if emote.retired}<Badge variant="status" tone="warning">Retired</Badge>{/if}
                  <span class="flex flex-wrap items-center gap-2">
                    <Button type="submit" variant="outline" intent="compact" disabled={busy === emote.id}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      intent="compact"
                      aria-label={`Move up: ${emote.title}`}
                      disabled={index === 0 || busy === `order:${pack.id}`}
                      onclick={() => move(pack, index, -1)}
                    >
                      Move up
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      intent="compact"
                      aria-label={`Move down: ${emote.title}`}
                      disabled={index === pack.emotes.length - 1 || busy === `order:${pack.id}`}
                      onclick={() => move(pack, index, 1)}
                    >
                      Move down
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      intent="compact"
                      aria-label={`${emote.retired ? "Restore" : "Retire"} ${emote.title}`}
                      disabled={busy === emote.id}
                      onclick={() => setRetired(emote, !emote.retired)}
                    >
                      {emote.retired ? "Restore" : "Retire"}
                    </Button>
                  </span>
                </form>
              </li>
            {/each}
          </ul>
        {/if}
        {#if pack.isDefault}
          <p class="text-foreground-darker font-sans text-sm">The default pack cannot be deleted.</p>
        {:else if pack.emotes.length > 0}
          <p class="text-foreground-darker font-sans text-sm">
            Only a pack with no emotes, retired ones included, can be deleted.
          </p>
        {/if}
      </Card>
    </section>
  {/each}

  <Card variant="default" class="gap-4">
    <h2 class="font-semibold">Upload emote</h2>
    <form class="flex flex-wrap items-end gap-3" onsubmit={uploadEmote}>
      {#key uploadKey}
      <FileInput
        id="upload-emote-file"
        label="Choose an image"
        accept="image/png,image/webp,image/gif"
        onfiles={(files) => (uploadFile = files[0])}
      >
        <span class="text-foreground-darker font-sans text-xs">
          PNG or WebP still; animated WebP or GIF. Up to 2 MB, 60 frames.
        </span>
        {#if uploadFile}
          <span class="text-foreground-darker font-sans text-xs min-w-0 [overflow-wrap:anywhere]">
            {uploadFile.name}
          </span>
        {/if}
      </FileInput>
      {/key}
      <Input id="upload-emote-title" name="title" label="Title" bind:value={uploadTitle} class="min-w-40" />
      <Input
        id="upload-emote-description"
        name="description"
        label="Description"
        bind:value={uploadDescription}
        class="min-w-56"
      />
      <Select id="upload-emote-pack" label="Pack" bind:value={uploadPackId} class="min-w-40">
        {#each data.packs as option (option.id)}
          <option value={option.id}>{option.title}</option>
        {/each}
      </Select>
      <Button type="submit" variant="primary" intent="compact" disabled={busy === "upload"}>
        {busy === "upload" ? "Uploading…" : "Upload emote"}
      </Button>
    </form>
  </Card>

  <Card variant="default" class="gap-4">
    <h2 class="font-semibold">New pack</h2>
    <form class="flex flex-wrap items-end gap-3" onsubmit={createPack}>
      <Input id="new-pack-title" name="title" label="Title" bind:value={newTitle} class="min-w-48" />
      <Input
        id="new-pack-description"
        name="description"
        label="Description"
        bind:value={newDescription}
        class="min-w-64"
      />
      <Button type="submit" variant="primary" intent="compact" disabled={busy === "new-pack"}>
        Create pack
      </Button>
    </form>
  </Card>
</div>
{/if}
