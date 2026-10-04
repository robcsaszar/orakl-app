<script lang="ts">
import { findPlayer } from "@orakl/shared";
  import { getQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import {
    headerActionState,
    registerHeaderActions,
  } from "@/lib/header-action-state.svelte.js";
  
  import { storage } from "@/lib/storage.js";
  import { getNpcForLobby } from "@/lib/npcs.js";
  import QRCode from "qrcode";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import PlayerRow from "$lib/components/ui/PlayerRow.svelte";
  import IdentityCard from "../../IdentityCard.svelte";
  import LobbyRoster from "./LobbyRoster.svelte";
  import { toast } from "@/lib/toast.js";

  const session = getQuizSession();
  const isCurator = $derived(session.isCurator);
  // qrcode takes hex only; this is the background token's hex twin.
  const QR_DARK = "#0d0c16";

  const isInviteOnly = $derived(session.lobbyAccessMode === "invite-only");
  const maxPlayers = $derived(session.lobbyMaxPlayers);
  // Seats the join cap counts (game-store joinPlayer): active or pending
  // heroes, the curator's own row exempt.
  const seatCount = $derived(
    session.players.filter(
      (p) => (p.status === "active" || p.status === "pending") && p.role !== "observer" && !p.isCurator,
    ).length,
  );

  const me = $derived(findPlayer(session.players, session.playerId));
  const soloNpc = $derived(getNpcForLobby(session.lobbyCode || session.playerId || ""));
  // A non-participating curator ("NPC") isn't a peer the way a regular
  // observer is — hidden from everyone else's roster, not just absent from
  // scoring. Only the curator's own view (isCurator branch above) shows
  // their Host/Observer row.
  // Pending join requests are the curator's to vet, so a player sees admitted peers only.
  const others = $derived(
    session.players.filter(
      (p) =>
        p.id !== session.playerId &&
        p.status !== "pending" &&
        !(p.isCurator && p.role === "observer"),
    ),
  );
  // Curator's own roster shows every other player, pending approvals aside —
  // no hiding a non-participating curator observer from themselves.
  const curatorOthers = $derived(
    session.players.filter((p) => p.id !== session.playerId && p.status !== "pending"),
  );

  // ── Curator-only: lobby code / join link / QR (ADR 0019 route unification) ──
  // `location` is a browser global — this derived also runs during SSR, so
  // guard it (matches the origin-less empty string until hydration).
  const joinUrl = $derived(
    session.lobbyCode && typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${encodeURIComponent(session.lobbyCode)}`
      : "",
  );
  let qrCodeUrl = $state("");
  let shareButtonText = $state("Share");
  let startTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      width: 192,
      margin: 1,
      color: { dark: QR_DARK, light: "#00000000" },
    })
      .then((url) => {
        qrCodeUrl = url;
      })
      .catch(() => {});
  });

  const pendingPlayers = $derived(session.players.filter((p) => p.status === "pending"));
  const connectedHeroes = $derived(
    session.players.filter((p) => p.status === "active" && p.role !== "observer"),
  );
  const canStartGame = $derived(connectedHeroes.length > 0);
  const noHeroesWarning = $derived(
    session.players.some((p) => p.status === "active") && connectedHeroes.length === 0,
  );
  const startButtonText = $derived(
    connectedHeroes.length > 0
      ? "Start quiz"
      : noHeroesWarning
        ? "At least one player required"
        : "Waiting for players…",
  );

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${session.quizName}`,
          text: `Join my quiz: ${session.quizName}`,
          url: joinUrl,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(joinUrl);
      shareButtonText = "Copied";
    } catch {
      shareButtonText = "Copy failed";
    }
    setTimeout(() => {
      shareButtonText = "Share";
    }, 2000);
  }

  function startGame() {
    let config: ReturnType<typeof JSON.parse> = null;
    try {
      config = JSON.parse(storage.getQuizConfig() ?? "null");
    } catch {
      config = null;
    }
    if (!config) {
      toast.error("Couldn't read the quiz setup. Go back and create the quiz again.");
      return;
    }
    if (session.isStarting) return;
    session.startGame({
      categoryIds: config.categoryIds,
      timerDuration: config.timer,
      questionsPerRound: config.questionsPerRound,
      advanceMode: config.advanceMode,
      ...(config.scoringMode ? { scoringMode: config.scoringMode } : {}),
      ...(config.difficulty ? { difficulty: config.difficulty } : {}),
    });
    // Safety net: game:start (phase-effect navigation) or game:error should
    // arrive well within this window; if neither does, don't strand the
    // curator on a spinning button.
    if (startTimer) clearTimeout(startTimer);
    startTimer = setTimeout(() => {
      if (!session.isStarting) return;
      session.isStarting = false;
      startTimer = null;
      toast.error("Couldn't start the quiz. Check your connection and try again.");
    }, 8000);
  }

  $effect(() => {
    return () => {
      if (startTimer) clearTimeout(startTimer);
    };
  });

  // ── Curator-only: persist an inline rename (LobbyRoster owns the edit UI state) ──
  async function saveNickname(playerId: string, nickname: string) {
    try {
      const res = await fetch("/api/lobby/player", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, nickname }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update nickname");
      }
    } catch {
      toast.error("Failed to update nickname");
    }
  }

  // Lobby liveness is resolved server-side by the layout load (redirects to /join
  // when the lobby is gone) and by the lobby:ended frame — no client probe needed.

  let disconnectToastId: string | number | undefined;

  $effect(() => {
    if (session.isDisconnected) {
      disconnectToastId = toast.warning("Disconnected. Trying to reconnect...", { duration: Infinity });
    } else if (disconnectToastId !== undefined) {
      toast.dismiss(disconnectToastId);
      disconnectToastId = undefined;
    }
    return () => {
      if (disconnectToastId !== undefined) toast.dismiss(disconnectToastId);
    };
  });

  $effect(() => {
    if (isCurator) return;
    return registerHeaderActions(headerActionState, {
      leaveLobby: () => void session.leaveLobby(),
    });
  });

  $effect(() => {
    if (!isCurator) return;
    return registerHeaderActions(headerActionState, {
      endLobby: () => session.closeLobby(),
    });
  });
