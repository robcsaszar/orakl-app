<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { createSoloModeStore } from "@/lib/soloMode.store.js";
  import { getNativeAuthToken } from "@/lib/native-auth.js";
  import { setSoloSession } from "@/lib/svelte/soloSession.svelte.js";
  import { isSoloPhaseRoute, routeForSoloPhase } from "@/lib/solo-routes.js";
  import {
    headerActionState,
    registerHeaderActions,
  } from "@/lib/header-action-state.svelte.js";
  import type { Snippet } from "svelte";

  let {
    data,
    children,
  }: { data: import("./$types").LayoutData; children: Snippet } = $props();

  // Created once; survives navigation across /solo/*
  // svelte-ignore state_referenced_locally
  let session = $state(
    createSoloModeStore(
      data.categoryDataJson,
      data.profileAvatarSrc,
      data.isGuest,
      data.userId,
      getNativeAuthToken,
    ),
  );
  setSoloSession(session);

  let initialized = $state(false);

  $effect(() => {
    headerActionState.phase = session.phase;
    return registerHeaderActions(headerActionState, {
      endRound: () => session.endRound(),
    });
  });

  $effect(() => {
    if (!initialized) return;
    // Only the phase-owned pages auto-redirect; side pages (e.g. the
    // leaderboard) are visited intentionally and must not be bounced.
    if (!isSoloPhaseRoute(page.url.pathname)) return;
    // Landing on setup while a finished game's results are still cached is
    // exactly "start a new game" — reset instead of bouncing back to the
    // stale results screen (a "playing" phase still protects an in-flight
    // game by redirecting to /solo/play as usual).
    if (page.url.pathname === "/solo/setup" && session.phase === "result") {
      session.playAgain();
      return;
    }
    const target = routeForSoloPhase(session.phase);
    if (page.url.pathname !== target) goto(target);
  });

  onMount(() => {
    session.init();
    initialized = true;
  });

  onDestroy(() => session.destroy());

  function handleKeyDown(e: KeyboardEvent) {
    session.handleKeyDown(e);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      session.onTabBlur?.();
    } else {
      session.onTabFocus?.();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />
<svelte:document onvisibilitychange={handleVisibilityChange} />
{@render children()}
