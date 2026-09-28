<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { QuizSession, setQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import JoinPage from "./JoinPage.svelte";

  const session = new QuizSession();
  setQuizSession(session);

  // An active lobby (detected on load or via the status stream) advances to setup.
  $effect(() => {
    if (session.phase !== null) {
      const code = session.lobbyCode ? `?code=${encodeURIComponent(session.lobbyCode)}` : "";
      goto(`/quiz/setup${code}`);
    }
  });

  onMount(() => session.initCodeEntry());
  onDestroy(() => session.destroy());
</script>

<JoinPage />
