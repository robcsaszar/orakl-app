import { describe, expect, it, vi } from "vitest";

vi.mock("../sentry.server.config", () => ({}));
vi.mock("@sentry/sveltekit", () => ({
  handleErrorWithSentry: (fn: unknown) => fn,
}));

import { handleFetch } from "../src/hooks.server.js";

function event(headers: Record<string, string>) {
  return {
    request: new Request("http://localhost/", { headers }),
  } as never;
}

describe("handleFetch", () => {
  it("forwards GPC, DNT and the color-scheme hint onto the internal /api/layout request", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null));
    await handleFetch({
      event: event({
        "Sec-GPC": "1",
        DNT: "1",
        "Sec-CH-Prefers-Color-Scheme": "dark",
      }),
      request: new Request("http://localhost/api/layout"),
      fetch,
    } as any);

    const forwarded = fetch.mock.calls[0][0] as Request;
    expect(forwarded.headers.get("sec-gpc")).toBe("1");
    expect(forwarded.headers.get("dnt")).toBe("1");
    expect(forwarded.headers.get("sec-ch-prefers-color-scheme")).toBe("dark");
  });

  it("leaves a request to any other path untouched", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null));
    await handleFetch({
      event: event({ "Sec-GPC": "1" }),
      request: new Request("http://localhost/api/feedback"),
      fetch,
    } as any);

    const forwarded = fetch.mock.calls[0][0] as Request;
    expect(forwarded.headers.get("sec-gpc")).toBeNull();
  });
});
