/**
 * Client-usable phase gate for `/quiz/*` pages (ADR 0004). Calls
 * `GET /api/quiz/journey` rather than reaching into the registry directly, so
 * it stays free of server-only imports and runs the same in a universal load
 * on the server or in the browser.
 */

import type { PlayerJourney } from "@orakl/protocol";
import { QuizJourneyPageSchema } from "@orakl/protocol";
import type { JourneyState } from "@orakl/shared";
import { error, redirect } from "@sveltejs/kit";
import { Either, Schema } from "effect";

/**
 * Enforce a page's declared phase gate: if the player's real journey state is
 * not allowed here, redirect to the route that matches their real state.
 */
export async function requireJourney(
  fetch: typeof globalThis.fetch,
  allowed: readonly JourneyState[],
  codeHint?: string,
): Promise<PlayerJourney> {
  const query = new URLSearchParams(codeHint ? { code: codeHint } : {});
  const qs = query.toString();
  const res = await fetch(`/api/quiz/journey${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw error(res.status, "Failed to load");
  const decoded = Schema.decodeUnknownEither(QuizJourneyPageSchema)(
    await res.json(),
  );
  if (Either.isLeft(decoded)) error(502, "Malformed response");
  const journey = decoded.right;
  if (!allowed.includes(journey.state)) {
    // Split-brain / restart guard: the lobby exists (active_lobbies row) but
    // not in the process's in-memory registry — either another machine owns
    // it (multi-machine split-brain; single-instance is canonical per
    // CONTEXT.md) or the process just restarted. Redirecting here bounces a
    // live curator to /curator/create mid-game, where re-submitting the form
    // mints a duplicate-code lobby on the wrong machine. Fail loud instead;
    // a reload re-rolls the load balancer onto the owner.
    if (journey.miss === "lobby_lost") {
      error(503, "Lobby unavailable — reload to retry");
    }
    // A pre-join target needs the hinted code: the /quiz layout and setup
    // loads read ?code=, and without it they resolve the cookie's lobby.
    const keepCode =
      codeHint && (journey.state === "setup" || journey.state === "pending");
    redirect(
      303,
      keepCode
        ? `${journey.route}?code=${encodeURIComponent(codeHint)}`
        : journey.route,
    );
  }
  return journey;
}
