// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { requireJourney } from "../src/lib/quiz-guard.js";

type Journey = {
  membership: string;
  phase: string | null;
  state: string;
  route: string;
  miss: "lobby_lost" | null;
};

/** A fetch that answers `GET /api/quiz/journey` and records the URL it saw. */
function journeyFetch(body: Journey | null, status = 200) {
  const seen: URL[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const href =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    seen.push(new URL(href, "http://localhost"));
    return body
      ? Response.json(body, { status })
      : new Response(null, { status });
  }) as unknown as typeof fetch;
  return { fetchFn, seen };
}

const lobbyState: Journey = {
  membership: "active",
  phase: "lobby",
  state: "lobby",
  route: "/quiz/lobby",
  miss: null,
};

describe("requireJourney (client helper over GET /api/quiz/journey)", () => {
  it("passes through on an allowed state and returns the journey", async () => {
    const { fetchFn, seen } = journeyFetch(lobbyState);
    const journey = await requireJourney(fetchFn, ["lobby"]);
    expect(journey).toMatchObject({ state: "lobby", route: "/quiz/lobby" });
    expect(seen[0].pathname).toBe("/api/quiz/journey");
  });

  it("redirects to the journey's route when the state is not allowed", async () => {
    const { fetchFn } = journeyFetch(lobbyState);
    await expect(requireJourney(fetchFn, ["playing"])).rejects.toMatchObject({
      status: 303,
      location: "/quiz/lobby",
    });
  });

  it("503s when the API reports the lobby as lost rather than redirecting", async () => {
    const { fetchFn } = journeyFetch({
      ...lobbyState,
      state: "code-entry",
      route: "/join",
      miss: "lobby_lost",
    });
    await expect(requireJourney(fetchFn, ["lobby"])).rejects.toMatchObject({
      status: 503,
    });
  });

  it("a lost lobby on an allowed state still passes — the diagnosis only matters on a mismatch", async () => {
    const { fetchFn } = journeyFetch({ ...lobbyState, miss: "lobby_lost" });
    await expect(requireJourney(fetchFn, ["lobby"])).resolves.toMatchObject({
      state: "lobby",
    });
  });

  it("forwards the ?code hint to the API", async () => {
    const { fetchFn, seen } = journeyFetch(lobbyState);
    await requireJourney(fetchFn, ["lobby"], "abcd");
    expect(seen[0].searchParams.get("code")).toBe("abcd");
  });

  it("surfaces an API failure as a page error with the same status", async () => {
    const { fetchFn } = journeyFetch(null, 502);
    await expect(requireJourney(fetchFn, ["lobby"])).rejects.toMatchObject({
      status: 502,
    });
  });
});
