<script lang="ts">
import { computeBadges } from "@orakl/shared";
import type { BadgeAward } from "@orakl/shared";
  import type { Snippet } from "svelte";
  import { page } from "$app/state";
  import { createSoloModeStore } from "@/lib/soloMode.store.js";
  
  import { setSoloSession } from "@/lib/svelte/soloSession.svelte.js";
  import { GAME } from "data/game.settings.js";
  import type { TimerDuration } from "data/game.settings.js";
  import type { Difficulty } from "data/game.settings.js";
  import { fixtureQuizQuestion, FIXTURE_TOPICS_JSON, CORRECT_ANSWER_ID, PLACEHOLDER_IMG_DARK, PLACEHOLDER_IMG_LIGHT } from "@/lib/mock/fixtures.js";
  import { MOCK_BADGE_DETAIL } from "@/lib/mock/badge-detail.js";
  import { splitMatchPair } from "@orakl/client-core";
  import type { SoloFinalMessage } from "@orakl/protocol";

  let { children }: { children: Snippet } = $props();

  const FIXTURE_QUESTIONS = [
    { text: "What is the chemical symbol for gold?", correct: "Au", wrong: "Go", difficulty: "easy" },
    { text: "How many bones are in the adult human body?", correct: "206", wrong: "208", difficulty: "medium" },
    { text: "Which planet has the most moons?", correct: "Saturn", wrong: "Jupiter", difficulty: "medium" },
    { text: "What is the speed of light in km/s?", correct: "299,792", wrong: "186,000", difficulty: "hard" },
    { text: "Who wrote the Odyssey?", correct: "Homer", wrong: "Virgil", difficulty: "easy" },
  ];

  // Cycled for the `cats` param so category-breadth badges (specialist,
  // pantheon, master-of-none) are previewable.
  const MIMIC_CATEGORIES = ["science", "history", "geography", "art", "myth"];

  let session = $state(createSoloModeStore(FIXTURE_TOPICS_JSON, ""));
  setSoloSession(session);

  // Re-seed whenever URL params or pathname change.
  $effect(() => {
    if (page.url.pathname.endsWith("/results")) {
      // Badge-preview knobs (all optional). qtotal up to 30 so count-gated
      // badges are reachable. pace = how the answer clock is spent: fast
      // (no-hesitation/quick-draw), slow (clutch), or mixed. comeback puts the
      // miss first so a recovery streak forms (phoenix). cats = distinct
      // categories cycled (specialist/pantheon/master-of-none). timer feeds
      // rarity + the timing badges.
      const params = page.url.searchParams;
      const qtotal = Math.max(1, Math.min(30, parseInt(params.get("qtotal") ?? "5", 10)));
      const scoreParam = Math.max(0, Math.min(qtotal, parseInt(params.get("score") ?? "4", 10)));
      const isGuest = params.get("guest") === "1";
      const soloMode = (params.get("mode") ?? "normal") as "normal" | "endless";
      const streakParam = Math.max(0, parseInt(params.get("streak") ?? "2", 10));
      const tabAwayCount = Math.max(0, parseInt(params.get("away") ?? "0", 10));
      const timerSec = Math.max(5, Math.min(120, parseInt(params.get("timer") ?? "20", 10)));
      const timerDurationMs = timerSec * 1000;
      const pace = params.get("pace") ?? "fast";
      const comeback = params.get("comeback") === "1";
      const catCount = Math.max(1, Math.min(MIMIC_CATEGORIES.length, parseInt(params.get("cats") ?? "2", 10)));
      const difficulty = (params.get("difficulty") ?? "all") as
        | "all"
        | "easy"
        | "medium"
        | "hard";
      // `fastcount` drives the Wing-footed badge preview (number of answers that
      // beat most earlier solvers); blank = none.
      const fasterParam = params.get("fastcount");
      const fastAnswerCount = fasterParam === null || fasterParam === ""
        ? 0
        : Math.max(0, parseInt(fasterParam, 10) || 0);

      // One per-question model feeds both the review list and finalData.results.
      const model = Array.from({ length: qtotal }, (_, i) => {
        const q = FIXTURE_QUESTIONS[i % FIXTURE_QUESTIONS.length];
        // comeback: miss question 0, then run `score` correct (recovery streak);
        // otherwise the first `score` are correct and the rest wrong.
        const isCorrect = comeback ? i >= 1 && i <= scoreParam : i < scoreParam;
        const isTimeout =
          !params.has("notimeout") && !isCorrect && i === qtotal - 1;
        // Fraction of the clock spent before answering.
        const frac =
          pace === "slow"
            ? 0.92
            : pace === "mixed"
              ? 0.1 + (0.85 * i) / Math.max(1, qtotal - 1)
              : 0.1; // fast
        const timeToAnswerMs = isTimeout
          ? timerDurationMs
          : Math.round(frac * timerDurationMs);
        return { i, q, isCorrect, isTimeout, timeToAnswerMs, categoryId: MIMIC_CATEGORIES[i % catCount] };
      });

      const correctCount = model.filter((m) => m.isCorrect).length;
      const timeToAnswerAvgMs = model.length
        ? Math.round(model.reduce((s, m) => s + m.timeToAnswerMs, 0) / model.length)
        : 0;

      const results = model.map((m) => ({
        questionId: `mimic-q-${m.i}`,
        text: m.q.text,
        correct: m.isCorrect,
        selectedAnswer: m.isTimeout ? null : m.isCorrect ? m.q.correct : m.q.wrong,
        correctAnswer: m.q.correct,
        difficulty: m.q.difficulty,
      }));

      const finalResults = model.map((m) => ({
        questionId: `mimic-q-${m.i}`,
        questionText: m.q.text,
        categoryId: m.categoryId,
        isCorrect: m.isCorrect,
        selectedAnswerId: m.isTimeout ? null : m.isCorrect ? "a1" : "a2",
        correctAnswerId: "a1",
        timeToAnswerMs: m.timeToAnswerMs,
        alreadyFlagged: false,
      }));

      // Badges via the same pure function the server uses, so the preview
      // matches real runs (US #14, #23, #24). `badges` param (DevToolbar's
      // BADGES override) forces an exact set instead — stacking every
      // combination through the stat knobs above is impractical with 19
      // interacting thresholds.
      const forcedBadges = params.get("badges");
      const badges: BadgeAward[] = forcedBadges
        ? forcedBadges.split(",").filter(Boolean).map((id) => {
            const badgeId = id as BadgeAward["id"];
            return { id: badgeId, detail: MOCK_BADGE_DETAIL[badgeId] };
          })
        : computeBadges({
            context: { kind: "solo", mode: soloMode },
            difficulty,
            totalAnswered: qtotal,
            correctCount,
            tabAwayCount,
            maxStreak: streakParam,
            timerDurationMs,
            timeToAnswerAvgMs,
            fastAnswerCount,
            results: finalResults,
          });

      // Server-authoritative payload the new results sections read (per-category
      // accuracy, badges, playful takeaways, leaderboard eligibility, claim CTA).
      const finalData: SoloFinalMessage = {
        type: "solo:final",
        totalScore: correctCount * 100,
        totalAnswered: qtotal,
        correctCount,
        timeToAnswerAvgMs,
        maxStreak: streakParam,
        isLeaderboardEligible: !isGuest && soloMode !== "endless",
        isStreakEligible: !isGuest,
        // Captured-signal cues (US #23, #24): `away` = tab-blur count (default 0
        // → "unbroken focus"); timer drives the decisiveness percentage.
        tabAwayCount,
        timerDurationMs,
        claimId: isGuest ? "mimic-claim-id" : null,
        mode: soloMode,
        difficulty,
        badges,
        results: finalResults,
      };

      session.phase = "result";
      session.isGuest = isGuest;
      session.score = correctCount * 100;
      session.results = results;
      session.claimId = isGuest ? "mimic-claim-id" : null;
      session.finalData = finalData;
      return;
    }

    // Non-play side pages (setup, leaderboard, history) only need identity for
    // the guest CTA / claim links.
    const guest = page.url.searchParams.get("guest") === "1";
    session.isGuest = guest;
    session.claimId = guest ? "mimic-claim-id" : null;
    if (page.url.pathname.endsWith("/setup")) {
      session.phase = "setup";
      return;
    }
    if (!page.url.pathname.endsWith("/play")) return;

    const qtype = page.url.searchParams.get("qtype") ?? "text_choice";
    const paramState = page.url.searchParams.get("state") ?? "unanswered";
    const timer = Math.max(5, Math.min(60, parseInt(page.url.searchParams.get("timer") ?? "20", 10)));
    const qtotal = Math.max(1, parseInt(page.url.searchParams.get("qtotal") ?? "5", 10));
    const qindex = Math.min(Math.max(0, parseInt(page.url.searchParams.get("qindex") ?? "0", 10)), qtotal - 1);
    const scoreParam = Math.max(0, parseInt(page.url.searchParams.get("score") ?? "0", 10));
    const soloMode = (page.url.searchParams.get("mode") ?? "normal") as "normal" | "endless";
    const strikes = Math.min(3, Math.max(0, parseInt(page.url.searchParams.get("strikes") ?? "0", 10)));
    const streakParam = Math.max(0, parseInt(page.url.searchParams.get("streak") ?? "0", 10));
    // Flourish preview (see DevToolbar's FLOURISH buttons) — at most one of
    // these four params is set at a time, independent of `streak` so it stays
    // individually previewable.
    const streakLostParam = page.url.searchParams.get("streaklost");
    const streakNearMissParam = page.url.searchParams.get("streaknearmiss");
    const streakBestParam = page.url.searchParams.get("streakbest");
    const streakLifeParam = page.url.searchParams.get("streaklife");
    const qtext = page.url.searchParams.get("qtext") ?? "";
    const category = page.url.searchParams.get("category") ?? "";
    const difficulty = page.url.searchParams.get("difficulty") ?? "medium";
    const imgParam = page.url.searchParams.get("img") ?? "";

    const q = fixtureQuizQuestion(qtype);
    if (qtext) q.text = qtext;
    if (category) q.categoryId = category;
    if (difficulty) q.difficulty = difficulty as Difficulty;
    if (imgParam === "dark") { q.mediaUrl = PLACEHOLDER_IMG_DARK; q.mediaType = "image"; }
    else if (imgParam === "light") { q.mediaUrl = PLACEHOLDER_IMG_LIGHT; q.mediaType = "image"; }

    // Override individual answer texts
    const aKeys = ["a1", "a2", "a3", "a4"] as const;
    for (let i = 0; i < q.answers.length; i++) {
      const override = page.url.searchParams.get(aKeys[i]);
      if (override !== null && override !== "") {
        q.answers[i] = { ...q.answers[i], text: override };
      }
    }
    if (qtype === "image_matching" && q.type === "image_matching") {
      q.matchItems = {
        left:  q.answers.map((a) => splitMatchPair(a.text)[0]),
        right: q.answers.map((a) => splitMatchPair(a.text)[1] || "Missing pair"),
      };
    }

    const showing = paramState === "correct" || paramState === "incorrect" || paramState === "timeout";

    // For image_matching, correctAnswerId must be pipe-delimited item text so
    // resolveMatchItemState can split it and highlight the correct pair.
    const isMatch = qtype === "image_matching";
    const correctAnswerText = isMatch
      ? (q.answers.find((a) => a.id === CORRECT_ANSWER_ID)?.text ?? CORRECT_ANSWER_ID)
      : CORRECT_ANSWER_ID;
    const [correctLeftItem, correctRightItem] = isMatch
      ? splitMatchPair(correctAnswerText)
      : ["", ""];
    const wrongRightItem = isMatch && q.type === "image_matching"
      ? (q.matchItems.right.find((r: string) => r !== correctRightItem) ?? "")
      : "";

    // Compute all values before touching session
    const localSelectedId: string | null =
      paramState === "correct" || paramState === "selected"
        ? (isMatch ? correctAnswerText : CORRECT_ANSWER_ID)
      : paramState === "incorrect"
        ? (isMatch ? `${correctLeftItem}|${wrongRightItem}` : (q.answers[1]?.id ?? null))
      : null;
    const localLeftItem: string | null =
      isMatch && paramState !== "unanswered" && paramState !== "timeout"
        ? correctLeftItem : null;
    const localRightItem: string | null =
      isMatch && (paramState === "correct" || paramState === "selected") ? correctRightItem
      : isMatch && paramState === "incorrect" ? wrongRightItem
      : null;

    // Fill questions with qtotal copies of the fixture so currentIndex and
    // questions.length are consistent for progressPercent + currentQuestion.
    const solutionMap: Record<string, string> = {};
    const questionArray = Array.from({ length: qtotal }, (_, i) => {
      const copy = { ...q, answers: [...q.answers] };
      solutionMap[copy.id + i] = correctAnswerText;
      return copy;
    });

    // Apply all session state at once
    session.questions = questionArray;
    session.currentIndex = Math.min(qindex, qtotal - 1);
    session.timer = timer as TimerDuration;
    session.timeRemaining = timer;
    session.phase = "playing";
    session.answered = paramState !== "unanswered";
    session.showingAnswer = showing;
    session.selectedAnswerId = localSelectedId;
    session.correctAnswerId = showing ? correctAnswerText : "";
    session.selectedLeftItem = localLeftItem;
    session.selectedRightItem = localRightItem;
    session.matchItems = q.type === "image_matching" ? q.matchItems : null;
    session.mode = soloMode;
    session.score = scoreParam;
    // A representative "+N" preview whenever the reveal shows a correct
    // answer — mirrors /mimic/quiz/play's lastPointsEarned seeding.
    session.lastPointsEarned = paramState === "correct" ? 100 : 0;
    session.strikes = strikes;
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
    } else if (streakLifeParam !== null) {
      const value = Math.max(0, parseInt(streakLifeParam, 10));
      session.streakFlourish = { kind: "life-spent", value };
      session.streakNonce = 4000 + value;
    } else if (GAME.streak.steps.some((s) => s.threshold === streakParam)) {
      session.streakFlourish = { kind: "gain", value: streakParam };
      session.streakNonce = streakParam;
    } else {
      session.streakFlourish = null;
      session.streakNonce = streakParam;
    }
    session.isGuest = page.url.searchParams.get("guest") === "1";
    session.fasterThanPercent = paramState === "correct"
      ? Math.max(0, Math.min(100, parseInt(page.url.searchParams.get("faster") ?? "80", 10)))
      : null;
    session.displayMediaUrl = q.mediaUrl ?? "";
  });
</script>

{@render children()}
