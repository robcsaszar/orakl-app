// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { API_UNAVAILABLE_MESSAGE } from "../src/lib/page-data.js";
import { requireJourney } from "../src/lib/quiz-guard.js";

type Journey = {
  membership: string;
  phase: string | null;
  state: string;
  route: string;
  miss: "lobby_lost" | null;
  lobbyGone?: boolean;
  savedResults?: boolean;
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
    const { fetchFn } = journeyFetch(null, 404);
    await expect(requireJourney(fetchFn, ["lobby"])).rejects.toMatchObject({
      status: 404,
    });
  });

  it.each([502, 503, 504])(
    "maps an API %i to a 503 page error with the unreachable message",
    async (status) => {
      const { fetchFn } = journeyFetch(null, status);
      await expect(requireJourney(fetchFn, ["lobby"])).rejects.toMatchObject({
        status: 503,
        body: { message: API_UNAVAILABLE_MESSAGE },
      });
    },
  );

  it("keeps the ?code hint on a redirect to a pre-join target", async () => {
    const { fetchFn } = journeyFetch({
      membership: "none",
      phase: "lobby",
      state: "setup",
      route: "/quiz/setup",
      miss: null,
    });
    await expect(
      requireJourney(fetchFn, ["code-entry"], "iron-vault"),
    ).rejects.toMatchObject({
      status: 303,
      location: "/quiz/setup?code=iron-vault",
    });
  });

  it("drops the ?code hint on a redirect to /join", async () => {
    const { fetchFn } = journeyFetch({
      membership: "none",
      phase: null,
      state: "code-entry",
      route: "/join",
      miss: null,
    });
    await expect(
      requireJourney(fetchFn, ["setup", "pending"], "iron-vault"),
    ).rejects.toMatchObject({ status: 303, location: "/join" });
  });

  it("a seat whose lobby is gone is sent to /join with the ended flag", async () => {
    const { fetchFn } = journeyFetch({
      membership: "none",
      phase: null,
      state: "code-entry",
      route: "/join",
      miss: null,
      lobbyGone: true,
    });
    await expect(requireJourney(fetchFn, ["lobby"])).rejects.toMatchObject({
      status: 303,
      location: "/join?ended=1",
    });
  });

  it("a seat whose gone lobby has a saved game is sent to the read-only results", async () => {
    const { fetchFn } = journeyFetch({
      membership: "none",
      phase: null,
      state: "code-entry",
      route: "/join",
      miss: null,
      lobbyGone: true,
      savedResults: true,
    });
    await expect(requireJourney(fetchFn, ["lobby"])).rejects.toMatchObject({
      status: 303,
      location: "/quiz/results",
    });
  });

  it("/join itself stays open to a seat with saved results", async () => {
    const { fetchFn } = journeyFetch({
      membership: "none",
      phase: null,
      state: "code-entry",
      route: "/join",
      miss: null,
      lobbyGone: true,
      savedResults: true,
    });
    await expect(
      requireJourney(fetchFn, ["code-entry"]),
    ).resolves.toMatchObject({ state: "code-entry" });
  });

  it("a gone lobby never changes a redirect elsewhere", async () => {
    const { fetchFn } = journeyFetch({
      membership: "none",
      phase: null,
      state: "code-entry",
      route: "/curator/create",
      miss: null,
      lobbyGone: true,
    });
    await expect(requireJourney(fetchFn, ["lobby"])).rejects.toMatchObject({
      status: 303,
      location: "/curator/create",
    });
  });

  it("keeps the ?code hint on a redirect to the pending target", async () => {
    const { fetchFn } = journeyFetch({
      membership: "pending",
      phase: "lobby",
      state: "pending",
      route: "/quiz/pending",
      miss: null,
    });
    await expect(
      requireJourney(fetchFn, ["lobby"], "iron-vault"),
    ).rejects.toMatchObject({
      status: 303,
      location: "/quiz/pending?code=iron-vault",
    });
  });

  it("a malformed journey body is a 502 page error", async () => {
    const { fetchFn } = journeyFetch({ nonsense: true } as never);
    await expect(requireJourney(fetchFn, ["lobby"])).rejects.toMatchObject({
      status: 502,
      body: { message: expect.stringMatching(/\S/) },
    });
  });
});
