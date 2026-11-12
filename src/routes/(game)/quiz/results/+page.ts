import { QuizResultsPageSchema } from "@orakl/protocol";
import type { JourneyState } from "@orakl/shared";
import { error, redirect } from "@sveltejs/kit";
import { Either, Schema } from "effect";
import { failLoad, fetchWithRetry } from "@/lib/page-data";
import type { PageLoad } from "./$types";

/** Declarative phase gate (ADR 0004). */
export const _journey: JourneyState[] = ["final_scores"];

export const load: PageLoad = async ({ fetch, url }) => {
  const claimed = url.searchParams.get("claimed") === "1" ? "1" : undefined;
  const query = new URLSearchParams(claimed ? { claimed } : {});
  const qs = query.toString();
  const res = await fetchWithRetry(
    fetch,
    `/api/quiz/results${qs ? `?${qs}` : ""}`,
  );
  if (res.status === 409) {
    const body = (await res.json()) as { route: string };
    redirect(303, body.route);
  }
  if (!res.ok) failLoad(res.status);
  const decoded = Schema.decodeUnknownEither(QuizResultsPageSchema)(
    await res.json(),
  );
  if (Either.isLeft(decoded)) error(502, "Malformed response");
  return decoded.right;
};
