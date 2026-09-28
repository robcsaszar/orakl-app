// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { load } from "../../src/routes/(game)/quiz/+layout.js";

// Load-event untrack: identity passthrough (SvelteKit only strips dependency
// tracking, the callback still runs).
const untrack = <T>(fn: () => T) => fn();

function contextFetch(body: unknown, status = 200) {
  const calls: URL[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const href =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    calls.push(new URL(href, "http://localhost"));
    return Response.json(body, { status });
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

/** A realistic `GET /api/quiz/context` body — every field the layout reads. */
const contextPayload = {
  membership: "active",
  phase: "lobby",
  playerId: "p-1",
  isCurator: false,
  curatorNickname: "",
  curatorAvatarId: "",
  isLoggedIn: true,
  profileAvatarId: "av-9",
  avatars: [],
  emotesEnabled: false,
  lobby: null,
  stateMessages: [],
  journey: {
    membership: "active",
    phase: "lobby",
    state: "lobby",
    route: "/quiz/lobby",
  },
};

describe("/quiz layout load", () => {
  it("asks the API for the quiz context once, with the ?code hint, and returns it as is", async () => {
    const { fetchFn, calls } = contextFetch(contextPayload);
    const result = await load({
      fetch: fetchFn,
      url: new URL("http://localhost/quiz/lobby?code=ABCD"),
      untrack,
      parent: async () => ({}),
    } as never);
    expect(result).toEqual(contextPayload);
    expect(calls).toHaveLength(1);
    expect(calls[0].pathname).toBe("/api/quiz/context");
    expect(calls[0].searchParams.get("code")).toBe("abcd");
  });

  it("omits the code when the URL carries none", async () => {
    const { fetchFn, calls } = contextFetch(contextPayload);
    await load({
      fetch: fetchFn,
      url: new URL("http://localhost/quiz/lobby"),
      untrack,
      parent: async () => ({}),
    } as never);
    expect(calls[0].searchParams.has("code")).toBe(false);
  });

  it("surfaces an API failure as a page error", async () => {
    const { fetchFn } = contextFetch({ error: "down" }, 503);
    await expect(
      load({
        fetch: fetchFn,
        url: new URL("http://localhost/quiz/lobby"),
        untrack,
        parent: async () => ({}),
      } as never),
    ).rejects.toMatchObject({ status: 503 });
  });
});
