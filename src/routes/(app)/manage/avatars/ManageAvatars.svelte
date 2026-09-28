<script lang="ts">
import { avatarDescription } from "@orakl/shared";

import Button from "$lib/components/ui/Button.svelte";
import Card from "$lib/components/ui/Card.svelte";
import Input from "$lib/components/ui/Input.svelte";
import { toast } from "$lib/toast.js";
import { SvelteMap } from "svelte/reactivity";
import { tick } from "svelte";

type AvatarRow = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  src: string;
};

interface Props {
  sortedGroups: Array<[string, AvatarRow[]]>;
  categories: string[];
}

let { sortedGroups, categories }: Props = $props();

type CardState = {
  editing: boolean;
  title: string;
  desc: string;
  cat: string;
  saving: boolean;
  /** Last persisted values; Cancel returns to these. */
  saved: { title: string; desc: string; cat: string };
};

// SvelteMap makes the map itself reactive; each value is wrapped in $state so
// mutating a field (e.g. `card.editing = true`) triggers a re-render.
let cards = new SvelteMap<string, CardState>();
// svelte-ignore state_referenced_locally
for (const [, avatars] of sortedGroups) {
  for (const av of avatars) {
    const saved = {
      title: av.title ?? "",
      desc: (av.description as string) ?? "",
      cat: (av.category as string) ?? "",
    };
    const card: CardState = $state({ editing: false, ...saved, saving: false, saved });
    cards.set(av.id, card);
  }
}

function getCard(id: string): CardState {
  // biome-ignore lint/style/noNonNullAssertion: card always exists, initialized from sortedGroups
  return cards.get(id)!;
}

async function focusEditButton(av: AvatarRow) {
  await tick();
  document.getElementById(`avatar-edit-${av.id}`)?.focus();
}

async function openEditor(av: AvatarRow) {
  const card = getCard(av.id);
  card.editing = true;
  await tick();
  document.getElementById(`avatar-title-${av.id}`)?.focus();
}

function cancel(av: AvatarRow) {
  const card = getCard(av.id);
  card.title = card.saved.title;
  card.desc = card.saved.desc;
  card.cat = card.saved.cat;
  card.editing = false;
  focusEditButton(av);
}

async function save(av: AvatarRow) {
  const card = getCard(av.id);
  card.saving = true;
  const res = await fetch("/api/avatars", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: av.id,
      title: card.title,
      description: card.desc,
      category: card.cat,
    }),
  });
  card.saving = false;
  if (!res.ok) {
    toast.error("Could not save the avatar.");
    return;
  }
  card.saved = { title: card.title, desc: card.desc, cat: card.cat };
  card.editing = false;
  focusEditButton(av);
}

function handleEditKeydown(e: KeyboardEvent, av: AvatarRow) {
  if (e.key === "Escape" && !e.isComposing && !getCard(av.id).saving) cancel(av);
}
</script>

{#each sortedGroups as [cat, avatars]}
  <div class="mt-6">
    <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-darker">
      {cat || "Uncategorized"}
    </h2>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {#each avatars as av, index}
        {@const card = getCard(av.id)}
        <Card
          padding="none"
          class="avatar-card group relative gap-0 rounded-2xl transition-colors duration-200 ease-ease-in-out-quart hover:border-secondary/40"
        >
          {#if !card.editing}
            <!-- View mode -->
            <Button
              id="avatar-edit-{av.id}"
              unstyled
              type="button"
              class="w-full cursor-pointer rounded-2xl corner-shape-squircle p-3 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-secondary/40"
              aria-label="Edit {card.title}"
              onclick={() => openEditor(av)}
            >
              <img
                src={av.src}
                alt={av.title}
                class="mx-auto h-16 w-16"
                style="image-rendering: pixelated;"
                loading="lazy"
                decoding="async"
                fetchpriority={index < 10 ? "high" : "auto"}
              />
              <div class="mt-2 text-center">
                <p class="text-sm font-semibold leading-tight">{card.title}</p>
                <p class="mt-0.5 text-xs text-foreground-darker line-clamp-3">{avatarDescription(card.desc)}</p>
              </div>
            </Button>
          {:else}
            <!-- Edit mode -->
            <div class="flex flex-col gap-2.5 p-3">
              <div class="flex items-center gap-2 rounded-lg corner-shape-squircle bg-background-lighter/40 px-2 py-1.5">
                <img
                  src={av.src}
                  alt=""
                  class="h-8 w-8"
                  style="image-rendering: pixelated;"
                  loading="lazy"
                  decoding="async"
                />
                <span class="text-sm font-medium">{card.title || "Untitled"}</span>
              </div>

              <Input
                id="avatar-title-{av.id}"
                onkeydown={(e) => handleEditKeydown(e, av)}
                label="Title"
                name="title"
                bind:value={card.title}
                size="sm"
              />
              <Input
                id="avatar-category-{av.id}"
                onkeydown={(e) => handleEditKeydown(e, av)}
                label="Category (optional)"
                name="category"
                list="avatar-categories"
                bind:value={card.cat}
                size="sm"
              />
              <Input
                id="avatar-description-{av.id}"
                onkeydown={(e) => handleEditKeydown(e, av)}
                label="Description (optional)"
                name="description"
                type="textarea"
                rows={2}
                bind:value={card.desc}
                size="sm"
              />

              <div class="flex gap-2">
                <Button
                  variant="secondary"
                  intent="compact"
                  class="flex-1"
                  onclick={() => save(av)}
                  loading={card.saving}
                  disabled={card.saving}
                >
                  Save
                </Button>
                <Button variant="outline" intent="compact" disabled={card.saving} onclick={() => cancel(av)}>Cancel</Button>
              </div>
            </div>
          {/if}
        </Card>
      {/each}
    </div>
  </div>
{/each}

<datalist id="avatar-categories">
  {#each categories as c}
    <option value={c}></option>
  {/each}
</datalist>

{#if sortedGroups.every(([, avatars]) => avatars.length === 0)}
  <p class="text-center text-sm text-foreground-darker">
    No avatars found.
  </p>
{/if}
