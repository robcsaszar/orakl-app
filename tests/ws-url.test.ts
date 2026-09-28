import { describe, expect, it } from "vitest";
import { buildWsUrl } from "../src/lib/ws-url";

// https:->wss: and the SSR case need a real window absence / origin the
// jsdom environment here won't let a running test reconfigure (window.location
// is non-configurable) — covered instead by tests/ws-client-ssr.test.ts (node
// environment) and tests/ws-client-https.test.ts (jsdom booted on an https
// origin via the environment docblock).
describe("buildWsUrl", () => {
  it("builds a ws: url over http, using the jsdom default (http) origin", () => {
    expect(buildWsUrl("/api/x")).toBe(`ws://${window.location.host}/api/x`);
  });

  it("appends a query string when given", () => {
    expect(buildWsUrl("/api/x", { code: "ab12" })).toBe(
      `ws://${window.location.host}/api/x?code=ab12`,
    );
  });

  it("percent-encodes query values", () => {
    expect(buildWsUrl("/api/x", { code: "a b&c" })).toBe(
      `ws://${window.location.host}/api/x?code=a%20b%26c`,
    );
  });
});
