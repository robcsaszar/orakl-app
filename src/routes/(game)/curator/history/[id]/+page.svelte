<script lang="ts">
import { toIsoTimestamp } from "@orakl/shared";
  import type { PageData } from "./$types";
  import Button from "$lib/components/ui/Button.svelte";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import CeremonyFrame from "$lib/components/results/CeremonyFrame.svelte";
  import CeremonyLeaderboard from "$lib/components/results/CeremonyLeaderboard.svelte";
  import QuestionRecapCard from "./QuestionRecapCard.svelte";
  import { toast } from "@/lib/toast.js";
  import { formatDateShort } from "@/lib/format.js";

  let { data }: { data: PageData } = $props();

  const session = $derived(data.entry.session);
  const results = $derived(data.entry.results);
  const questions = $derived(data.entry.questions);

  // Rows without a stored avatar (games before #1281 shipped) resolve
  // avatarSrc to "", so PlayerRow falls back to its default quietly.
  const leaderboardPlayers = $derived(
    results.map((r) => ({
      id: r.id,
      nickname: r.player_nickname,
      score: r.final_score,
      rank: r.rank,
      avatarSrc: r.avatarSrc,
      role: r.role ?? undefined,
    })),
  );

  const subtitle = $derived(
    `${formatDate(session.started_at)} · ${session.player_count} ${session.player_count === 1 ? "player" : "players"} · ${session.total_questions} ${session.total_questions === 1 ? "question" : "questions"} · ${session.timer_duration}s timer`,
  );

  const alreadySaved = $derived(session.preset_id !== null);
  const atPresetLimit = $derived(data.presetCount >= data.presetLimit);
  let saving = $state(false);
  let saveResult = $state<"saved" | "error" | "limit" | null>(null);

  $effect(() => {
    if (
      data.uiFlags.QUIZ_PRESETS &&
      atPresetLimit &&
      !alreadySaved &&
      saveResult !== "saved"
    ) {
      toast.warning("Preset limit reached — delete a saved quiz to free a slot");
    }
  });

  function formatDate(iso: string): string {
    return formatDateShort(toIsoTimestamp(iso));
  }

  async function saveAsPreset() {
    saving = true;
    saveResult = null;
    try {
      const res = await fetch("/api/curator/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: session.quiz_name,
          categoryIds: session.categoryIds,
          timerDuration: session.timer_duration,
          questionsPerRound: session.questions_per_round ?? 10,
          difficulty: session.difficulty ?? "all",
          advanceMode: session.advance_mode ?? "auto_5",
          accessMode: session.access_mode ?? "open",
          maxPlayers: session.max_players ?? null,
          sessionId: session.id,
        }),
      });
      if (res.status === 422) {
        saveResult = "limit";
        toast.warning("Preset limit reached — delete a saved quiz to free a slot");
      } else if (res.ok) {
        saveResult = "saved";
        toast.success("Quiz saved as preset.");
      } else {
        saveResult = "error";
        toast.error("Failed to save quiz");
      }
    } catch {
      saveResult = "error";
      toast.error("Failed to save quiz");
    } finally {
      saving = false;
    }
  }
</script>

<Metatags title={session.quiz_name} description="A past game's results, from a curator's history." />

<h1 class="sr-only">{session.quiz_name}</h1>

<div class="flex flex-col gap-5">
  <CeremonyFrame kicker="Final standings" title={session.quiz_name} subtitle={subtitle}>
    {#if results.length === 0}
      <p class="text-foreground-darker font-sans">No results recorded for this session.</p>
    {:else}
      <CeremonyLeaderboard players={leaderboardPlayers} />
    {/if}
  </CeremonyFrame>

  <CeremonyFrame kicker="Questions asked" title="What was tested">
    {#if questions}
      <div class="flex flex-col gap-2">
        {#each questions as q (q.questionIndex)}
          <QuestionRecapCard
            index={q.questionIndex}
            text={q.questionText ?? `Question ${q.questionIndex + 1}`}
            mediaUrl={q.mediaUrl}
            postAnswerNote={q.postAnswerNote}
            source={q.source}
            answered={q.answered}
            correct={q.correct}
            spread={q.spread}
            noAnswer={q.noAnswer}
          />
        {/each}
      </div>
    {:else}
      <p class="text-sm text-foreground-darker font-sans">
        No per-question detail was recorded for this session. It is kept only
        for games played since this breakdown shipped.
      </p>
    {/if}
  </CeremonyFrame>

  {#if data.uiFlags.QUIZ_PRESETS}
    <div class="flex justify-end">
      <Button
        type="button"
        variant="secondary"
        intent="cta"
        disabled={alreadySaved || saveResult === "saved" || atPresetLimit || saving}
        loading={saving}
        onclick={saveAsPreset}
      >
        {alreadySaved || saveResult === "saved" ? "Saved" : "Save quiz"}
      </Button>
    </div>
  {/if}
</div>
