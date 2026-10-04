import { describe, expect, it, vi } from "vitest";
import { load } from "../../src/routes/(game)/join/+page.js";

/** A fetch answering GET /api/quiz/journey with a setup journey. */
function journeyFetch() {
  const seen: URL[] = [];
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const href =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    seen.push(new URL(href, "http://localhost"));
    return Response.json({
      membership: "none",
      phase: "lobby",
      state: "setup",
      route: "/quiz/setup",
      miss: null,
    });
  }) as unknown as typeof fetch;
  return { fetchFn, seen };
}

describe("(game)/join +page load", () => {
  it("sends ?code= to the journey and keeps it on the setup redirect", async () => {
    const { fetchFn, seen } = journeyFetch();
    const parent = async () => ({ user: { role: "anonymous" } });
    const url = new URL("http://localhost/join?code=iron-vault");

    await expect(
      load({ fetch: fetchFn, parent, url } as never),
    ).rejects.toMatchObject({
      status: 303,
      location: "/quiz/setup?code=iron-vault",
    });
    expect(seen[0].pathname).toBe("/api/quiz/journey");
    expect(seen[0].searchParams.get("code")).toBe("iron-vault");
  });
});
