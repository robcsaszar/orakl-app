import type { JourneyState } from "@orakl/shared";
import { requireJourney } from "@/lib/quiz-guard";
import type { PageLoad } from "./$types";

/** Declarative phase gate (ADR 0004). */
export const _journey: JourneyState[] = ["role_selection"];

export const load: PageLoad = async ({ fetch }) => {
  await requireJourney(fetch, _journey);
  return {};
};
