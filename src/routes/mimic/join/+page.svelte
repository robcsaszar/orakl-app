<script lang="ts">
  import { page } from "$app/state";
  import { JOIN_ERROR_COPY, setQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import { MockQuizSession } from "@/lib/svelte/mockQuizSession.svelte.js";
  import { toast } from "@/lib/toast.js";
  import JoinPage from "@/routes/(game)/join/JoinPage.svelte";

  const session = new MockQuizSession();
  setQuizSession(session);

  // `?joinerr=blocked|device|full|failed` drives the error the join page
  // shows (its own key — `state` belongs to the play fixtures). The full-lobby
  // notice is an info toast in production, fired once per entry into `full`.
  let toasted: string | null = null;
  $effect(() => {
    const state = page.url.searchParams.get("joinerr");
    if (state === "blocked") {
      session.error = JOIN_ERROR_COPY.device_blocked;
    } else if (state === "device") {
      session.error = JOIN_ERROR_COPY.device_in_lobby;
    } else if (state === "failed") {
      session.error = JOIN_ERROR_COPY.failed;
    } else if (state === "full") {
      session.error = "";
      if (toasted !== "full") toast.info(JOIN_ERROR_COPY.lobby_full);
    } else {
      session.error = "";
    }
    toasted = state;
  });
</script>

<JoinPage />
