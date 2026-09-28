<script lang="ts">
  import { untrack } from "svelte";
  import type { Snippet } from "svelte";
  import { setQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import type { MockQuizSession } from "@/lib/svelte/mockQuizSession.svelte.js";

  const { session, children }: { session: MockQuizSession; children: Snippet } = $props();

  // Test-only context seam (mirrors the (game)/quiz +layout.svelte pattern)
  // so LobbyPage.test.ts can render lobby/+page.svelte outside its layout.
  untrack(() => setQuizSession(session));
</script>

{@render children()}
