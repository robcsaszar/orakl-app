import { hasRole } from "@orakl/shared";
import { requireJourney } from "@/lib/quiz-guard";

import type { PageLoad } from "./$types";

// /join is code-entry only. Members (and visitors to an active lobby) are sent
// straight to the route matching their journey state (ADR 0004).
export const load: PageLoad = async ({ fetch, parent }) => {
  await requireJourney(fetch, ["code-entry"]);

  // A Display screen is not signed in. Asked by rank, so a display token —
  // its own role, not "anonymous" — is excluded along with anonymous.
  const { user } = await parent();
  const isLoggedIn = hasRole(user.role, "member");
  return {
    isLoggedIn,
    profileAvatarId: isLoggedIn ? (user.avatar ?? "") : "",
  };
};
