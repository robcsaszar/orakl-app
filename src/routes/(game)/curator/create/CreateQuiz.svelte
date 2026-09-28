<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import QuizSetupFields from "$lib/components/quiz-setup/QuizSetupFields.svelte";
  import QuizSetupFooter from "$lib/components/quiz-setup/QuizSetupFooter.svelte";
  import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
  import type {
    AdvanceMode,
    DifficultyFilter,
    QuestionsPerRound,
    ScoringMode,
    TimerDuration,
  } from "data/game.settings.js";
  import { GAME } from "data/game.settings.js";
  import {
    calculateMaxGameTime,
    calculateTotalQuestionPool,
    validateQuizSetup,
  } from "@/lib/quiz-setup.js";
  import type { Category } from "@/types/category.js";
  import type { QuizPreset } from "@orakl/protocol";
  import { storage } from "@/lib/storage.js";
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmButton from "$lib/components/ui/ConfirmButton.svelte";
  import { toast } from "@/lib/toast.js";
  import { generateRandomPreset } from "@/lib/quiz-name-presets.js";
  import Card from "$lib/components/ui/Card.svelte";
  import Icon from "@/lib/components/ui/Icon.svelte";
  import { fade } from "svelte/transition";
  import Input from "@/lib/components/ui/Input.svelte";
  import FieldDescription from "$lib/components/ui/partials/FieldDescription.svelte";
  import Checkbox from "@/lib/components/ui/Checkbox.svelte";

  let {
    categories = [],
    categoryColors: _initialColors = {},
    presets = [],
    presetLimit = 10,
    scoringModes = false,
    accessModes = false,
    maxPlayers = false,
    quizPresets = false,
  }: {
    categories: Category[];
    categoryColors: Record<string, string>;
    presets: QuizPreset[];
    presetLimit: number;
    /** Whether the scoring picker is offered; off pins classic. */
    scoringModes?: boolean;
    /** Whether the access picker is offered; off pins every lobby open. */
    accessModes?: boolean;
    /** Whether the max-players field is offered; off leaves lobbies uncapped. */
    maxPlayers?: boolean;
    /** Whether saved quizzes are offered — the section, and saving one. */
    quizPresets?: boolean;
  } = $props();

  // Form state
  let quizName = $state("");
  let description = $state("");
  let selectedCategories = $state<string[]>([]);
  let timer = $state<TimerDuration>(30);
  let questionsPerRound = $state<QuestionsPerRound>(10);
  let difficulty = $state<DifficultyFilter>("all");
  let advanceMode = $state<AdvanceMode>("auto_5");
  let scoringMode = $state<ScoringMode>(GAME.roundConfig.defaultScoring);
  let accessMode = $state<"open" | "invite-only">("open");
  let maxPlayersInput = $state("");
  // Playing curator (ADR 0019) — default ON always, no cross-session memory.
  let participate = $state(true);
  let errors = $state<string[]>([]);
  let categoriesError = $state(false);
  let _isEditing = $state(false);

  // Perf: O(1) lookup by id, built once from categories (never mutates after mount).
  const categoryMap = $derived(new Map(categories.map((c) => [c.id, c])));

  // Derived
  const poolSize = $derived(
    selectedCategories
      .map((id) => categoryMap.get(id))
      .filter(Boolean)
      .reduce((sum, c) => sum + (c?.count ?? 0), 0),
  );

  const poolWarning = $derived((): string | null => {
    if (selectedCategories.length === 0) return null;
    if (poolSize < questionsPerRound) {
      return `Only ${poolSize} ${poolSize === 1 ? "question" : "questions"} available — game will use all of them`;
    }
    return null;
  });

  const isFormValid = $derived(
    quizName.trim() !== "" && selectedCategories.length > 0,
  );

  const totalQuestionPool = $derived(() =>
    calculateTotalQuestionPool(selectedCategories, categories),
  );
  const maxGameTime = $derived(() => {
    if (selectedCategories.length === 0) return "—";
    return calculateMaxGameTime(questionsPerRound, timer, advanceMode);
  });

  function generateQuizName() {
    const preset = generateRandomPreset();
    quizName = preset.title;
    description = preset.description;
  }

  let _shownPoolWarning = $state("");
  $effect(() => {
    const w = poolWarning();
    if (w && w !== _shownPoolWarning) {
      _shownPoolWarning = w;
      toast.warning(w);
    }
    if (!w) _shownPoolWarning = "";
  });

  $effect(() => {
    if (quizPresets && atPresetLimit)
      toast.warning(
        "Preset limit reached — delete a saved quiz to free a slot",
      );
  });

  $effect(() => {
    if (deleteError) toast.error(deleteError);
  });

  let submitting = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errors = [];
    categoriesError = false;

    const name = quizName?.trim();
    if (!name) errors = [...errors, "Quiz name is required"];

    const sharedErrors = validateQuizSetup({
      selectedCategories,
      timer,
      questionsPerRound,
      difficulty,
    });
    if (sharedErrors.length > 0) {
      errors = [...errors, ...sharedErrors];
      if (sharedErrors.some((e) => e.includes("category"))) {
        categoriesError = true;
      }
    }

    if (!GAME.roundConfig.advanceModeOptions.includes(advanceMode))
      errors = [...errors, "Invalid advance mode"];

    if (errors.length > 0) {
      toast.error(errors.join(". "));
      return;
    }

    const maxPlayersNum =
      maxPlayersInput !== "" ? Number(maxPlayersInput) : null;
    if (
      maxPlayersNum !== null &&
      (Number.isNaN(maxPlayersNum) || maxPlayersNum < 1 || maxPlayersNum > 200)
    ) {
      errors = [...errors, "Max players must be between 1 and 200"];
    }
    if (errors.length > 0) {
      toast.error(errors.join(". "));
      return;
    }

    const quizConfig = {
      name,
      description: description?.trim() || undefined,
      categoryIds: selectedCategories,
      timer,
      questionsPerRound,
      difficulty,
      advanceMode,
      scoringMode,
      accessMode,
      maxPlayers: maxPlayersNum,
      saveAsPreset: saveAsPreset && !atPresetLimit,
      participate,
    };
    // Kept for /quiz/lobby's "Start quiz" step (categoryIds/timer/etc. for the
    // curator:start frame) — lobby creation itself now happens here, not on
    // the lobby page's mount, mirroring how a normal player joins on /quiz/setup
    // before ever navigating to /quiz/lobby.
    storage.setQuizConfig(JSON.stringify(quizConfig));

    if (submitting) return;
    submitting = true;
    try {
      const res = await fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizName: quizConfig.name,
          description: quizConfig.description,
          categoryIds: quizConfig.categoryIds,
          difficulty: quizConfig.difficulty,
          timerDuration: quizConfig.timer,
          questionsPerRound: quizConfig.questionsPerRound,
          advanceMode: quizConfig.advanceMode,
          scoringMode: quizConfig.scoringMode,
          accessMode: quizConfig.accessMode,
          maxPlayers: quizConfig.maxPlayers,
          participate: quizConfig.participate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to host quiz");
        submitting = false;
        return;
      }
      if (quizConfig.saveAsPreset) {
        // Saved on every successful host, fresh lobby (201) or re-host (200).
        const saved = await fetch("/api/curator/presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: quizConfig.name,
            description: quizConfig.description,
            categoryIds: quizConfig.categoryIds,
            timerDuration: quizConfig.timer,
            questionsPerRound: quizConfig.questionsPerRound,
            difficulty: quizConfig.difficulty,
            advanceMode: quizConfig.advanceMode,
            scoringMode: quizConfig.scoringMode,
            accessMode: quizConfig.accessMode,
            maxPlayers: quizConfig.maxPlayers,
          }),
        })
          .then((r) => r.ok)
          .catch(() => false);
        if (!saved) toast.error("Quiz hosted, but the preset was not saved");
      }
      // invalidateAll, not a full reload: the POST just minted the curator
      // game_token cookie, and every layout load (header user, quiz journey)
      // must re-run against it — one data round-trip instead of a document
      // reload + rehydration.
      await goto(
        data.code
          ? `/quiz/lobby?code=${encodeURIComponent(data.code)}`
          : "/quiz/lobby",
        { invalidateAll: true },
      );
    } catch {
      toast.error("Failed to host quiz. Check your connection and try again.");
      submitting = false;
    }
  }

  let saveAsPreset = $state(false);

  let deleteError = $state<string | null>(null);
  // Writable derived: optimistic deletes reassign locally without a server
  // round-trip; resets to server truth when the prop refreshes.
  let savedPresets = $derived<QuizPreset[]>(presets);
  const atPresetLimit = $derived(savedPresets.length >= presetLimit);

  function prefillFromPreset(preset: QuizPreset) {
    quizName = preset.name;
    description = preset.description ?? "";
    selectedCategories = JSON.parse(preset.category_ids) as string[];
    timer = preset.timer_duration as TimerDuration;
    questionsPerRound = preset.questions_per_round as QuestionsPerRound;
    difficulty = preset.difficulty as DifficultyFilter;
    advanceMode = preset.advance_mode as AdvanceMode;
    scoringMode =
      (preset.scoring_mode as ScoringMode) ?? GAME.roundConfig.defaultScoring;
    accessMode = preset.access_mode as "open" | "invite-only";
    maxPlayersInput =
      preset.max_players != null ? String(preset.max_players) : "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletePreset(id: string) {
    deleteError = null;
    try {
      const res = await fetch(`/api/curator/presets/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        savedPresets = savedPresets.filter((p) => p.id !== id);
      } else {
        deleteError = "Failed to delete quiz";
      }
    } catch {
      deleteError = "Failed to delete quiz";
    }
  }

  onMount(() => {
    _isEditing = !!storage.getQuizConfig();

    try {
      const raw = storage.getQuizConfig();
      if (raw) {
        const config = JSON.parse(raw);
        if (config.name) quizName = config.name;
        if (config.description) description = config.description;
        if (config.categoryIds) selectedCategories = config.categoryIds;
        if (config.timer) timer = config.timer;
        if (config.questionsPerRound)
          questionsPerRound = config.questionsPerRound;
        if (config.difficulty) difficulty = config.difficulty;
        if (
          config.advanceMode &&
          GAME.roundConfig.advanceModeOptions.includes(config.advanceMode)
        ) {
          advanceMode = config.advanceMode;
        }
        if (
          config.scoringMode &&
          GAME.roundConfig.scoringOptions.includes(config.scoringMode)
        ) {
          scoringMode = config.scoringMode;
        }
        if (
          config.accessMode === "open" ||
          config.accessMode === "invite-only"
        ) {
          accessMode = config.accessMode;
        }
        if (config.maxPlayers != null) {
          maxPlayersInput = String(config.maxPlayers);
        }
        // Mid-form-edit continuity only — no cross-session preference memory
        // (playing curator, ADR 0019 — always defaults ON otherwise).
        if (typeof config.participate === "boolean") {
          participate = config.participate;
        }
      }
    } catch (err) {
      console.error("[Create] Error restoring quiz config:", err);
    }

    if (!quizName) generateQuizName();
  });
</script>

<div class="flex flex-col gap-6">
  <form
    id="create-quiz-form"
    onsubmit={handleSubmit}
    class="flex flex-col gap-8"
  >
    <!-- Quiz Name -->
    <div class="flex flex-col gap-4 items-stretch">
      <div class="flex gap-2 items-end flex-1">
        <Input
          type="text"
          id="quiz-name"
          name="quiz-name"
          label="Name"
          bind:value={quizName}
          required="true"
          maxlength={60}
          placeholder="Trivia Newton John"
        >
          {#snippet labelEnd()}
            {#if quizName.length > 0}
              <span
                class="text-xs text-foreground-darker font-mono tabular-nums self-end group-focus-within:opacity-100 opacity-50 transition-opacity"
                transition:fade={{ duration: 150 }}
              >
                {quizName.length}/60
              </span>
            {/if}
          {/snippet}

          {#snippet inputEnd()}
            <Button
              type="button"
              variant="secondary"
              intent="icon"
              onclick={generateQuizName}
              aria-label="Generate random quiz name"
              iconBefore="dice"
            ></Button>
          {/snippet}
        </Input>
      </div>
      <Input
        type="textarea"
        id="quiz-desc"
        name="quiz-desc"
        label="Description"
        bind:value={description}
        maxlength={200}
        placeholder="If you can't be right, at least be loud, wrong, and incredibly confident about it."
      >
        {#snippet labelEnd()}
          {#if description.length > 0}
            <span
              class="text-xs text-foreground-darker font-mono tabular-nums self-end group-focus-within:opacity-100 opacity-50 transition-opacity"
              transition:fade={{ duration: 150 }}
            >
              {description.length}/200
            </span>
          {/if}
        {/snippet}
      </Input>
    </div>

    <!-- Shared setup fields -->
    <QuizSetupFields
      {categories}
      bind:selectedCategories
      bind:difficulty
      bind:timer
      bind:questionsPerRound
      {categoriesError}
    />

    <!-- Curator-specific: advance mode -->
    <RadioGroup
      options={GAME.roundConfig.advanceModeOptions}
      bind:selected={advanceMode}
      name="advanceMode"
      legend="Round advance"
      description="Auto-advance to the next question, or wait for you to proceed."
    >
      {#snippet optionLabel(mode)}
        <span class="font-mono text-sm" aria-hidden="true">
          {#if mode === "auto_5"}5s
          {:else if mode === "auto_10"}10s
          {:else}Manual{/if}
        </span>
        <span class="sr-only">
          {#if mode === "auto_5"}Auto-advance after 5 seconds
          {:else if mode === "auto_10"}Auto-advance after 10 seconds
          {:else}Manual — you advance{/if}
        </span>
      {/snippet}
    </RadioGroup>

    <!-- Scoring mode -->
    {#if scoringModes}
      <RadioGroup
        options={GAME.roundConfig.scoringOptions}
        bind:selected={scoringMode}
        name="scoringMode"
        legend="Scoring"
        description="Classic gives 1 point per correct answer. Time-based adds a speed bonus for faster answers."
      >
        {#snippet optionLabel(mode)}
          <span class="flex flex-col items-center gap-0.5">
            <span class="font-mono text-sm"
              >{mode === "classic" ? "Classic" : "Time-based"}</span
            >
          </span>
        {/snippet}
      </RadioGroup>
    {/if}

    <!-- Access mode -->
    {#if accessModes}
      <RadioGroup
        options={["open", "invite-only"] as const}
        bind:selected={accessMode}
        name="accessMode"
        legend="Access"
        description="Open lobbies allow anyone to join. Invite-only lobbies require a code."
      >
        {#snippet optionLabel(mode)}
          <span class="font-mono text-sm" aria-hidden="true">
            {#if mode === "open"}Open{:else}Invite-only{/if}
          </span>
          <span class="sr-only">
            {#if mode === "open"}Open — anyone can join{:else}Invite-only —
              requires code{/if}
          </span>
        {/snippet}
      </RadioGroup>
    {/if}

    {#if maxPlayers}
      <div
        role="group"
        class="group flex flex-col gap-2 items-start"
        aria-describedby="maxPlayers-description"
      >
        <Input
          type="number"
          id="maxPlayers"
          name="maxPlayers"
          label="Max players"
          bind:value={maxPlayersInput}
          min="1"
          max="200"
          placeholder="200"
        />
        <FieldDescription
          id="maxPlayers-description"
          description="Set the maximum number of players, or leave blank for no limit (up to 200)."
        />
      </div>
    {/if}

    <div class="grid gap-8 md:grid-cols-2">
      <!-- Playing curator (ADR 0019) -->
      <div
        class="group flex flex-col gap-2"
        aria-describedby="participate-description"
      >
        <Checkbox
          id="participate"
          name="participate"
          label="Play along"
          aria-describedby="participate-description"
          bind:checked={participate}
        />
        <FieldDescription
          id="participate-description"
          description={participate && advanceMode === "manual"
            ? "Playing along? Auto-advance keeps the game moving."
            : "Join your own quiz as a player."}
        />
      </div>
      {#if quizPresets}
        <div
          class="group flex flex-col gap-2"
          aria-describedby="savePreset-description"
        >
          <Checkbox
            id="savePreset"
            name="saveAsPreset"
            label="Save as preset"
            bind:checked={saveAsPreset}
            disabled={atPresetLimit}
            description={`${savedPresets.length}/${presetLimit} saved`}
          />
          <FieldDescription
            description="Save this configuration to reuse later."
            id="savePreset-description"
          />
        </div>
      {/if}
    </div>
  </form>

  <!-- Preview + Submit footer -->
  <QuizSetupFooter
    formId="create-quiz-form"
    disabled={!isFormValid || submitting}
    submitLabel={submitting
      ? "Hosting…"
      : _isEditing
        ? "Update quiz"
        : "Host quiz"}
    poolText={totalQuestionPool()}
    maxTimeText={maxGameTime()}
    disabledTooltip="Add a name & select at least one category to continue"
    enabledTooltip="Happy quizzing"
  />

  {#if quizPresets && savedPresets.length > 0}
    <section
      aria-labelledby="saved-quizzes-heading"
      class="flex flex-col gap-3 pt-2 border-t border-border/50"
    >
      <h2 id="saved-quizzes-heading" class="text-lg font-semibold">
        Saved quizzes
      </h2>
      <ul class="flex flex-col gap-2">
        {#each savedPresets as preset (preset.id)}
          {@const categoryIds = JSON.parse(preset.category_ids) as string[]}
          <li>
            <Card
              padding="sm"
              class="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center"
            >
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="font-semibold truncate">{preset.name}</span>
                <span class="text-xs font-sans">{preset.description}</span>
                <span class="text-xs text-foreground-darker font-sans">
                  {categoryIds.length}
                  {categoryIds.length === 1 ? "category" : "categories"} · {preset.timer_duration}s
                  · {preset.questions_per_round} questions · {preset.difficulty ===
                  "all"
                    ? "All difficulties"
                    : preset.difficulty}
                </span>
              </div>
              <div class="flex items-center gap-2 shrink-0 self-end">
                <ConfirmButton
                  label="Delete"
                  ariaLabel={`Delete ${preset.name}`}
                  confirmLabel="Delete preset?"
                  confirmAriaLabel={`Click again to delete ${preset.name}`}
                  variant="danger"
                  progressStyle="border"
                  class="px-3 py-1.5 text-sm leading-none"
                  onConfirm={() => deletePreset(preset.id)}
                >
                  {#snippet icon()}
                    <Icon name="x" class="size-4" />
                  {/snippet}
                </ConfirmButton>
                <Button
                  type="button"
                  variant="secondary"
                  intent="compact"
                  aria-label={`Apply ${preset.name}`}
                  onclick={() => prefillFromPreset(preset)}
                >
                  Apply quiz
                </Button>
              </div>
            </Card>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>
