<script lang="ts">
import { ROLE_HIERARCHY, parsePowerList, powerDescription } from "@orakl/shared";
import type { UserPower, UserRole } from "@orakl/shared";
  
  import type { UserSource } from "@orakl/protocol";
  
  import Input from "$lib/components/ui/Input.svelte";
  import Select from "$lib/components/ui/Select.svelte";
  import { toast } from "@/lib/toast.js";
  import { formatDateTimeEnGb } from "@/lib/format.js";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Checkbox from "$lib/components/ui/Checkbox.svelte";
  import ResponsiveOverlay from "$lib/components/ui/ResponsiveOverlay.svelte";
  import UsersTable, { type UserRow } from "./UsersTable.svelte";

  interface ApiUserListItem {
    id: string;
    email: string;
    role: UserRole;
    nickname: string | null;
    avatar: string | null;
    powers: string;
    created_at: string | null;
    admin_note: string | null;
    leaderboard_excluded: number;
    source: UserSource;
  }

  interface UserListItem extends ApiUserListItem {
    powerCount: number;
  }

  interface ListResult {
    users: ApiUserListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  interface CurationRequestWithUser {
    id: string;
    user_id: string;
    status: string;
    created_at: string;
    email: string;
    nickname: string | null;
  }

  interface RoleGrant {
    id: string;
    actor_email: string | null;
    old_role: string;
    new_role: string;
    note: string | null;
    granted_at: string;
  }

  interface PowerGrant {
    id: string;
    actor_id: string | null;
    actor_email: string | null;
    old_powers: string;
    new_powers: string;
    note: string | null;
    granted_at: string;
  }

  /** One line of the account's privilege history, role or power. */
  interface HistoryEntry {
    id: string;
    change: string;
    actor: string;
    note: string | null;
    granted_at: string;
  }

  let {
    initial,
    currentUserId,
    roles,
    allPowers,
    pendingRequests,
    leaderboards = false,
  }: {
    initial: ListResult;
    currentUserId: string;
    roles: string[];
    allPowers: UserPower[];
    pendingRequests: CurationRequestWithUser[];
    /** Whether the solo boards exist to be excluded from. */
    leaderboards?: boolean;
  } = $props();

  /**
   * Drops any name outside `UserPower`, so a row carrying one stays editable:
   * an undeclared name round-tripped into the PATCH body is refused by the
   * request schema, which would make that row unsaveable.
   */
  function parsePowers(raw: string): UserPower[] {
    try {
      return parsePowerList(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  function normalizeUser(u: ApiUserListItem): UserListItem {
    return { ...u, powerCount: parsePowers(u.powers).length };
  }

  // Writable deriveds: loadPage reassigns locally; reset to server truth when
  // the props refresh.
  let users = $derived<UserListItem[]>(initial.users.map(normalizeUser));
  let total = $derived(initial.total);
  let page = $derived(initial.page);
  let totalPages = $derived(initial.totalPages);
  const limit = $derived(initial.limit);
  let loading = $state(false);
  let localPendingRequests = $derived<CurationRequestWithUser[]>(pendingRequests);

  let search = $state("");
  let roleFilter = $state("");
  let pendingOnly = $state(false);

  let editingId = $state<string | null>(null);
  let editEmail = $state("");
  let editRole = $state<UserRole | "">("");
  let editPowers = $state<UserPower[]>([]);
  /** The powers list is long and getting longer, so it opens on request. */
  let powersOpen = $state(false);
  let editNote = $state("");
  let editLeaderboardExcluded = $state(false);
  let saving = $state(false);
  let grantHistory = $state<RoleGrant[]>([]);
  let powerHistory = $state<PowerGrant[]>([]);
  // The edited row's rank as the modal opened. When that row is the actor's
  // own, it is the ceiling the self-promotion rule measures against.
  let openedRole = $state<UserRole>("member");
  let historyLoading = $state(false);
  let grantHistoryError = $state("");

  const pendingSet = $derived(new Set(localPendingRequests.map((r) => r.user_id)));

  /** Editing your own account: the endpoint refuses raising your own rank. */
  const editingSelf = $derived(editingId === currentUserId);
  const cannotRaiseTo = (role: string) =>
    editingSelf && ROLE_HIERARCHY[role as UserRole] > ROLE_HIERARCHY[openedRole];
  /** What the row holds right now, in the order the list offers them — the
   *  draft, not the saved set, so the summary follows what you have ticked. */
  const grantedPowers = $derived(allPowers.filter((p) => editPowers.includes(p)));

  // Rows are server-paged; only decorate with the pending badge here.
  const gridRows = $derived<UserRow[]>(
    users.map((u) => ({ ...u, hasCurationRequest: pendingSet.has(u.id) })),
  );

  // ─── Server-driven paging/filtering ──────────────────────────────────────
  let reqToken = 0;
  let filterTimer: ReturnType<typeof setTimeout> | undefined;

  async function loadPage(targetPage = page) {
    const token = ++reqToken;
    loading = true;
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (pendingOnly) params.set("pending", "1");
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ListResult;
      if (token !== reqToken) return; // stale response — newer request in flight
      users = data.users.map(normalizeUser);
      total = data.total;
      page = data.page;
      totalPages = data.totalPages;
    } catch (e) {
      if (token === reqToken)
        toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      if (token === reqToken) loading = false;
    }
  }

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page || loading) return;
    loadPage(p);
  }

  // Reload page 1 when filters change (debounced; skips initial mount).
  let firstRun = true;
  $effect(() => {
    void search;
    void roleFilter;
    void pendingOnly;
    if (firstRun) {
      firstRun = false;
      return;
    }
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => loadPage(1), 250);
  });

  async function openEdit(u: UserRow) {
    editingId = u.id;
    editEmail = u.email;
    editRole = u.role as UserRole;
    editPowers = parsePowers(u.powers);
    powersOpen = false;
    openedRole = u.role as UserRole;
    editNote = u.admin_note ?? "";
    editLeaderboardExcluded = u.leaderboard_excluded === 1;
    grantHistory = [];
    powerHistory = [];
    grantHistoryError = "";
    historyLoading = true;
    try {
      const res = await fetch(`/api/admin/users/${u.id}/grants`);
      if (!res.ok) {
        grantHistoryError = `Failed to load history (${res.status})`;
      } else {
        const data = (await res.json()) as {
          grants: RoleGrant[];
          powerGrants: PowerGrant[];
        };
        grantHistory = data.grants ?? [];
        powerHistory = data.powerGrants ?? [];
      }
    } catch {
      grantHistoryError = "Failed to load grant history";
    } finally {
      historyLoading = false;
    }
  }

  function closeEdit() {
    editingId = null;
    grantHistory = [];
    powerHistory = [];
  }

  /** Powers are stored as a JSON array; show what moved, not two arrays. */
  function powerDiff(oldJson: string, newJson: string): string {
    const before = new Set(parsePowers(oldJson));
    const after = new Set(parsePowers(newJson));
    const added = [...after].filter((p) => !before.has(p)).map((p) => `+${p}`);
    const removed = [...before].filter((p) => !after.has(p)).map((p) => `−${p}`);
    return [...added, ...removed].join(" ");
  }

  const history = $derived<HistoryEntry[]>(
    [
      ...grantHistory.map((g) => ({
        id: g.id,
        change: `${g.old_role} → ${g.new_role}`,
        actor: g.actor_email ?? "unknown",
        note: g.note,
        granted_at: g.granted_at,
      })),
      ...powerHistory.map((g) => ({
        id: g.id,
        change: powerDiff(g.old_powers, g.new_powers),
        // A NULL actor is a cutover seed, not a missing name.
        actor: g.actor_id === null ? "system" : (g.actor_email ?? "unknown"),
        note: g.note,
        granted_at: g.granted_at,
      })),
    ].sort((a, b) => b.granted_at.localeCompare(a.granted_at)),
  );

  function togglePower(power: UserPower) {
    if (editPowers.includes(power)) {
      editPowers = editPowers.filter((p) => p !== power);
    } else {
      editPowers = [...editPowers, power];
    }
  }

  async function saveEdit() {
    if (!editingId) return;
    saving = true;
    try {
      const body: Record<string, unknown> = {
        id: editingId,
        role: editRole,
        powers: editPowers,
        note: editNote.trim(),
        leaderboardExcluded: editLeaderboardExcluded,
      };
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const elevated =
        !!editRole &&
        ROLE_HIERARCHY[editRole as UserRole] >= ROLE_HIERARCHY.curator;
      const idx = users.findIndex((u) => u.id === editingId);
      if (idx !== -1) {
        users[idx] = {
          ...users[idx],
          role: editRole as UserRole,
          powers: JSON.stringify(editPowers),
          powerCount: editPowers.length,
          admin_note: editNote.trim() || null,
          leaderboard_excluded: editLeaderboardExcluded ? 1 : 0,
        };
      }
      if (elevated) {
        localPendingRequests = localPendingRequests.filter(
          (r) => r.user_id !== editingId,
        );
      }
      // If the edit makes the row no longer match an active server filter
      // (role changed away from the role filter, or elevated out of the
      // curation-requests view), refetch so it drops off — stepping back a
      // page when it was the last row, mirroring the delete flow.
      const refetch =
        (!!roleFilter && editRole !== roleFilter) || (pendingOnly && elevated);
      const targetPage =
        refetch && users.length === 1 && page > 1 ? page - 1 : page;
      closeEdit();
      if (refetch) await loadPage(targetPage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      saving = false;
    }
  }

  let pendingDelete = $state<UserRow | null>(null);
  let deleting = $state(false);

  function confirmDelete(u: UserRow) {
    if (u.id === currentUserId) return;
    pendingDelete = u;
  }

  async function deleteUser() {
    const u = pendingDelete;
    if (!u || deleting) return;
    deleting = true;
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(u.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      // Refetch to keep totals/pages accurate; step back if the page emptied.
      const lastOnPage = users.length === 1 && page > 1;
      await loadPage(lastOnPage ? page - 1 : page);
      pendingDelete = null;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      deleting = false;
    }
  }
</script>

<div>
  <!-- Filters -->
  <div class="mb-4 flex flex-wrap items-end gap-3">
    <div class="min-w-48 flex-1">
      <Input
        id="user-search"
        label="Search"
        name="search"
        bind:value={search}
        placeholder="Email, nickname, or note"
      />
    </div>
    <div class="flex flex-col">
      <Select id="role-filter" label="Role" name="role-filter" bind:value={roleFilter} class="text-sm">
        <option value="">All roles</option>
        {#each roles as r}
          <option value={r}>{r}</option>
        {/each}
      </Select>
    </div>
    <div class="flex flex-col justify-end pb-1">
      <Checkbox id="pending-only" label="Curation requests only" bind:checked={pendingOnly} />
    </div>
    <span class="self-end pb-1.5 text-xs text-foreground-darker/60">
      {#if loading}Loading…{:else}{total} {total === 1 ? "user" : "users"}{/if}
    </span>
  </div>

  <!-- Table -->
  <UsersTable
    rows={gridRows}
    {leaderboards}
    {currentUserId}
    onedit={openEdit}
    ondelete={confirmDelete}
    pageSize={limit}
    {page}
    {total}
    onPageChange={goToPage}
    busy={loading}
    empty={search.trim() || roleFilter || pendingOnly
      ? "No accounts match these filters."
      : "No accounts yet."}
  />

  <!-- Edit modal -->
  {#if editingId}
    <ResponsiveOverlay
      id="admin-user-editor"
      open={!!editingId}
      hasTitle={true}
      panelClass="lg:max-w-[36rem]"
      bodyClass="flex flex-col gap-5"
      onClose={closeEdit}
    >
      {#snippet title()}
        Edit user
      {/snippet}

      <Card variant="mezzanine" padding="sm" class="px-3 font-mono text-xs text-foreground-darker">
        {editEmail}
      </Card>

      <Select
        id="edit-role"
        label="Role"
        name="edit-role"
        bind:value={editRole}
        class="text-sm"
        description={editingSelf
          ? "Your own account: you can step down, not up."
          : undefined}
      >
        {#each roles as r}
          <option value={r} disabled={cannotRaiseTo(r)}>{r}</option>
        {/each}
      </Select>

      <Input
        id="edit-note"
        label="Note (optional)"
        name="note"
        bind:value={editNote}
        placeholder="e.g. pub league trial, friend of the house"
      />

      {#if leaderboards}
        <Checkbox
          id="edit-leaderboard-excluded"
          label="Exclude from leaderboards"
          description="Keeps this user's solo runs off the rankings. Their runs and scores are unaffected."
          bind:checked={editLeaderboardExcluded}
        />
      {/if}

      <div class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between gap-4">
          <p class="text-lg">Powers</p>
          <Button
            type="button"
            variant="ghost"
            intent="compact"
            class="self-start text-foreground-darker hover:text-foreground"
            onclick={() => (powersOpen = !powersOpen)}
            aria-expanded={powersOpen}
            aria-controls="powers-panel"
            iconAfter={powersOpen ? "chevron-up" : "chevron-down"}
          >
            {powersOpen ? "Hide" : "Show"}
          </Button>
        </div>

        <!-- Collapsed, the summary answers the question the section is usually
             opened for: what does this account already hold. -->
        <p
          id="powers-summary"
          class="text-sm text-foreground-darker"
          hidden={powersOpen}
        >
          {#if grantedPowers.length > 0}
            <span class="font-mono text-xs">{grantedPowers.join(", ")}</span>
          {:else}
            No powers granted.
          {/if}
        </p>

        <!-- Kept mounted rather than swapped in and out, so `aria-controls`
             above always names a live element. -->
        <div id="powers-panel" class="flex flex-col gap-2" hidden={!powersOpen}>
          <Card variant="mezzanine" padding="sm" class="gap-3">
            {#each allPowers as p}
              <Checkbox
                id="power-{p}"
                size="sm"
                label={p}
                description={powerDescription(p)}
                checked={editPowers.includes(p)}
                onchange={() => togglePower(p)}
              />
            {/each}
          </Card>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <p class="text-lg">Grant history</p>
        {#if historyLoading}
          <p class="text-xs text-foreground-darker">Loading…</p>
        {:else if grantHistoryError}
          <p class="text-xs text-red-400">{grantHistoryError}</p>
        {:else if history.length === 0}
          <p class="text-xs text-foreground-darker">No role or power changes recorded.</p>
        {:else}
          <Card variant="mezzanine" padding="sm" class="max-h-40 gap-1 overflow-y-auto">
            {#each history as h (h.id)}
              <div
                class="flex flex-col gap-0.5 border-b border-foreground/5 pb-1 text-xs last:border-0 last:pb-0"
              >
                <span class="font-mono text-foreground-darker">{h.change}</span>
                <span class="text-foreground-darker/70">
                  {formatDateTimeEnGb(h.granted_at)} by {h.actor}
                </span>
                {#if h.note}<span class="italic text-foreground-darker/70">{h.note}</span>{/if}
              </div>
            {/each}
          </Card>
        {/if}
      </div>

      {#snippet footer()}
        <div class="flex items-center justify-end gap-3">
          <Button variant="outline" intent="compact" onclick={closeEdit}>Cancel</Button>
          <Button intent="compact" onclick={saveEdit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      {/snippet}
    </ResponsiveOverlay>
  {/if}
</div>

<ResponsiveOverlay
  id="delete-user-dialog"
  open={pendingDelete !== null}
  hasTitle={true}
  onClose={() => (pendingDelete = null)}
>
  {#snippet title()}Delete user{/snippet}
  <p class="text-sm text-foreground-darker">
    Delete <span class="font-mono text-foreground">{pendingDelete?.email}</span>? Their account, powers, devices and private custom questions go with it; promoted questions stay in the shared bank, anonymised; their name is removed from past results, which stay as anonymised history. This cannot be undone.
  </p>
  {#snippet footer()}
    <div class="flex items-center justify-end gap-3">
      <Button variant="outline" intent="compact" onclick={() => (pendingDelete = null)}>Cancel</Button>
      <Button variant="danger" intent="compact" onclick={deleteUser} loading={deleting} disabled={deleting}>Delete</Button>
    </div>
  {/snippet}
</ResponsiveOverlay>
