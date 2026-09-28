<script lang="ts">
  import Drawer from "$lib/components/ui/Drawer.svelte";
  import type { Category } from "@orakl/protocol";
  import Input from "$lib/components/ui/Input.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { toast } from "@/lib/toast.js";

  let { initial }: { initial: Category[] } = $props();

  const DRAWER_ID = "edit-category-drawer";

  // Writable derived: local reassignments (optimistic add/edit/delete) win
  // until the server prop refreshes, then it resets to server truth.
  let categories = $derived<Category[]>(initial);
  let selected = $state<Category | null>(null);
  let isNew = $state(false);
  let editName = $state("");
  let editDescription = $state("");
  let editIcon = $state("");
  let editColor = $state("");
  let saving = $state(false);
  let error = $state("");
  let deleteConfirm = $state(false);

  function openDrawer() {
    window.dispatchEvent(new CustomEvent("drawer:open", { detail: { id: DRAWER_ID } }));
  }

  function closeDrawer() {
    window.dispatchEvent(new CustomEvent("drawer:close", { detail: { id: DRAWER_ID } }));
  }

  function openNew() {
    selected = null;
    isNew = true;
    editName = "";
    editDescription = "";
    editIcon = "";
    editColor = "";
    saving = false;
    deleteConfirm = false;
    error = "";
    openDrawer();
  }

  function openEdit(cat: Category) {
    selected = cat;
    isNew = false;
    editName = cat.name;
    editDescription = cat.description ?? "";
    editIcon = cat.icon ?? "";
    editColor = cat.color ?? "";
    saving = false;
    deleteConfirm = false;
    error = "";
    openDrawer();
  }

  async function save() {
    const name = editName.trim();
    if (!name) {
      error = "Name is required";
      return;
    }
    saving = true;
    error = "";
    try {
      const body: Record<string, unknown> = {
        name,
        description: editDescription.trim() || null,
        icon: editIcon.trim() || null,
        color: editColor.trim() || null,
      };
      if (!isNew && selected) body.id = selected.id;

      const res = await fetch("/api/manage/categories", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (isNew) {
        categories = [...categories, data.category];
      } else {
        categories = categories.map((c) =>
          c.id === data.category.id ? data.category : c,
        );
      }
      closeDrawer();
    } catch (e) {
      error = e instanceof Error ? e.message : "Save failed";
      toast.error(error);
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    if (!selected) return;
    if (!deleteConfirm) {
      deleteConfirm = true;
      return;
    }
    error = "";
    try {
      const res = await fetch(
        `/api/manage/categories?id=${encodeURIComponent(selected.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const selectedId = selected?.id;
      categories = categories.filter((c) => c.id !== selectedId);
      closeDrawer();
    } catch (e) {
      error = e instanceof Error ? e.message : "Delete failed";
      toast.error(error);
      deleteConfirm = false;
    }
  }
</script>

<div>
  <!-- Header row -->
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-lg font-semibold">Categories</h1>
    <Button intent="compact" onclick={openNew}>Add category</Button>
  </div>

  {#if categories.length === 0}
    <p class="py-12 text-center text-sm text-foreground-darker">
      No categories yet. Add one to get started.
    </p>
  {/if}

  <!-- Card grid -->
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
    {#each categories as cat (cat.id)}
      <Button
        class="flex w-full flex-col items-start gap-0 overflow-hidden rounded-2xl border border-foreground/10 bg-background-lighter/30 p-0 text-left font-normal whitespace-normal hover:bg-background-lighter/60 active:scale-[0.98]"
        onclick={() => openEdit(cat)}
      >
        <div class="h-1.5 w-full" style={cat.color ? `background:${cat.color}` : ""}></div>
        <div class="flex flex-col gap-2 p-4">
          {#if cat.icon}
            <img src={cat.icon} alt="{cat.name} icon" class="size-8 rounded object-contain" />
          {:else}
            <div class="flex size-8 items-center justify-center rounded bg-foreground/10 text-xs text-foreground-darker">?</div>
          {/if}
          <p class="text-sm font-semibold leading-tight">{cat.name}</p>
          {#if cat.description}
            <p class="line-clamp-2 text-xs text-foreground-darker">{cat.description}</p>
          {/if}
          <p class="text-xs text-foreground-darker">
            <!-- @ts-ignore question_count from DB join -->
            {(cat as unknown as { question_count: number }).question_count ?? 0} question{(cat as unknown as { question_count: number }).question_count === 1 ? "" : "s"}
          </p>
        </div>
      </Button>
    {/each}
  </div>

  <!-- Edit drawer -->
  <Drawer id={DRAWER_ID}>
    {#snippet title()}
      {isNew ? "Add category" : "Edit category"}
    {/snippet}

    <div class="flex flex-col gap-5">
      <Input
        id="cat-name"
        label="Name"
        name="name"
        bind:value={editName}
        placeholder="Category name"
      />

      <Input
        id="cat-description"
        label="Description"
        name="description"
        type="textarea"
        rows={3}
        bind:value={editDescription}
        placeholder="Optional description"
      />

      <div class="flex items-end gap-3">
        <Input
          id="cat-icon"
          label="Icon URL"
          name="icon"
          bind:value={editIcon}
          placeholder="https://…"
        />
        {#if editIcon}
          <img
            src={editIcon}
            alt="Icon preview"
            class="mb-0.5 size-10 shrink-0 rounded border border-foreground/10 bg-background-lighter object-contain"
          />
        {/if}
      </div>

      <div class="flex items-end gap-3">
        <Input
          id="cat-color"
          label="Color"
          name="color"
          bind:value={editColor}
          placeholder="#3B82F6"
        />
        {#if editColor}
          <div
            class="mb-0.5 size-10 shrink-0 rounded border border-foreground/10"
            style="background:{editColor}"
          ></div>
        {/if}
      </div>
    </div>

    {#snippet footer()}
      <div class="flex items-center justify-between gap-3">
        <div>
          {#if !isNew}
            <Button
              variant={deleteConfirm ? "danger" : "outline"}
              intent="compact"
              onclick={confirmDelete}
            >{deleteConfirm ? "Confirm delete" : "Delete"}</Button>
          {/if}
        </div>

        <div class="flex gap-3">
          <Button variant="outline" intent="compact" onclick={closeDrawer}>Cancel</Button>
          <Button intent="compact" onclick={save} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    {/snippet}
  </Drawer>
</div>
