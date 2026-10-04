<script lang="ts">
import { buildAvatarGroups } from "@orakl/shared";
  import { onDestroy, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { QuizSession, setQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import { journeyState, routeForPhase } from "@orakl/shared";
  import { headerActionState } from "@/lib/header-action-state.svelte.js";
  
  import QuizAvatarDialog from "../QuizAvatarDialog.svelte";
  import CuratorToolboxFab from "./CuratorToolboxFab.svelte";
  import CuratorToolboxDrawer from "./CuratorToolboxDrawer.svelte";
  import { registerToolboxRail } from "./toolbox-rail.svelte.js";
  import Card from "$lib/components/ui/Card.svelte";
  import type { Snippet } from "svelte";
  import { toast } from "@/lib/toast.js";

  let {
    data,
    children,
  }: {
    data: import("./$types").LayoutData;
    children: Snippet;
  } = $props();

  const session = new QuizSession();
  setQuizSession(session);

  // Seed once from the server-resolved journey so the client doesn't bounce to
  // /join before init() restores the live session; the server owns phase/membership
  // thereafter (these reads run at component init and don't track `data`).
  // svelte-ignore state_referenced_locally
  const { membership, phase, lobby, avatars, emotesEnabled, playerId, isCurator } =
    data;
  session.membership = membership;
  session.phase = phase;
  session.emotesEnabled = emotesEnabled;
  session.isCurator = isCurator;

  // Toolbox is the curator's only bespoke UI (ADR 0019 route unification) —
  // every other view is the same page a normal player gets. Not shown on the
  // lobby page, which already has its own inline management UI.
  const showToolbox = $derived(isCurator && page.url.pathname !== "/quiz/lobby");
  const pendingCount = $derived(
    session.players.filter((p) => p.status === "pending").length,
  );

  // Desktop rail renders from the (game) layout, beside `main`; hand it the
  // session for exactly as long as the toolbox is shown.
  $effect(() => {
    if (showToolbox) return registerToolboxRail(session);
  });

  // Pre-seed avatars from server data so the picker is ready immediately,
  // without waiting for the client-side fetch in init().
  if (avatars?.length) {
    session.dbAvatars = avatars;
    session.avatarGroups = buildAvatarGroups(avatars);
  }

  // Seed lobby code from URL (?code=) so connect() has it even before init()
  // restores from storage. Covers QR-code deep links and the join→setup redirect.
  const codeFromUrl = page.url.searchParams.get("code");
  if (codeFromUrl) session.lobbyCode = codeFromUrl.trim().toLowerCase();

  // Seed lobby meta (name/description/categories/difficulty) for pre-join pages;
  // The lobby stream keeps it fresh once joined.
  if (lobby) {
    session.quizName = lobby.quizName;
    session.description = lobby.description;
    session.lobbyCategories = lobby.categories;
    session.lobbyDifficulty = lobby.difficulty;
  }

  // SSR roster + identity seed (LOBBY-1) — first paint shows the roster before
  // the first `lobby:update` frame, which then replaces players wholesale.
  session.seedLobbyRoster({
    playerId,
    players: lobby?.players,
    accessMode: lobby?.accessMode,
    maxPlayers: lobby?.maxPlayers,
  });

  // Phase-derived navigation: the one place client routing happens (ADR 0004).
  $effect(() => {
    // Hold position while a transient overlay owns the screen. routeForPhase
    // reads membership + phase below, so the effect already tracks them.
    // A closed lobby holds only players: the curator's own client still
    // routes home through routeForPhase.
    if (
      session.isReconnecting ||
      session.wasRemoved ||
      session.connectionLost ||
      (!isCurator && session.lobbyClosed)
    )
      return;
    // The curator never sees role_selection (their own choice for the next
    // quiz is "Play along" on the create form, not this picker) — this is
    // the live, same-session transition once "New quiz" starts it, so it
    // can't rely on a fresh server resolveJourney() re-running (mirrors
    // resolvePlayerJourney's curator branch, quiz-journey.ts). With role
    // selection off, or after "Reset to setup", `lobby:reset` drops phase to
    // lobby and curatorEditing sends the curator to edit the quiz instead.
    const target =
      isCurator && (session.phase === "role_selection" || session.curatorEditing)
        ? "/curator/create"
        : routeForPhase(
            isCurator ? "curator" : "player",
            session.membership,
            session.phase,
          );
    if (page.url.pathname !== target) goto(target);
  });

  // Bridges the live journey state (membership + phase folded together —
  // covers "pending"/"setup" pre-join states, not just live game phases) up
  // to AppHeader (page-config.ts's showWhenPhase gates), which renders
  // outside this layout's subtree — see header-action-state.svelte.ts.
  $effect(() => {
    headerActionState.phase = journeyState(session.membership, session.phase);
  });

  let reconnectingToastId: string | number | undefined;

  $effect(() => {
    if (session.isReconnecting) {
      reconnectingToastId = toast.loading("Reconnecting... Restoring your session.", { duration: Infinity });
    } else if (reconnectingToastId !== undefined) {
      toast.dismiss(reconnectingToastId);
      reconnectingToastId = undefined;
    }
    return () => {
      if (reconnectingToastId !== undefined) toast.dismiss(reconnectingToastId);
    };
  });

  $effect(() => {
    if (session.wasRemoved) {
      toast.error("You were removed from this session by the curator. Redirecting...", { duration: 3500 });
    }
  });

  // Single renderer for session.error (reconnect-ownership 403 etc.): the
  // layout is where session.init() runs, so this covers every quiz page.
  $effect(() => {
    if (session.error) toast.error(session.error);
  });

  onMount(() => {
    session.init({
      isLoggedIn: data.isLoggedIn,
      profileAvatarId: data.profileAvatarId,
      playerId: data.playerId,
      isCurator: data.isCurator,
      curatorNickname: data.curatorNickname,
      curatorAvatarId: data.curatorAvatarId,
    });
  });

  onDestroy(() => session.destroy());

  // Redirect away after the "removed" notice has been shown.
  $effect(() => {
    if (session.wasRemoved) {
      const t = setTimeout(() => {
        window.location.href = "/join";
      }, 3000);
      return () => clearTimeout(t);
    }
  });

  // Curator ends the session (toolbox or home dismiss) — the /closed page is
  // the message itself, no toast/delay. Curator's own client isn't routed here.
  $effect(() => {
    if (session.lobbyClosed && !isCurator) {
      window.location.href = "/closed";
    }
  });

  // Curator hosts the next quiz ("New quiz" / "Reset to setup") — players
  // keep their seat; routeForPhase moves them to the waiting room.
  $effect(() => {
    if (session.curatorEditing && !isCurator) {
      toast.info("The curator is setting up the quiz.", { duration: 6000 });
    }
  });

  // Terminal connection loss: tell the player, then return them to code-entry
  // instead of leaving them stranded on a "Reconnecting…" overlay.
  $effect(() => {
    if (session.connectionLost) {
      toast.error(
        isCurator
          ? "Connection lost. Returning you to the create screen."
          : "Connection lost. Returning you to the join screen.",
        { duration: 3500 },
      );
      const t = setTimeout(() => {
        window.location.href = isCurator ? "/curator/create" : "/join";
      }, 3000);
      return () => clearTimeout(t);
    }
  });
</script>

<QuizAvatarDialog />

{@render children()}

{#if showToolbox}
  <CuratorToolboxFab {pendingCount} />
  <CuratorToolboxDrawer {session} />
{/if}
