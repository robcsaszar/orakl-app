import { describe, expect, it, vi } from "vitest";
import { load as layoutLoad } from "../../src/routes/(app)/+layout.js";
import { load as homeLoad } from "../../src/routes/(app)/+page.js";
import { load as billingReturnLoad } from "../../src/routes/(app)/billing/return/+page.js";
import { load as profileLoad } from "../../src/routes/(app)/profile/+page.js";
import { load as sessionsLoad } from "../../src/routes/(app)/profile/sessions/+page.js";

type Answer = { status?: number; body: unknown };

/** A fetch keyed by API path; every load under test calls exactly one. */
function apiFetch(answers: Record<string, Answer>) {
  const calls: { url: URL; method: string }[] = [];
  const fetchFn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const href =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const url = new URL(href, "http://localhost");
      calls.push({ url, method: init?.method ?? "GET" });
      const answer = answers[url.pathname];
      if (!answer) throw new Error(`unexpected fetch ${url.pathname}`);
      return Response.json(answer.body, { status: answer.status ?? 200 });
    },
  ) as unknown as typeof fetch;
  return { fetchFn, calls };
}

describe("(app)/+layout load", () => {
  it("reads isLoggedIn from the parent's user, no fetch", async () => {
    const parent = async () => ({ user: { role: "member" } });
    const result = await layoutLoad({ parent } as never);
    expect(result).toEqual({ isLoggedIn: true });
  });

  it("is false for a guest", async () => {
    const parent = async () => ({ user: { role: "anonymous" } });
    const result = await layoutLoad({ parent } as never);
    expect(result).toEqual({ isLoggedIn: false });
  });
});

describe("(app)/+page (home) load", () => {
  it("calls /api/pages/home once and returns its body", async () => {
    const payload = { isLoggedIn: true, isCurator: false, host: null };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/home": { body: payload },
    });
    await expect(homeLoad({ fetch: fetchFn } as never)).resolves.toEqual(
      payload,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].url.pathname).toBe("/api/pages/home");
  });
});

describe("/profile load", () => {
  it("forwards claimed/verified/tab as query params", async () => {
    const payload = {
      user: {
        nickname: "Nyx",
        role: "member",
        powers: [],
        avatar: "",
        emailVerified: true,
      },
      theme: { mode: "dark" },
      font: "default",
      pendingRequest: null,
      subscription: null,
      graceOver: false,
      allowance: null,
      breakdown: {
        exact: null,
        estimate: {
          monthly: { vat: 0, fee: 0, net: 0 },
          lifetime: { vat: 0, fee: 0, net: 0 },
        },
      },
      welcome: null,
      claimed: false,
      verified: false,
      tab: "appearance",
      tools: false,
    };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/profile": { body: payload },
    });
    const url = new URL(
      "http://localhost/profile?claimed=1&verified=1&tab=appearance",
    );
    await expect(
      profileLoad({ fetch: fetchFn, url } as never),
    ).resolves.toEqual(payload);
    const q = calls[0].url.searchParams;
    expect(q.get("claimed")).toBe("1");
    expect(q.get("verified")).toBe("1");
    expect(q.get("tab")).toBe("appearance");
  });

  it("maps a 403 redirect body to a Kit redirect", async () => {
    const { fetchFn } = apiFetch({
      "/api/pages/profile": {
        status: 403,
        body: { error: "redirect", route: "/login" },
      },
    });
    const url = new URL("http://localhost/profile");
    await expect(
      profileLoad({ fetch: fetchFn, url } as never),
    ).rejects.toMatchObject({ status: 303, location: "/login" });
  });
});

describe("/profile/sessions load", () => {
  it("calls the endpoint and returns sessions + locationOptIn", async () => {
    const payload = {
      sessions: [
        {
          sid: "s1",
          fingerprint: "ab12",
          label: "Chrome on macOS",
          createdAt: 1700000000,
          lastSeen: 1700000100,
          current: true,
          location: null,
        },
      ],
      locationOptIn: { enabled: false, since: null },
    };
    const { fetchFn, calls } = apiFetch({
      "/api/pages/profile/sessions": { body: payload },
    });
    await expect(sessionsLoad({ fetch: fetchFn } as never)).resolves.toEqual(
      payload,
    );
    expect(calls[0].url.pathname).toBe("/api/pages/profile/sessions");
  });

  it("maps a 403 redirect body to a Kit redirect", async () => {
    const { fetchFn } = apiFetch({
      "/api/pages/profile/sessions": {
        status: 403,
        body: { error: "redirect", route: "/login" },
      },
    });
    await expect(
      sessionsLoad({ fetch: fetchFn } as never),
    ).rejects.toMatchObject({ status: 303, location: "/login" });
  });
});

describe("/billing/return load", () => {
  it("POSTs the endpoint and redirects to the route it names", async () => {
    const { fetchFn, calls } = apiFetch({
      "/api/pages/billing/return": { body: { route: "/profile" } },
    });
    await expect(
      billingReturnLoad({ fetch: fetchFn } as never),
    ).rejects.toMatchObject({ status: 303, location: "/profile" });
    expect(calls[0].method).toBe("POST");
  });

  it("maps a 403 redirect body to a Kit redirect", async () => {
    const { fetchFn } = apiFetch({
      "/api/pages/billing/return": {
        status: 403,
        body: { error: "redirect", route: "/login" },
      },
    });
    await expect(
      billingReturnLoad({ fetch: fetchFn } as never),
    ).rejects.toMatchObject({ status: 303, location: "/login" });
  });
});
