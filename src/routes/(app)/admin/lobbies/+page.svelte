<script lang="ts">
  import { getAvatarSrc } from "@orakl/shared";
  import { tick } from "svelte";
  import { invalidate } from "$app/navigation";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import PlayerRow from "$lib/components/ui/PlayerRow.svelte";
  import { toast } from "$lib/toast";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let open = $state<string | null>(null);
  let refreshing = $state(false);

  const STATUS_TONE = {
    active: "success",
    pending: "warning",
    disconnected: "danger",
  } as const;

  async function refresh() {
    refreshing = true;
    try {
      await invalidate("app:admin-lobbies");
    } finally {
      refreshing = false;
    }
  }

  // The tab opens inside the click, before the mint answers: a window opened
  // after an await is a popup the browser may block.
  async function watch(code: string) {
    const tab = window.open("", "_blank");
    try {
      const res = await fetch(
        `/api/admin/lobbies/display-token?code=${encodeURIComponent(code)}`,
        { method: "POST" },
      );
      const body = res.ok ? ((await res.json()) as { url?: string }) : null;
      if (!body?.url) throw new Error("mint refused");
      if (!tab) {
        // Blocked: a second open after the await would be blocked too, so the
        // link waits for a fresh click.
        const url = body.url;
        toast.info("The browser blocked the new tab.", {
          action: {
            label: "Open display",
            onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
          },
        });
        return;
      }
      tab.opener = null;
      tab.location.href = body.url;
    } catch {
      tab?.close();
      toast.error("Could not open the display. Refresh and try again.");
    }
  }

  async function close(code: string) {
    try {
      const res = await fetch(
        `/api/admin/lobbies/close?code=${encodeURIComponent(code)}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Could not close the lobby. Refresh and try again.");
        return;
      }
      toast.success("Lobby closed.");
      await invalidate("app:admin-lobbies");
    } catch {
      toast.error("Could not close the lobby. Refresh and try again.");
    }
  }

  // Roster rows with a request in flight, keyed `<code>:<playerId>`: their
  // controls stay disabled so a double click acts once.
  let busy = $state<string[]>([]);
  const isBusy = (code: string, playerId: string) => busy.includes(`${code}:${playerId}`);

  async function removePlayer(
    code: string,
    member: { playerId: string; nickname: string },
    action: "remove" | "block",
  ) {
    const failure = "Could not remove the player. Refresh and try again.";
    const key = `${code}:${member.playerId}`;
    if (busy.includes(key)) return;
    busy = [...busy, key];
    try {
      const res = await fetch(
        `/api/admin/lobbies/${action}?code=${encodeURIComponent(code)}`,
        { method: "POST", body: JSON.stringify({ playerId: member.playerId }) },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? failure);
        return;
      }
      toast.success(
        action === "block"
          ? `${member.nickname} removed and blocked.`
          : `${member.nickname} removed.`,
      );
      await invalidate("app:admin-lobbies");
    } catch {
      toast.error(failure);
    } finally {
      busy = busy.filter((k) => k !== key);
    }
  }

  const RUNNING = ["playing", "round_results", "intermission"];

  // A Lobby's game controls share one key, `<code>:game`, in `busy`.
  async function gameAction(
    code: string,
    path: "stop" | "intermission",
    action: "start" | "end" | null,
    success: string,
  ) {
    const failure = "Could not change the game. Refresh and try again.";
    const key = `${code}:game`;
    if (busy.includes(key)) return;
    busy = [...busy, key];
    try {
      const res = await fetch(
        `/api/admin/lobbies/${path}?code=${encodeURIComponent(code)}`,
        action ? { method: "POST", body: JSON.stringify({ action }) } : { method: "POST" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? failure);
        await invalidate("app:admin-lobbies");
        return;
      }
      toast.success(success);
      await invalidate("app:admin-lobbies");
    } catch {
      toast.error(failure);
    } finally {
      busy = busy.filter((k) => k !== key);
    }
  }

  // One rename editor open at a time, keyed by Lobby code and player id.
  let editing = $state<{ code: string; playerId: string } | null>(null);
  let editValue = $state("");
  let editInputRef = $state<HTMLInputElement | HTMLTextAreaElement | null>(null);

  $effect(() => {
    if (editing) editInputRef?.focus();
  });

  // Found by player id, not nickname: a nickname may hold quotes, and a
  // rename changes the label.
  async function returnFocusToRename(playerId: string) {
    await tick();
    document
      .querySelector<HTMLButtonElement>(`[data-rename-player="${playerId}"]`)
      ?.focus();
  }

  function cancelRename(playerId: string) {
    editing = null;
    returnFocusToRename(playerId);
  }

  function startRename(code: string, member: { playerId: string; nickname: string }) {
    editing = { code, playerId: member.playerId };
    editValue = member.nickname;
  }

  async function saveRename(code: string, playerId: string) {
    const failure = "Could not rename the player. Refresh and try again.";
    const key = `${code}:${playerId}`;
    if (busy.includes(key)) return;
    const nickname = editValue;
    busy = [...busy, key];
    try {
      const res = await fetch(
        `/api/admin/lobbies/rename?code=${encodeURIComponent(code)}`,
        { method: "POST", body: JSON.stringify({ playerId, nickname }) },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? failure);
        return;
      }
      toast.success(`Renamed to ${nickname}.`);
      editing = null;
      returnFocusToRename(playerId);
      await invalidate("app:admin-lobbies");
    } catch {
      toast.error(failure);
    } finally {
      busy = busy.filter((k) => k !== key);
    }
  }

  function age(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  const sentence = (text: string) => {
    const spaced = text.replaceAll("_", " ");
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
</script>

<Metatags title="Lobbies" description="Every live lobby on this machine." />

<div class="flex flex-col gap-8 py-8">
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div class="flex flex-col gap-2">
      <h1 class="text-lg font-semibold">Lobbies</h1>
      <p class="text-foreground-darker font-sans max-w-prose">
        Every live lobby on this machine.
      </p>
    </div>
    <Button variant="outline" intent="compact" disabled={refreshing} onclick={refresh}>
      Refresh
    </Button>
  </header>

  {#if data.lobbies.length === 0}
    <Card variant="default">
      <p class="text-foreground-darker font-sans text-sm">No live lobbies.</p>
    </Card>
  {:else}
    <ul class="flex flex-col gap-4">
      {#each data.lobbies as lobby (lobby.code)}
        <li>
          <Card variant="default" class="gap-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 flex-col gap-1">
                <span class="font-mono text-lg font-semibold">{lobby.code}</span>
                <span class="flex flex-wrap items-baseline gap-x-2 text-sm">
                  {#if lobby.curator.accountId}
                    <Link href="/admin/users">
                      {lobby.curator.nickname ?? "No nickname"}
                    </Link>
                    <span class="font-mono text-xs text-foreground-darker break-all">
                      {lobby.curator.accountId}
                    </span>
                  {:else}
                    <span class="text-foreground-darker">No curator account</span>
                  {/if}
                </span>
              </div>
              <Badge variant="status">{sentence(lobby.phase)}</Badge>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span class="text-foreground-darker font-sans">
                {plural(lobby.playerCount, "player")} · {plural(lobby.observerCount, "observer")} ·
                open {age(lobby.ageSeconds)}
              </span>
              <span class="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  intent="compact"
                  class="min-h-11"
                  aria-label={`Watch ${lobby.code}`}
                  onclick={() => watch(lobby.code)}
                >
                  Watch
                </Button>
                <Button
                  variant="ghost"
                  intent="compact"
                  class="min-h-11"
                  aria-expanded={open === lobby.code}
                  onclick={() => (open = open === lobby.code ? null : lobby.code)}
                >
                  {open === lobby.code ? "Hide roster" : "Roster"}
                </Button>
                <ConfirmButton
                  label="Close"
                  ariaLabel={`Close ${lobby.code}`}
                  confirmLabel="Close this lobby?"
                  confirmAriaLabel={`Click again to close ${lobby.code}`}
                  variant="outline"
                  confirmVariant="danger"
                  onConfirm={() => close(lobby.code)}
                >
                  {#snippet icon()}{/snippet}
                  {#snippet confirmIcon()}{/snippet}
                </ConfirmButton>
              </span>
            </div>
            {#if RUNNING.includes(lobby.phase)}
              <div class="flex flex-wrap items-center justify-end gap-2 text-sm">
                {#if lobby.phase === "intermission"}
                  <Button
                    variant="ghost"
                    intent="compact"
                    class="min-h-11"
                    aria-label={`End intermission ${lobby.code}`}
                    disabled={isBusy(lobby.code, "game")}
                    onclick={() =>
                      gameAction(lobby.code, "intermission", "end", "Intermission ended.")}
                  >
                    End intermission
                  </Button>
                {:else}
                  <Button
                    variant="ghost"
                    intent="compact"
                    class="min-h-11"
                    aria-label={`Start intermission ${lobby.code}`}
                    disabled={isBusy(lobby.code, "game")}
                    onclick={() =>
                      gameAction(lobby.code, "intermission", "start", "Intermission started.")}
                  >
                    Start intermission
                  </Button>
                {/if}
                <ConfirmButton
                  label="Stop game"
                  ariaLabel={`Stop game ${lobby.code}`}
                  confirmLabel="Stop the game?"
                  confirmAriaLabel={`Click again to stop game ${lobby.code}`}
                  variant="outline"
                  confirmVariant="neutral"
                  onConfirm={() => gameAction(lobby.code, "stop", null, "Game stopped.")}
                >
                  {#snippet icon()}{/snippet}
                  {#snippet confirmIcon()}{/snippet}
                </ConfirmButton>
              </div>
            {/if}
            {#if open === lobby.code}
              <ul class="flex flex-col gap-2">
                {#each lobby.roster as member (member.playerId)}
                  {#snippet nameEditor()}
                    <Input
                      type="text"
                      id="rename-{member.playerId}"
                      name="rename-{member.playerId}"
                      label=""
                      size="sm"
                      bind:inputRef={editInputRef}
                      bind:value={editValue}
                      maxlength={20}
                      aria-label={`New nickname for ${member.nickname}`}
                      onkeydown={(e) => {
                        if (e.key === "Enter") saveRename(lobby.code, member.playerId);
                        if (e.key === "Escape") cancelRename(member.playerId);
                      }}
                    />
                  {/snippet}
                  <li>
                    <PlayerRow
                      nickname={member.nickname}
                      avatarSrc={getAvatarSrc(member.avatarId, data.avatars) || undefined}
                      name={editing?.code === lobby.code && editing.playerId === member.playerId
                        ? nameEditor
                        : undefined}
                    >
                      {#snippet actions()}
                        <span class="flex flex-wrap items-center gap-1">
                          {#if member.curator}
                            <Badge variant="host">Curator</Badge>
                          {/if}
                          <Badge variant={member.role === "observer" ? "observer" : "pill"}>
                            {sentence(member.role)}
                          </Badge>
                          <Badge variant="status" tone={STATUS_TONE[member.status]}>
                            {sentence(member.status)}
                          </Badge>
                          <Badge variant="status">{member.signedIn ? "Signed in" : "Guest"}</Badge>
                          <span class="flex items-center gap-1">
                            {#if editing?.code === lobby.code && editing.playerId === member.playerId}
                              <Button
                                variant="ghost"
                                intent="icon"
                                onclick={() => saveRename(lobby.code, member.playerId)}
                                disabled={isBusy(lobby.code, member.playerId)}
                                aria-label={`Save nickname for ${member.nickname}`}
                                class="hover:text-success-light hover:bg-success"
                              >
                                <Icon name="check" class="size-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                intent="icon"
                                onclick={() => cancelRename(member.playerId)}
                                aria-label={`Cancel rename for ${member.nickname}`}
                                class="hover:text-danger-light hover:bg-danger"
                              >
                                <Icon name="x" class="size-5" />
                              </Button>
                            {:else}
                              {#if !member.curator}
                                <Button
                                  variant="ghost"
                                  intent="icon"
                                  onclick={() => removePlayer(lobby.code, member, "remove")}
                                  disabled={isBusy(lobby.code, member.playerId)}
                                  aria-label={`Remove ${member.nickname}`}
                                  class="hover:text-danger-light hover:bg-danger"
                                >
                                  <Icon name="close" class="size-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  intent="icon"
                                  onclick={() => removePlayer(lobby.code, member, "block")}
                                  disabled={isBusy(lobby.code, member.playerId)}
                                  aria-label={`Remove and block ${member.nickname}`}
                                  class="hover:text-danger-light hover:bg-danger"
                                >
                                  <Icon name="ban" class="size-5" />
                                </Button>
                              {/if}
                              <Button
                                variant="ghost"
                                intent="icon"
                                onclick={() => startRename(lobby.code, member)}
                                aria-label={`Rename ${member.nickname}`}
                                data-rename-player={member.playerId}
                              >
                                <Icon name="edit" class="size-5" />
                              </Button>
                            {/if}
                          </span>
                        </span>
                      {/snippet}
                    </PlayerRow>
                  </li>
                {:else}
                  <li class="text-foreground-darker text-sm">Empty roster.</li>
                {/each}
              </ul>
            {/if}
          </Card>
        </li>
      {/each}
    </ul>
  {/if}
</div>
