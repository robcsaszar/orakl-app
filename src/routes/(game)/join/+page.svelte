<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { goto, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { QuizSession, setQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import { toast } from "@/lib/toast.js";
  import JoinPage from "./JoinPage.svelte";

  let { data } = $props();

  const session = new QuizSession();
  setQuizSession(session);

  // An active lobby (detected on load or via the status stream) advances to setup.
  $effect(() => {
    if (session.phase !== null) {
      const code = session.lobbyCode ? `?code=${encodeURIComponent(session.lobbyCode)}` : "";
      goto(`/quiz/setup${code}`);
    }
  });

  onMount(() => {
    session.initCodeEntry();
    if (data.lobbyEnded) {
      toast.info("That lobby has ended.");
      // Said once: a refresh must not repeat it. Deferred past the router's
      // start-up, which completes right after the first mount.
      setTimeout(() => replaceState("/join", page.state), 0);
    }
  });
  onDestroy(() => session.destroy());
</script>

<JoinPage />
