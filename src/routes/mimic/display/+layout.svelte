<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { fixtureQuestion, fixtureCuratorPlayers, CORRECT_ANSWER_ID, PLACEHOLDER_IMG_DARK, PLACEHOLDER_IMG_LIGHT } from "@/lib/mock/fixtures.js";
  import {
    curatorStore,
    createCuratorStore,
    setPlayers,
    setQuestion,
    setRoundResult,
    setView,
  } from "@/lib/svelte/curatorStore.store.js";
  import type { CuratorQuestion } from "@/lib/svelte/curatorStore.store.js";
  import { splitMatchPair } from "@orakl/client-core";
  import type { Difficulty } from "data/game.settings.js";
  import { setDisplayMock } from "@/lib/svelte/mimicContext.svelte.js";

  let { children }: { children: Snippet } = $props();

  setDisplayMock();

  $effect(() => {
    const qtype = page.url.searchParams.get("qtype") ?? "text_choice";
    const paramState = page.url.searchParams.get("state") ?? "unanswered";
    const timer = Math.max(5, Math.min(60, parseInt(page.url.searchParams.get("timer") ?? "20", 10)));
    const playerCount = Math.max(1, Math.min(20, parseInt(page.url.searchParams.get("players") ?? "4", 10)));
    const pendingCount = Math.max(0, Math.min(playerCount, parseInt(page.url.searchParams.get("pending") ?? "0", 10)));
    const qtotal = Math.max(1, parseInt(page.url.searchParams.get("qtotal") ?? "5", 10));
    const qindex = Math.min(Math.max(0, parseInt(page.url.searchParams.get("qindex") ?? "0", 10)), qtotal - 1);
    const score = Math.max(0, parseInt(page.url.searchParams.get("score") ?? "0", 10));
    const qtext = page.url.searchParams.get("qtext") ?? "";
    const category = page.url.searchParams.get("category") ?? "";
    const difficulty = (page.url.searchParams.get("difficulty") ?? "medium") as Difficulty;
    const imgParam = page.url.searchParams.get("img") ?? "";
    const dview = page.url.searchParams.get("dview") ?? "waiting";

    const q = fixtureQuestion(qtype);
    if (qtext) q.text = qtext;
    if (category) q.categoryId = category;
    q.difficulty = difficulty;
    if (imgParam === "dark") { q.mediaUrl = PLACEHOLDER_IMG_DARK; q.mediaType = "image"; }
    else if (imgParam === "light") { q.mediaUrl = PLACEHOLDER_IMG_LIGHT; q.mediaType = "image"; }
    q.questionIndex = qindex;
    q.totalQuestions = qtotal;
    q.timeRemaining = timer;
    q.serverTs = Date.now();

    const aKeys = ["a1", "a2", "a3", "a4"] as const;
    for (let i = 0; i < q.answers.length; i++) {
      const override = page.url.searchParams.get(aKeys[i]);
      if (override !== null && override !== "") {
        q.answers[i] = { ...q.answers[i], text: override };
      }
    }
    if (qtype === "image_matching" && q.matchItems) {
      q.matchItems = {
        left:  q.answers.map((a) => splitMatchPair(a.text)[0]),
        right: q.answers.map((a) => splitMatchPair(a.text)[1] || "Missing pair"),
      };
    }

    let players = fixtureCuratorPlayers(playerCount);
    players[0] = { ...players[0], score };
    if (pendingCount > 0) {
      players = players.map((p, i) =>
        i >= playerCount - pendingCount ? { ...p, status: "pending" as const } : p,
      );
    }

    const showing = paramState === "correct" || paramState === "incorrect" || paramState === "timeout";

    const isMatch = qtype === "image_matching";
    const correctAnswerText = isMatch
      ? (q.answers.find((a) => a.id === CORRECT_ANSWER_ID)?.text ?? CORRECT_ANSWER_ID)
      : CORRECT_ANSWER_ID;
    const wrongAnswer = isMatch
      ? (q.answers.find((a) => a.id !== CORRECT_ANSWER_ID)?.text ?? "a2")
      : "a2";

    // Map dview to curatorStore view so DisplayReceiver can read it
    const storeView =
      dview === "final" ? "final-results" as const
      : dview === "question" ? "question" as const
      : "lobby" as const; // waiting

    let s = createCuratorStore();
    s = setPlayers(s, players);
    s = setQuestion(s, q as unknown as CuratorQuestion, timer);
    s = { ...s, timeRemaining: timer };
    s = setView(s, storeView);

    if (showing) {
      const playerAnswerMap: Record<string, string> = {};
      for (const [i, p] of players.entries()) {
        playerAnswerMap[p.id] = i % 5 < 3 ? correctAnswerText : wrongAnswer;
      }
      s = setRoundResult(s, correctAnswerText, playerAnswerMap, players);
      s = { ...s, answeredPlayerIds: new Set(Object.keys(playerAnswerMap)) };
    }

    curatorStore.set(s);
  });
</script>

{@render children()}
