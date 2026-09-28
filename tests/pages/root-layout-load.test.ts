import { describe, expect, it, vi } from "vitest";
import { UI_FLAGS } from "../../src/lib/page-config.js";
import { load } from "../../src/routes/+layout.js";

describe("root +layout load", () => {
  it("asks /api/layout for the flags the page chrome gates on", async () => {
    const seen: URL[] = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      seen.push(new URL(String(input), "http://localhost"));
      return new Response("{}", { status: 500 });
    }) as unknown as typeof fetch;
    await load({ fetch: fetchFn } as never).catch(() => {});
    expect(seen[0].pathname).toBe("/api/layout");
    expect(seen[0].searchParams.get("flags")?.split(",").sort()).toEqual(
      [...UI_FLAGS].sort(),
    );
  });
});