</script>

<svelte:head><title>Lobby — Orakl</title></svelte:head>

{#if isCurator}
  <!-- Curator lobby management (ADR 0019 route unification) — same route as
       any player's waiting room, plus hosting controls. -->
  <div class="flex flex-col gap-1">
  <p class="text-base font-semibold text-foreground-darker">Hosting</p>
  {#if session.quizName}
    <div class="flex flex-col gap-3">
      <h1 class="text-4xl font-bold">{session.quizName}</h1>
      {#if session.description}<p class="text-foreground-darker">{session.description}</p>{/if}
      {#if session.lobbyCategories.length > 0}
        <div class="text-sm font-sans text-foreground-darker/70">
          <div class="flex flex-wrap items-center gap-2">
            <span>Categories:</span>
            <span class="font-bold">{session.lobbyCategories.length} selected</span>
          </div>
          {#if session.lobbyDifficulty}
            <div class="flex flex-wrap items-center gap-2">
              <span>Difficulty:</span>
              <span class="font-bold">{session.lobbyDifficulty}</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
  </div>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card class="self-start">
        {#if session.lobbyCode}
          <div class="flex flex-col gap-2 items-start" role="group" aria-labelledby="lobby-code-legend">
            <h2 class="text-base font-semibold" id="lobby-code-legend">Lobby code</h2>
            <p class="select-all font-sans text-4xl font-bold text-foreground bg-background py-2 px-4 rounded-2xl corner-shape-squircle">
              {session.lobbyCode}
            </p>
          </div>
        {/if}
      </Card>
      <Card variant="rooftop" class="self-start">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <h2 class="text-base font-semibold">Join link</h2>
            <p class="select-all break-all font-sans text-sm text-background-lighter/75">{joinUrl}</p>
          </div>
          {#if qrCodeUrl}
            <div class="flex self-center items-center justify-center">
              <img src={qrCodeUrl} alt="QR code for join link" class="h-auto w-48" />
            </div>
          {/if}
          <Button variant="secondary" class="self-stretch border-2 border-current" onclick={handleShare}>
            {shareButtonText}
          </Button>
        </div>
      </Card>
    </div>

    {#if pendingPlayers.length > 0}
      <Card variant="warning">
        <h2 class="mb-2 text-base font-semibold text-warning">
          Awaiting approval ({pendingPlayers.length})
        </h2>
        <ul class="flex flex-col gap-2">
          {#each pendingPlayers as player (player.id)}
            <li>
              <PlayerRow nickname={player.nickname} avatarSrc={session.getAvatarSrc(player.avatar) || undefined}>
                {#snippet badge()}
                  <span class="size-2 rounded-full bg-warning" aria-hidden="true"></span>
                {/snippet}
                {#snippet actions()}
                  <Button
                    variant="success"
                    intent="compact"
                    onclick={() => session.approvePlayer(player.id)}
                    aria-label="Approve {player.nickname}">Approve</Button
                  >
                  <Button
                    variant="danger"
                    intent="compact"
                    onclick={() => session.rejectPendingPlayer(player.id)}
                    aria-label="Reject {player.nickname}">Reject</Button
                  >
                {/snippet}
              </PlayerRow>
            </li>
          {/each}
        </ul>
      </Card>
    {/if}

    <div class="flex flex-col gap-2">
      <h2 class="text-base font-semibold">Players</h2>
      <LobbyRoster curator={true} {session} {me} others={curatorOthers} onSaveNickname={saveNickname} />
      {#if curatorOthers.length === 0}
        <p class="text-foreground-darker">No players yet. Share the join link to invite players.</p>
      {/if}
    </div>
  </div>

  <div class="flex flex-col gap-3">
    {#if session.isReconnecting}
      <p class="text-center text-sm text-secondary-300 animate-pulse" role="status" aria-live="polite">
        Reconnecting…
      </p>
    {/if}
    {#if noHeroesWarning}
      <p class="text-center text-sm text-warning">At least one player is required to start</p>
    {/if}
    <Button
      variant="primary"
      intent="cta"
      onclick={startGame}
      disabled={!canStartGame || session.isStarting}
      class="self-end"
    >
      {session.isStarting ? "Starting…" : startButtonText}
    </Button>
  </div>
{:else}
  <!-- Header info -->
  <div class="flex flex-col gap-1">
    <p class="text-base font-semibold text-foreground-darker">Joined</p>
    {#if session.quizName}
      <div class="flex flex-col gap-3">
        <h1 class="text-4xl font-bold">{session.quizName}</h1>
        {#if session.description}<p class="text-foreground-darker">{session.description}</p>{/if}
        {#if session.lobbyCategories.length > 0}
          <div class="text-sm font-sans text-foreground-darker/70">
            <div class="flex flex-wrap items-center gap-2">
              <span>Categories:</span>
              <span class="font-bold">{session.lobbyCategories.length} selected</span>
            </div>
            {#if session.lobbyDifficulty}
              <div class="flex flex-wrap items-center gap-2">
                <span>Difficulty:</span>
                <span class="font-bold">{session.lobbyDifficulty}</span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
    {#if isInviteOnly || maxPlayers !== null}
      <div class="flex items-center gap-3 mt-1 flex-wrap">
        {#if isInviteOnly}
          <Badge variant="pill">Invite only</Badge>
        {/if}
        {#if maxPlayers !== null}
          <span class="text-sm text-foreground-darker">{seatCount}/{maxPlayers} players</span>
        {/if}
      </div>
    {/if}
  </div>

  <IdentityCard />

  <!-- Players list -->
  <div class="flex flex-col gap-2">
    <LobbyRoster curator={false} {session} {me} {others} {soloNpc} />
  </div>
{/if}
