<script lang="ts">
  import { untrack } from "svelte";
  import type { Snippet } from "svelte";
  import { setSoloSession } from "@/lib/svelte/soloSession.svelte.js";
  import type { SoloModeStore } from "@/lib/soloMode.store.js";

  const { session, children }: { session: SoloModeStore; children: Snippet } =
    $props();

  // Test-only context seam (mirrors LobbySessionHarness) so
  // solo-play-continue.test.ts can render (app)/solo/play/+page.svelte
  // outside its layout. `session` must already be a $state-wrapped store
  // (see reactiveSoloStore.svelte.ts) for mutations to reach the page.
  untrack(() => setSoloSession(session));
</script>

{@render children()}
