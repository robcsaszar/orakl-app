// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://host.example/"}
import { describe, expect, it } from "vitest";
import { buildWsUrl } from "../src/lib/ws-url";

// jsdom's window.location is non-configurable, so the https->wss branch is
// exercised by booting jsdom on an https origin (via the docblock above)
// rather than mutating location mid-test.
describe("buildWsUrl (https origin)", () => {
  it("builds a wss: url over https", () => {
    expect(buildWsUrl("/api/x")).toBe("wss://host.example/api/x");
  });
});
