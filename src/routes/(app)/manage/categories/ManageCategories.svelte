<script lang="ts">
  import Drawer from "$lib/components/ui/Drawer.svelte";
  import type { Category, Season, Tag } from "@orakl/protocol";
  import Input from "$lib/components/ui/Input.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import { toast } from "@/lib/toast.js";
  import Switch from "$lib/components/ui/Switch.svelte";
  import CheckboxOption from "$lib/components/ui/CheckboxOption.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import { formatDateShort } from "@/lib/format.js";
  import { isInWindow, nextOpening } from "@/lib/season-window.js";

  let {
    initial,
    tags: initialTags,
    seasons: initialSeasons,
  }: { initial: Category[]; tags: Tag[]; seasons: Season[] } = $props();

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

  // Writable derived, same as `categories`.
  let tags = $derived<Tag[]>(initialTags);
  let newTagName = $state("");
  let renamingId = $state<string | null>(null);
  let renameValue = $state("");
  let tagBusy = $state(false);

  /** Sends one tag request; resolves with the parsed body, or null after a toast on refusal. */
  async function tagRequest(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    tagBusy = true;
    try {
      const res = await fetch(
        method === "DELETE"
          ? `/api/manage/tags?id=${encodeURIComponent(String(body.id))}`
          : "/api/manage/tags",
        method === "DELETE"
          ? { method }
          : {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
      );
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        toast.error((data.error as string | undefined) ?? `HTTP ${res.status}`);
        return null;
      }
      return data;
    } catch {
      toast.error("Network error. Try again.");
      return null;
    } finally {
      tagBusy = false;
    }
  }

  async function addTag() {
    const name = newTagName.trim();
    if (!name) return;
    const data = await tagRequest("POST", { name });
    if (!data) return;
    tags = [...tags, data.tag as Tag].sort((a, b) => a.name.localeCompare(b.name));
    newTagName = "";
  }

  function startRename(tag: Tag) {
    renamingId = tag.id;
    renameValue = tag.name;
  }

  async function saveRename() {
    const name = renameValue.trim();
    if (!renamingId || !name) return;
    const data = await tagRequest("PATCH", { id: renamingId, name });
    if (!data) return;
    const renamed = data.tag as Tag;
    tags = tags
      .map((t) => (t.id === renamed.id ? renamed : t))
      .sort((a, b) => a.name.localeCompare(b.name));
    renamingId = null;
  }

  async function removeTag(tag: Tag) {
    const data = await tagRequest("DELETE", { id: tag.id });
    if (!data) return;
    tags = tags.filter((t) => t.id !== tag.id);
  }

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
    }
  }
  // ── Seasons ──
  const SEASON_DRAWER_ID = "edit-season-drawer";
  const POOL_DEBOUNCE_MS = 300;

  // Writable derived, same as `categories`.
  let seasons = $derived<Season[]>(initialSeasons);
  let seasonSelected = $state<Season | null>(null);
  let seasonName = $state("");
  let seasonDescription = $state("");
  let seasonIcon = $state("");
  let seasonColor = $state("");
  let seasonCategoryIds = $state<string[]>([]);
  let seasonTagNames = $state<string[]>([]);
  let seasonYearly = $state(true);
  let seasonStart = $state("");
  let seasonEnd = $state("");
  let seasonSaving = $state(false);
  let poolCount = $state<number | null>(null);
  let poolFailed = $state(false);
  let seasonNameError = $state("");
  let seasonWindowError = $state("");

  function toggleIn(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  // Pool size follows the member lists; the server resolves it, never the client.
  let poolSeq = 0;
  $effect(() => {
    const body = JSON.stringify({
      category_ids: seasonCategoryIds,
      tag_names: seasonTagNames,
    });
    poolCount = null;
    poolFailed = false;
    const timer = setTimeout(async () => {
      const seq = ++poolSeq;
      try {
        const res = await fetch("/api/manage/seasons/pool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!res.ok) {
          if (seq === poolSeq) poolFailed = true;
          return;
        }
        const { count } = (await res.json()) as { count: number };
        if (seq === poolSeq) poolCount = count;
      } catch {
        if (seq === poolSeq) poolFailed = true;
      }
    }, POOL_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      poolSeq++;
    };
  });

  function openSeason(season: Season | null) {
    seasonSelected = season;
    seasonName = season?.name ?? "";
    seasonDescription = season?.description ?? "";
    seasonIcon = season?.icon ?? "";
    seasonColor = season?.color ?? "";
    seasonCategoryIds = season ? [...season.category_ids] : [];
    seasonTagNames = season ? [...season.tag_names] : [];
    seasonYearly = season?.repeats_yearly ?? true;
    seasonStart = season?.window_start ?? "";
    seasonEnd = season?.window_end ?? "";
    seasonSaving = false;
    poolCount = season?.pool_size ?? null;
    poolFailed = false;
    seasonNameError = "";
    seasonWindowError = "";
    window.dispatchEvent(new CustomEvent("drawer:open", { detail: { id: SEASON_DRAWER_ID } }));
  }

  function closeSeasonDrawer() {
    window.dispatchEvent(new CustomEvent("drawer:close", { detail: { id: SEASON_DRAWER_ID } }));
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTH_DAY = /^\d{2}-\d{2}$/;

  /** `MM-DD` as "15 Oct"; anything else unchanged. */
  function monthDayText(md: string): string {
    if (!MONTH_DAY.test(md)) return md;
    return `${Number(md.slice(3))} ${MONTHS[Number(md.slice(0, 2)) - 1] ?? md.slice(0, 2)}`;
  }

  /** Switches the window between yearly `MM-DD` and dated `YYYY-MM-DD`, keeping the days. */
  function setYearly(on: boolean) {
    if (on === seasonYearly) return;
    seasonYearly = on;
    seasonWindowError = "";
    if (on) {
      seasonStart = seasonStart.slice(5);
      seasonEnd = seasonEnd.slice(5);
      return;
    }
    if (!MONTH_DAY.test(seasonStart)) {
      seasonStart = "";
      seasonEnd = "";
      return;
    }
    const opening = nextOpening(
      { repeats_yearly: true, window_start: seasonStart, window_end: seasonEnd },
      new Date(),
    );
    if (!opening) return;
    const year = Number(opening.slice(0, 4));
    const endYear = MONTH_DAY.test(seasonEnd) && seasonEnd < seasonStart ? year + 1 : year;
    seasonStart = opening;
    seasonEnd = MONTH_DAY.test(seasonEnd) ? `${endYear}-${seasonEnd}` : "";
  }

  /** The window as admin-facing text. */
  function windowText(s: Season): string {
    return s.repeats_yearly
      ? `Every year ${monthDayText(s.window_start)} to ${monthDayText(s.window_end)}`
      : `${formatDateShort(s.window_start)} to ${formatDateShort(s.window_end)}`;
  }

  /** "In season", or when the window opens next; a finished dated window says "Ended". */
  function statusText(s: Season): string {
    if (isInWindow(s)) return "In season";
    const next = nextOpening(s, new Date());
    return next ? `Opens ${formatDateShort(next)}` : "Ended";
  }

  function statusTone(s: Season): "success" | "primary" | "neutral" {
    if (isInWindow(s)) return "success";
    return nextOpening(s, new Date()) ? "primary" : "neutral";
  }

  async function saveSeason() {
    const name = seasonName.trim();
    seasonNameError = "";
    seasonWindowError = "";
    if (!name) {
      seasonNameError = "Name is required";
      toast.error(seasonNameError);
      return;
    }
    seasonSaving = true;
    try {
      const body: Record<string, unknown> = {
        name,
        description: seasonDescription.trim() || null,
        icon: seasonIcon.trim() || null,
        color: seasonColor.trim() || null,
        repeats_yearly: seasonYearly,
        window_start: seasonStart.trim(),
        window_end: seasonEnd.trim(),
        category_ids: seasonCategoryIds,
        tag_names: seasonTagNames,
      };
      if (seasonSelected) body.id = seasonSelected.id;
      const res = await fetch("/api/manage/seasons", {
        method: seasonSelected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        season?: Season;
        error?: string;
      };
      if (!res.ok || !data.season) {
        const message = data.error ?? `HTTP ${res.status}`;
        if (/window|date|day|start|end/i.test(message)) seasonWindowError = message;
        toast.error(message);
        return;
      }
      const saved = data.season;
      seasons = (seasonSelected
        ? seasons.map((s) => (s.id === saved.id ? saved : s))
        : [...seasons, saved]
      ).sort((a, b) => a.name.localeCompare(b.name));
      closeSeasonDrawer();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      seasonSaving = false;
    }
  }

  async function removeSeason(season: Season) {
    try {
      const res = await fetch(`/api/manage/seasons?id=${encodeURIComponent(season.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? `HTTP ${res.status}`);
        return;
      }
      seasons = seasons.filter((s) => s.id !== season.id);
    } catch {
      toast.error("Network error. Try again.");
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

  <!-- Tags -->
  <section class="mt-10 flex flex-col gap-4">
    <h2 class="text-base font-semibold">Tags</h2>
    {#if tags.length === 0}
      <p class="text-sm text-foreground-darker">No tags yet.</p>
    {/if}
    <ul class="flex flex-col gap-2">
      {#each tags as tag (tag.id)}
        <li>
          <Card padding="sm" class="flex flex-row flex-wrap items-center gap-3">
          {#if renamingId === tag.id}
            <form
              class="flex flex-1 flex-wrap items-end gap-3"
              onsubmit={(e) => {
                e.preventDefault();
                saveRename();
              }}
            >
              <div class="min-w-48 flex-1">
                <Input
                  id="rename-tag-{tag.id}"
                  label="Tag name"
                  name="rename-tag"
                  bind:value={renameValue}
                  onkeydown={(e: KeyboardEvent) => {
                    if (e.key === "Escape") renamingId = null;
                  }}
                />
              </div>
              <Button type="submit" intent="compact" disabled={tagBusy}>Save</Button>
              <Button variant="outline" intent="compact" onclick={() => (renamingId = null)}>Cancel</Button>
            </form>
          {:else}
            <span class="flex-1 text-sm font-semibold">{tag.name}</span>
            <span class="text-xs text-foreground-darker">
              {tag.question_count} {tag.question_count === 1 ? "question" : "questions"}
            </span>
            <Button variant="outline" intent="compact" onclick={() => startRename(tag)}>Rename</Button>
            <ConfirmButton
              label="Delete"
              ariaLabel="Delete tag {tag.name}"
              confirmLabel="Delete tag?"
              variant="outline"
              onConfirm={() => removeTag(tag)}
            >
              {#snippet icon()}<Icon name="x" />{/snippet}
              {#snippet confirmIcon()}<Icon name="check" />{/snippet}
            </ConfirmButton>
          {/if}
          </Card>
        </li>
      {/each}
    </ul>
    <form
      class="flex flex-wrap items-end gap-3"
      onsubmit={(e) => {
        e.preventDefault();
        addTag();
      }}
    >
      <div class="min-w-48 flex-1">
        <Input id="new-tag" label="New tag" name="new-tag" bind:value={newTagName} placeholder="e.g. Halloween" />
      </div>
      <Button type="submit" intent="compact" disabled={tagBusy}>Add tag</Button>
    </form>
  </section>

  <!-- Seasons -->
  <section class="mt-10 flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-base font-semibold">Seasons</h2>
      <Button intent="compact" onclick={() => openSeason(null)}>Add season</Button>
    </div>
    {#if seasons.length === 0}
      <p class="text-sm text-foreground-darker">No seasons yet.</p>
    {/if}
    <ul class="flex flex-col gap-2">
      {#each seasons as season (season.id)}
        <li>
          <Card padding="sm" class="flex flex-row flex-wrap items-center gap-3 overflow-hidden">
          <div class="-mx-2 -mt-2 h-1.5 w-[calc(100%+1rem)]" style={season.color ? `background:${season.color}` : ""}></div>
          {#if season.icon}
            <img src={season.icon} alt="{season.name} icon" class="size-6 rounded object-contain" />
          {/if}
          <span class="flex-1 text-sm font-semibold">{season.name}</span>
          <span class="text-xs text-foreground-darker">{windowText(season)}</span>
          <Badge variant="status" tone={statusTone(season)}>{statusText(season)}</Badge>
          <span class="text-xs text-foreground-darker">
            {season.pool_size} {season.pool_size === 1 ? "question" : "questions"}
          </span>
          <Button variant="outline" intent="compact" onclick={() => openSeason(season)}>Edit</Button>
          <ConfirmButton
            label="Delete"
            ariaLabel="Delete season {season.name}"
            confirmLabel="Delete season?"
            variant="outline"
            onConfirm={() => removeSeason(season)}
          >
            {#snippet icon()}<Icon name="x" />{/snippet}
            {#snippet confirmIcon()}<Icon name="check" />{/snippet}
          </ConfirmButton>
          </Card>
        </li>
      {/each}
    </ul>
  </section>

  <!-- Season drawer -->
  <Drawer id={SEASON_DRAWER_ID}>
    {#snippet title()}
      {seasonSelected ? "Edit season" : "Add season"}
    {/snippet}

    <div class="flex flex-col gap-5">
      <Input id="season-name" label="Name" name="season-name" bind:value={seasonName} placeholder="Season name" error={seasonNameError} />

      <Input
        id="season-description"
        label="Description"
        name="season-description"
        type="textarea"
        rows={3}
        bind:value={seasonDescription}
        placeholder="Optional description"
      />

      <div class="flex items-end gap-3">
        <Input id="season-icon" label="Icon URL" name="season-icon" bind:value={seasonIcon} placeholder="https://…" />
        {#if seasonIcon}
          <img
            src={seasonIcon}
            alt="Icon preview"
            class="mb-0.5 size-10 shrink-0 rounded border border-foreground/10 bg-background-lighter object-contain"
          />
        {/if}
      </div>

      <div class="flex items-end gap-3">
        <Input id="season-color" label="Color" name="season-color" bind:value={seasonColor} placeholder="#3B82F6" />
        {#if seasonColor}
          <div
            class="mb-0.5 size-10 shrink-0 rounded border border-foreground/10"
            style="background:{seasonColor}"
          ></div>
        {/if}
      </div>

      <div class="flex flex-col gap-2" role="group" aria-labelledby="season-categories-label">
        <span id="season-categories-label" class="text-lg">Categories</span>
        <div class="flex flex-col gap-2">
          {#each categories as cat (cat.id)}
            <CheckboxOption
              id="season-cat-{cat.id}"
              name="season-category"
              value={cat.id}
              checked={seasonCategoryIds.includes(cat.id)}
              onchange={() => (seasonCategoryIds = toggleIn(seasonCategoryIds, cat.id))}
            >
              {cat.name}
            </CheckboxOption>
          {/each}
        </div>
      </div>

      {#if tags.length > 0}
        <div class="flex flex-col gap-2" role="group" aria-labelledby="season-tags-label">
          <span id="season-tags-label" class="text-lg">Tags</span>
          <div class="flex flex-wrap gap-2">
            {#each tags as tag (tag.id)}
              {@const on = seasonTagNames.includes(tag.name)}
              <Button
                variant={on ? "primary" : "outline"}
                intent="compact"
                aria-pressed={on}
                onclick={() => (seasonTagNames = toggleIn(seasonTagNames, tag.name))}
              >
                {tag.name}
              </Button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="flex items-center gap-3">
        <!-- The visible text is a second target for the same switch, hidden from
             assistive tech so the Switch beside it stays the one accessible control. -->
        <button
          type="button"
          tabindex="-1"
          aria-hidden="true"
          class="cursor-pointer select-none text-lg"
          onclick={() => setYearly(!seasonYearly)}
        >Repeats yearly</button>
        <Switch label="Repeats yearly" checked={seasonYearly} onchange={setYearly} />
      </div>

      <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <Input
          id="season-start"
          label={seasonYearly ? "From (MM-DD)" : "From"}
          name="window_start"
          type={seasonYearly ? "text" : "date"}
          bind:value={seasonStart}
          placeholder={seasonYearly ? "10-15" : undefined}
          error={seasonWindowError}
        />
        <Input
          id="season-end"
          label={seasonYearly ? "To (MM-DD)" : "To"}
          name="window_end"
          type={seasonYearly ? "text" : "date"}
          bind:value={seasonEnd}
          placeholder={seasonYearly ? "11-01" : undefined}
        />
      </div>
      <p class="text-xs text-foreground-darker">
        {seasonYearly
          ? "Every year, inclusive. An end before the start wraps the year."
          : "From the start day to the end day, inclusive."}
      </p>

      <p class="text-sm" aria-live="polite">
        {#if poolFailed}
          Pool size unavailable
        {:else}
          {poolCount === null ? "…" : poolCount} {poolCount === 1 ? "question" : "questions"} in this season
        {/if}
      </p>
    </div>

    {#snippet footer()}
      <div class="flex justify-end gap-3">
        <Button variant="outline" intent="compact" onclick={closeSeasonDrawer}>Cancel</Button>
        <Button intent="compact" onclick={saveSeason} disabled={seasonSaving}>
          {seasonSaving ? "Saving…" : seasonSelected ? "Save" : "Create"}
        </Button>
      </div>
    {/snippet}
  </Drawer>

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
            <ConfirmButton
              label="Delete"
              ariaLabel="Delete category {selected?.name ?? ''}"
              confirmLabel="Delete category?"
              variant="outline"
              onConfirm={confirmDelete}
            >
              {#snippet icon()}<Icon name="x" />{/snippet}
              {#snippet confirmIcon()}<Icon name="check" />{/snippet}
            </ConfirmButton>
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
