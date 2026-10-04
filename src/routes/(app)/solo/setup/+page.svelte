<script lang="ts">
import { getEntitlements } from "@orakl/shared";
import type { GuestEntitlements } from "@orakl/shared";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import type { FeatureFlagName } from "@orakl/shared";
  import { getSoloSession } from "@/lib/svelte/soloSession.svelte.js";
  import QuizSetupFields from "$lib/components/quiz-setup/QuizSetupFields.svelte";
  import QuizSetupFooter from "$lib/components/quiz-setup/QuizSetupFooter.svelte";
  import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Icon from "$lib/components/ui/Icon.svelte";
  import SoloGuestCta from "../SoloGuestCta.svelte";
  import Metatags from "$lib/components/seo/Metatags.svelte";
  import { GAME } from "data/game.settings.js";
  
  import { toast } from "@/lib/toast.js";

  // Layout data, for the flag state the guest pitch below gates on.
  let {
    data,
  }: { data: { uiFlags: Partial<Record<FeatureFlagName, boolean>> } } =
    $props();

  const s = getSoloSession();

  // A just-claimed run lands here when the boards are off; confirm it and drop
  // the stale persisted copy, exactly as the rankings page does.
  const claimed = $derived(page.url.searchParams.get("claimed") === "1");
  onMount(() => {
    if (claimed) s.clearPersisted();
  });
  const sortedCategories = $derived([...s.categories].sort((a, b) => b.count - a.count));

  // Guest entitlements drive the locked states (single source: solo-entitlements).
  const guest = getEntitlements(true) as GuestEntitlements;
  const lockedQuestionCounts = $derived(
    s.isGuest
      ? GAME.roundConfig.questionCounts.filter((c) => c > guest.maxQuestions)
      : undefined,
  );
  const lockedDifficulties = $derived(
    s.isGuest
      ? GAME.roundConfig.difficultyOptions.filter((d) => d !== "all")
      : undefined,
  );
  const maxCategories = $derived(s.isGuest ? guest.maxCategories : undefined);
  // Endless is shown but locked for guests (server-enforced too).
  const lockedModes = $derived<("normal" | "endless")[] | undefined>(
    s.isGuest ? ["endless"] : undefined,
  );

  function nudgeLocked() {
    toast.info("Sign in to unlock — guests play a limited trial.");
  }

  let _shownPoolWarning = $state("");
  let _shownError = $state("");
  let _shownGuestLimit = $state("");

  $effect(() => {
    if (s.poolWarning && s.poolWarning !== _shownPoolWarning) {
      _shownPoolWarning = s.poolWarning;
      toast.warning(s.poolWarning);
    }
    if (!s.poolWarning) _shownPoolWarning = "";
  });

  $effect(() => {
    const reason = s.guestLimit?.reason ?? "";
    if (reason && reason !== _shownGuestLimit) {
      _shownGuestLimit = reason;
      toast.warning(reason);
    }
    if (!reason) _shownGuestLimit = "";
  });

  $effect(() => {
    const err = s.errors.join(". ");
    if (err && err !== _shownError) {
      _shownError = err;
      toast.error(err);
    }
    if (!err) _shownError = "";
  });
</script>

<Metatags
  title="Trial of the Sphinx"
  description="Test your knowledge in a solo trial. Choose your categories and customize your game, or try to win the endless gauntlet."
/>

{#if claimed}
  <Card variant="success" padding="md" class="mb-8 flex flex-row items-center gap-2 text-sm text-success-light">
    <Icon name="wreath" class="size-5 shrink-0" />
    {data.uiFlags.PLAYER_HISTORY
      ? "Your run is saved to your record."
      : "Your run is saved."}
  </Card>
{/if}

{#if s.isGuest}
  <SoloGuestCta
    class="mb-8"
    leaderboards={data.uiFlags.SOLO_LEADERBOARDS === true}
    subline={s.guestLimit
      ? s.guestLimit.upgradeHint
      : "Sign in to unseal the full trial."}
  />
{/if}

<form
  id="solo-setup"
  onsubmit={(e) => { e.preventDefault(); s.startQuiz(e); }}
  class="flex flex-col gap-8"
>
  <QuizSetupFields
    categories={sortedCategories}
    bind:selectedCategories={s.selectedCategories}
    bind:difficulty={s.difficulty}
    bind:timer={s.timer}
    bind:questionsPerRound={s.questionCount}
    showQuestionsPerRound={s.mode !== "endless"}
    {maxCategories}
    {lockedDifficulties}
    {lockedQuestionCounts}
    onLocked={nudgeLocked}
  >
    {#snippet beforeQuestionsPerRound()}
      <RadioGroup
        options={["normal", "endless"] as const}
        bind:selected={s.mode}
        name="mode"
        legend="Play mode"
        description="Choose between a fixed or endless trial."
        class="flex-1"
        lockedOptions={lockedModes}
        onLocked={nudgeLocked}
      >
        {#snippet optionLabel(mode)}
          <span class="font-mono">{mode === "normal" ? "Normal" : "Endless"}</span>
        {/snippet}
      </RadioGroup>
    {/snippet}
  </QuizSetupFields>
</form>

<QuizSetupFooter
  formId="solo-setup"
  disabled={!s.isFormValid || s.starting}
  submitLabel="Begin trial"
  poolText={s.totalQuestionPool}
  maxTimeText={s.maxGameTime}
  disabledTooltip={s.starting ? "Opening the trial…" : "Select at least one category"}
  enabledTooltip={s.mode !== "endless" ? "Good luck" : "Defy the endless oracle"}
/>
