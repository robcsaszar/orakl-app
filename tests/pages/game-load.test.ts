// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { load as joinLoad } from "../../src/routes/(game)/join/+page.js";
import { load as lobbyLoad } from "../../src/routes/(game)/quiz/lobby/+page.js";
import { load as playLoad } from "../../src/routes/(game)/quiz/play/+page.js";
import { load as resultsLoad } from "../../src/routes/(game)/quiz/results/+page.js";
import { load as setupLoad } from "../../src/routes/(game)/quiz/setup/+page.js";

type Answer = { status?: number; body: unknown };

/** A fetch keyed by API path; every universal load under test calls one. */
function apiFetch(answers: Record<string, Answer>) {
  const calls: URL[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const href =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(href, "http://localhost");
    calls.push(url);
    const answer = answers[url.pathname];
    if (!answer) throw new Error(`unexpected fetch ${url.pathname}`);
    return Response.json(answer.body, { status: answer.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

const journey = (state: string, route: string, miss: string | null = null) => ({
  membership: state === "code-entry" ? "none" : "active",
  phase: null,
  state,
  route,
  miss,
});

function anonParent() {
  return async () => ({
    user: { role: "anonymous", id: "anon", avatar: null, lobbyCode: null },
  });
}
function memberParent(avatar = "av-9") {
  return async () => ({
    user: { role: "member", id: "u-1", avatar, lobbyCode: "abcd" },
  });
}
const url = (params: Record<string, string> = {}) => {
  const u = new URL("http://localhost/quiz");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u;
};

describe("/join load", () => {
  it("returns isLoggedIn=false for an anonymous visitor at code-entry", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/journey": { body: journey("code-entry", "/join") },
    });
    const result = await joinLoad({
      fetch: fetchFn,
      parent: anonParent(),
    } as never);
    expect(result).toEqual({ isLoggedIn: false, profileAvatarId: "" });
  });

  it("redirects a player already in a lobby away from /join", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/journey": { body: journey("lobby", "/quiz/lobby") },
    });
    await expect(
      joinLoad({ fetch: fetchFn, parent: memberParent() } as never),
    ).rejects.toMatchObject({ status: 303, location: "/quiz/lobby" });
  });

  it("returns isLoggedIn=true and the profile avatar for a signed-in visitor", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/journey": { body: journey("code-entry", "/join") },
    });
    const result = await joinLoad({
      fetch: fetchFn,
      parent: memberParent("av-9"),
    } as never);
    expect(result).toEqual({ isLoggedIn: true, profileAvatarId: "av-9" });
  });
});

describe("/quiz/setup load", () => {
  it("passes through on an allowed state and forwards ?code", async () => {
    const { fetchFn, calls } = apiFetch({
      "/api/quiz/journey": { body: journey("setup", "/quiz/setup") },
    });
    await expect(
      setupLoad({ fetch: fetchFn, url: url({ code: "abcd" }) } as never),
    ).resolves.toEqual({});
    expect(calls[0].searchParams.get("code")).toBe("abcd");
  });

  it("redirects when the journey says otherwise", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/journey": { body: journey("code-entry", "/join") },
    });
    await expect(
      setupLoad({ fetch: fetchFn, url: url() } as never),
    ).rejects.toMatchObject({ status: 303, location: "/join" });
  });
});

describe("/quiz/lobby load", () => {
  it("passes through in the lobby state", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/journey": { body: journey("lobby", "/quiz/lobby") },
    });
    await expect(lobbyLoad({ fetch: fetchFn } as never)).resolves.toEqual({});
  });

  it("redirects a player who is not in the lobby state", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/journey": { body: journey("playing", "/quiz/play") },
    });
    await expect(lobbyLoad({ fetch: fetchFn } as never)).rejects.toMatchObject({
      status: 303,
      location: "/quiz/play",
    });
  });
});

describe("/quiz/play load", () => {
  it("passes through while playing and seeds stateMessages from the layout", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/journey": { body: journey("playing", "/quiz/play") },
    });
    const stateMessages = [{ type: "game:question" }];
    await expect(
      playLoad({
        fetch: fetchFn,
        parent: async () => ({ stateMessages }),
      } as never),
    ).resolves.toEqual({ stateMessages });
  });

  it("redirects when the player is not in the playing state", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/journey": { body: journey("lobby", "/quiz/lobby") },
    });
    await expect(
      playLoad({ fetch: fetchFn, parent: async () => ({}) } as never),
    ).rejects.toMatchObject({ status: 303 });
  });
});

describe("/quiz/results load", () => {
  it("redirects to the route the API names when the phase is wrong", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/results": {
        status: 409,
        body: { error: "wrong_phase", route: "/quiz/lobby" },
      },
    });
    await expect(
      resultsLoad({ fetch: fetchFn, url: url() } as never),
    ).rejects.toMatchObject({ status: 303, location: "/quiz/lobby" });
  });

  it("returns the API's payload and forwards ?claimed=1", async () => {
    const payload = {
      isAnonymousPlayer: true,
      claimed: true,
      breakdown: null,
      canFlag: false,
      alreadyFlaggedIds: [],
      hostAllowance: null,
    };
    const { fetchFn, calls } = apiFetch({
      "/api/quiz/results": { body: payload },
    });
    await expect(
      resultsLoad({ fetch: fetchFn, url: url({ claimed: "1" }) } as never),
    ).resolves.toEqual(payload);
    expect(calls[0].searchParams.get("claimed")).toBe("1");
  });

  it("surfaces any other API failure as a page error", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/results": { status: 500, body: { error: "boom" } },
    });
    await expect(
      resultsLoad({ fetch: fetchFn, url: url() } as never),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("refuses a body that does not match its schema", async () => {
    const { fetchFn } = apiFetch({
      "/api/quiz/results": { body: { isAnonymousPlayer: true } },
    });
    await expect(
      resultsLoad({ fetch: fetchFn, url: url() } as never),
    ).rejects.toMatchObject({ status: 502 });
  });
});
