<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { MockQuizSession } from "@/lib/svelte/mockQuizSession.svelte.js";
  import { setQuizSession } from "@/lib/svelte/quizSession.svelte.js";
  import CuratorToolboxFab from "@/routes/(game)/quiz/CuratorToolboxFab.svelte";
  import CuratorToolboxDrawer from "@/routes/(game)/quiz/CuratorToolboxDrawer.svelte";
  import { fixtureQuestion, fixturePlayersFromCast, CORRECT_ANSWER_ID, MOCK_PLAYER_ID, PLACEHOLDER_IMG_DARK, PLACEHOLDER_IMG_LIGHT } from "@/lib/mock/fixtures.js";
  import { parseCast, defaultCast } from "@/lib/mock/cast.js";
  import { resolveBotDistribution, assignBotAnswers } from "@/lib/mock/distribution.js";
  import { SELECTABLE_EMOTE_IDS } from "@/lib/emotes.js";
  import { headerActionState } from "@/lib/header-action-state.svelte.js";
  import { splitMatchPair } from "@orakl/client-core";
  import { GAME, type Difficulty } from "data/game.settings.js";

  let { children }: { children: Snippet } = $props();

  const session = new MockQuizSession();
  // MockQuizSession implements PlayerSessionView (ADR 0010) — no cast needed.
  setQuizSession(session);

  function seedFromParams(params: URLSearchParams) {
    const qtype = params.get("qtype") ?? "text_choice";
    const paramState = params.get("state") ?? "unanswered";
    const role = params.get("role") === "observer" ? "observer" : "player";
    const timer = Math.max(0, Math.min(60, parseInt(params.get("timer") ?? "20", 10)));
    const playerCount = Math.max(1, Math.min(10, parseInt(params.get("players") ?? "4", 10)));
    const intermission = params.get("intermission") === "1";
    const roleSubmitted = params.get("rsubmitted") === "1";
    const roleLocked = params.get("rlocked") === "1";
    const qtotal = Math.max(1, parseInt(params.get("qtotal") ?? "5", 10));
    const qindex = Math.min(Math.max(0, parseInt(params.get("qindex") ?? "0", 10)), qtotal - 1);
    const nickname = params.get("nickname") ?? "Dev Player";
    const scoreParam = Math.max(0, parseInt(params.get("score") ?? "0", 10));
    const streakParam = Math.max(0, parseInt(params.get("streak") ?? "0", 10));
    // Flourish preview (see DevToolbar's Flourish pills) — at most one of
    // these is set at a time, independent of `streak`, same as solo (no
    // life-spent — multiplayer has no lives).
    const streakLostParam = params.get("streaklost");
    const streakNearMissParam = params.get("streaknearmiss");
    const streakBestParam = params.get("streakbest");
    const qtext = params.get("qtext") ?? "";
    const category = params.get("category") ?? "";
    const difficulty = params.get("difficulty") ?? "";
    const imgParam = params.get("img") ?? "";
    const emotesEnabled = params.get("emotes") === "1";
    // Curator toolbox preview (ADR 0019 route unification) — layers over
    // whichever player/observer perspective is selected above; no separate
    // mimic route/session anymore.
    const curatorMode = params.get("curator") === "1";

    const question = fixtureQuestion(qtype);
    question.questionIndex = qindex;
    question.totalQuestions = qtotal;
    question.timeRemaining = timer;
    if (qtext) question.text = qtext;
    if (category) question.categoryId = category;
    if (difficulty) question.difficulty = difficulty as Difficulty;
    if (imgParam === "dark") { question.mediaUrl = PLACEHOLDER_IMG_DARK; question.mediaType = "image"; }
    else if (imgParam === "light") { question.mediaUrl = PLACEHOLDER_IMG_LIGHT; question.mediaType = "image"; }

    // Override individual answer texts
    const aKeys = ["a1", "a2", "a3", "a4"] as const;
    for (let i = 0; i < question.answers.length; i++) {
      const override = params.get(aKeys[i]);
      if (override !== null && override !== "") {
        question.answers[i] = { id: question.answers[i].id, text: override };
      }
    }
    // For image_matching, regenerate matchItems from the (possibly overridden) answer texts
    if (qtype === "image_matching" && question.matchItems) {
      question.matchItems = {
        left:  question.answers.map((a) => splitMatchPair(a.text)[0]),
        right: question.answers.map((a) => splitMatchPair(a.text)[1] || "Missing pair"),
      };
    }

    // Build players locally — never read back session.players inside this function.
    // Rows come from `?cast=` (nickname + role, capped at 20 by DevToolbar); no
    // param → the first `playerCount` MOCK_NAMES as players.
    const cast = parseCast(params.get("cast")) ?? defaultCast(playerCount);
    const newPlayers = fixturePlayersFromCast(cast);
    newPlayers[0] = {
      ...newPlayers[0],
      role: role === "observer" ? "observer" : "player",
      score: scoreParam,
      ...(curatorMode ? { isCurator: true as const } : {}),
    };

    const showing = paramState === "correct" || paramState === "incorrect" || paramState === "timeout";

    // For image_matching, correctAnswerId must be the pipe-delimited answer TEXT
    // (e.g. "Athens|Greece") so resolveMatchItemState can split it to highlight items.
    const isMatch = qtype === "image_matching";
    const correctAnswerText = isMatch
      ? (question.answers.find((a) => a.id === CORRECT_ANSWER_ID)?.text ?? CORRECT_ANSWER_ID)
      : CORRECT_ANSWER_ID;
    const [correctLeftItem, correctRightItem] = isMatch
      ? splitMatchPair(correctAnswerText)
      : ["", ""];
    const wrongRightItem = isMatch
      ? (question.matchItems?.right.find((r) => r !== correctRightItem) ?? "")
      : "";

    // Compute all mutable state values before touching session
    const localAnswered = paramState !== "unanswered";
    const localFeedback =
      paramState === "selected" ? "pending" as const
      : paramState === "correct" ? "correct" as const
      : paramState === "incorrect" ? "incorrect" as const
      : paramState === "timeout" ? "timeout" as const
      : "none" as const;
    const localSelectedId: string | null =
      paramState === "selected" || paramState === "correct"
        ? (isMatch ? correctAnswerText : CORRECT_ANSWER_ID)
      : paramState === "incorrect"
        ? (isMatch ? `${correctLeftItem}|${wrongRightItem}` : "a2")
      : null;

    // Apply all session state at once.
    // selectedLeftItem / selectedRightItem are NOT set here — the mimic play page
    // derives them directly from page.url.searchParams for reliable reactivity.
    session.answered = localAnswered;
    session.feedbackStatus = localFeedback;
    session.selectedAnswerId = localSelectedId;
    session.nickname = nickname;
    session.questionType = qtype;
    session.answers = question.answers;
    session.matchItems = question.matchItems ?? null;
    session.timerDuration = timer;
    session.isObserver = role === "observer";
    session.selectedRole = role;
    session.players = newPlayers;
    session.finalRoster = params.get("roster") === "empty" ? [] : newPlayers;
    session.isCurator = curatorMode;
    session.isIntermission = intermission;
    session.showingResult = showing;
    session.roleSubmitted = roleSubmitted;
    session.roleSelectionLocked = roleLocked;
    session.emotesEnabled = emotesEnabled;
    session.pickedEmotes = emotesEnabled ? SELECTABLE_EMOTE_IDS.slice(0, 5) : [];
    session.activeEmotes = [];
    // "+N points" cue — the round's gain on a correct answer. Adjustable via
    // `earned` so the IdentityPill prototypes can be checked against the
    // variable amounts time-based scoring produces (default 100).
    const earned = Math.max(0, parseInt(params.get("earned") ?? "100", 10));
    session.lastPointsEarned = paramState === "correct" ? earned : 0;
    // Next-question countdown ring — a static preview at the configured
    // delay's start value whenever the round is revealed.
    session.nextQuestionCountdown = showing ? session.nextQuestionCountdownTotal : 0;

    // Build playerAnswers from newPlayers + localSelectedId — no session reads.
    // Bots (all players but the mock player) are spread across answer slots via the
    // `dist` param (see DevToolbar's DISTRIBUTION sliders), so overlay states like
    // an even split or an all-on-one overflow can be previewed on demand.
    if (showing) {
      const answers: Record<string, string> = {};
      if (localSelectedId !== null) answers[MOCK_PLAYER_ID] = localSelectedId;
      // timeout (localSelectedId null): omit the player — they did not answer
      const bots = newPlayers.filter((p) => p.id !== MOCK_PLAYER_ID);
      if (isMatch) {
        for (const [i, p] of bots.entries()) {
          answers[p.id] = (i + 1) % 5 < 3 ? correctAnswerText : `${correctLeftItem}|${wrongRightItem}`;
        }
      } else {
        const slotValues = question.answers.map((a) => a.id);
        const counts = resolveBotDistribution(params.get("dist"), slotValues.length, bots.length);
        const assigned = assignBotAnswers(counts, slotValues);
        for (const [i, p] of bots.entries()) {
          const value = assigned[i];
          if (value !== undefined) answers[p.id] = value;
        }
      }
      session.playerAnswers = answers;
      session.answeredPlayerIds = new Set(Object.keys(answers));
      session.totalToAnswer = newPlayers.length;
      session.answeredCount = Object.keys(answers).length;
    } else {
      session.playerAnswers = {};
      // Toolbox roster preview: simulate partial answers pre-reveal.
      const answeredSoFar = newPlayers.slice(0, Math.floor(newPlayers.length * 0.6));
      session.answeredPlayerIds = new Set(answeredSoFar.map((p) => p.id));
      session.totalToAnswer = newPlayers.length;
      session.answeredCount = answeredSoFar.length;
    }

    // Image-matching selection state — written straight to the session's
    // selectedLeftItem/selectedRightItem $state fields (folded off gameStore,
    // which is retired — ADR 0010).
    const matchLeft: string | null =
      isMatch && paramState !== "unanswered" && paramState !== "timeout"
        ? correctLeftItem : null;
    const matchRight: string | null =
      isMatch && (paramState === "correct" || paramState === "selected")
        ? correctRightItem
      : isMatch && paramState === "incorrect"
        ? wrongRightItem
      : null;

    session.currentQuestion = question;
    session.timeRemaining = timer;
    session.correctAnswerId = showing ? correctAnswerText : "";
    session.selectedLeftItem = matchLeft;
    session.selectedRightItem = matchRight;

    session.streak = streakParam;
    // Each flourish kind's nonce lives in its own range so switching between
    // previews (including two of the same kind) always remounts the pop.
    if (streakLostParam !== null) {
      const value = Math.max(0, parseInt(streakLostParam, 10));
      session.streakFlourish = { kind: "loss", value };
      session.streakNonce = 1000 + value;
    } else if (streakNearMissParam !== null) {
      const value = Math.max(0, parseInt(streakNearMissParam, 10));
      session.streakFlourish = { kind: "near-miss", value };
      session.streakNonce = 2000 + value;
    } else if (streakBestParam !== null) {
      const value = Math.max(0, parseInt(streakBestParam, 10));
      session.streakFlourish = { kind: "best", value };
      session.streakNonce = 3000 + value;
    } else if (GAME.streak.steps.some((s) => s.threshold === streakParam)) {
      session.streakFlourish = { kind: "gain", value: streakParam };
      session.streakNonce = streakParam;
    } else {
      session.streakFlourish = null;
      session.streakNonce = streakParam;
    }
  }

  // Re-seed whenever URL params change (DevToolbar writes params via goto).
  // seedFromParams only reads `params` (passed as arg) and local variables —
  // never reads back from session.$state fields, preventing a reactive loop.
  $effect(() => {
    seedFromParams(page.url.searchParams);
  });

  const showToolbox = $derived(
    session.isCurator && page.url.pathname !== "/mimic/quiz/lobby",
  );

  // Mimic has no server-driven journey state — derive the header's phase gate
  // (page-config.ts's showWhenPhase) straight from the route being
  // previewed, so /mimic/quiz/lobby's "Edit quiz"/"End lobby" etc. preview
  // the same as the real page.
  const MIMIC_ROUTE_PHASE: Record<string, string> = {
    "/mimic/quiz/lobby": "lobby",
    "/mimic/quiz/play": "playing",
    "/mimic/quiz/roles": "role_selection",
    "/mimic/quiz/results": "final_scores",
  };
  $effect(() => {
    headerActionState.phase = MIMIC_ROUTE_PHASE[page.url.pathname] ?? null;
  });
</script>

{@render children()}

{#if showToolbox}
  <CuratorToolboxFab pendingCount={0} />
  <CuratorToolboxDrawer {session} />
{/if}
