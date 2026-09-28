import type { JourneyState } from "@orakl/shared";
import { requireJourney } from "@/lib/quiz-guard";
import type { PageLoad } from "./$types";

/** Declarative phase gate (ADR 0004): states permitted on this page. */
export const _journey: JourneyState[] = ["setup", "pending"];

export const load: PageLoad = async ({ fetch, url }) => {
  await requireJourney(
    fetch,
    _journey,
    url.searchParams.get("code") ?? undefined,
  );
  return {};
};
