import type { JourneyState } from "@orakl/shared";
import { requireJourney } from "@/lib/quiz-guard";
import type { PageLoad } from "./$types";

/** Declarative phase gate (ADR 0004). `playing` covers question + round_results. */
export const _journey: JourneyState[] = ["playing"];

export const load: PageLoad = async ({ fetch, parent }) => {
  await requireJourney(fetch, _journey);
  // SSR-seed the live question: on a refresh/deep-link onto /quiz/play the
  // client replays these at mount (see +page.svelte) so the question paints
  // without the /api/game/state round-trip. Empty array when no live game.
  const { stateMessages } = await parent();
  return { stateMessages };
};
