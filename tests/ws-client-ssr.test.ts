// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildWsUrl } from "../src/lib/ws-url";

// Node environment has no `window` global — the real SSR condition
// `buildWsUrl`'s callers rely on, unlike jsdom where `window` can't be
// deleted (non-configurable).
describe("buildWsUrl (SSR)", () => {
  it("returns '' with no window", () => {
    expect(buildWsUrl("/api/x")).toBe("");
  });
});
