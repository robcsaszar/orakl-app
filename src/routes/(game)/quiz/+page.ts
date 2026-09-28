import { redirect } from "@sveltejs/kit";
import { requireJourney } from "@/lib/quiz-guard";
import type { PageLoad } from "./$types";

// Bare /quiz → send the player to the route matching their real journey state.
export const load: PageLoad = async ({ fetch }) => {
  const journey = await requireJourney(fetch, []);
  redirect(303, journey.route);
};
