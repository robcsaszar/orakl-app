<script lang="ts">
  import { invalidate } from "$app/navigation";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Link from "$lib/components/ui/Link.svelte";
  import PlayerRow from "$lib/components/ui/PlayerRow.svelte";
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

  function age(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
</script>

<Metatags title="Lobbies" description="Every live lobby on this machine." />

<div class="flex flex-col gap-8 py-8">
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div class="flex flex-col gap-2">
      <h1 class="text-lg font-semibold">Lobbies</h1>
      <p class="text-foreground-darker font-sans max-w-prose">
        Every live lobby on this machine. Read-only.
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
              <Badge variant="status">{lobby.phase.replaceAll("_", " ")}</Badge>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span class="text-foreground-darker font-sans">
                {plural(lobby.playerCount, "player")} · {plural(lobby.observerCount, "observer")} ·
                open {age(lobby.ageSeconds)}
              </span>
              <Button
                variant="ghost"
                intent="compact"
                aria-expanded={open === lobby.code}
                onclick={() => (open = open === lobby.code ? null : lobby.code)}
              >
                {open === lobby.code ? "Hide roster" : "Roster"}
              </Button>
            </div>
            {#if open === lobby.code}
              <ul class="flex flex-col gap-2">
                {#each lobby.roster as member, i (i)}
                  <li>
                    <PlayerRow nickname={member.nickname}>
                      {#snippet actions()}
                        <span class="flex flex-wrap items-center gap-1">
                          {#if member.curator}
                            <Badge variant="host">curator</Badge>
                          {/if}
                          <Badge variant={member.role === "observer" ? "observer" : "pill"}>
                            {member.role}
                          </Badge>
                          <Badge variant="status" tone={STATUS_TONE[member.status]}>
                            {member.status}
                          </Badge>
                          <Badge variant="status">{member.signedIn ? "signed in" : "guest"}</Badge>
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
