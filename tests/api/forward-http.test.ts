// @vitest-environment node
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { with_request_store } from "@sveltejs/kit/internal/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../sentry.server.config", () => ({}));
vi.mock("@sentry/sveltekit", () => ({
  handleErrorWithSentry: (fn: unknown) => fn,
}));

// API_ORIGIN set: the forward hook proxies over HTTP to this upstream.
const env: Record<string, string> = {};
vi.mock("$env/dynamic/private", () => ({ env }));

const { handle, init } = await import("../../src/hooks.server.js");

/** Big enough that the API's compression would kick in. */
const BODY = JSON.stringify({ items: "x".repeat(4000) });
let seenAcceptEncoding: string | undefined;
let upstream: Server;

beforeAll(async () => {
  // Stands in for orakl-api: gzips JSON whenever the caller accepts gzip.
  upstream = createServer((req, res) => {
    seenAcceptEncoding = req.headers["accept-encoding"];
    res.setHeader("content-type", "application/json");
    if (/gzip/.test(seenAcceptEncoding ?? "")) {
      res.setHeader("content-encoding", "gzip");
      res.end(gzipSync(BODY));
    } else {
      res.end(BODY);
    }
  });
  await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
  const { port } = upstream.address() as AddressInfo;
  env.API_ORIGIN = `http://127.0.0.1:${port}`;
});

afterAll(() => upstream.close());

async function viaHandle(request: Request) {
  const event = { url: new URL(request.url), request };
  const state = {
    tracing: { record_span: (opts: { fn: () => unknown }) => opts.fn() },
  };
  return (await with_request_store({ event, state } as never, () =>
    handle({ event, resolve: vi.fn() } as never),
  )) as Response;
}

describe("handleApiForward — over HTTP (API_ORIGIN set)", () => {
  it("asks the API for an unencoded body, so no encoding header outlives a decoded body", async () => {
    const res = await viaHandle(
      new Request("https://orakl.quest/api/quiz/context"),
    );
    expect(seenAcceptEncoding).toBe("identity");
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(await res.text()).toBe(BODY);
  });

  it("gzips once, at the web hop, for a browser that accepts gzip", async () => {
    const res = await viaHandle(
      new Request("https://orakl.quest/api/quiz/context", {
        headers: { "accept-encoding": "gzip, deflate, br" },
      }),
    );
    expect(seenAcceptEncoding).toBe("identity");
    expect(res.headers.get("content-encoding")).toBe("gzip");
    const { gunzipSync } = await import("node:zlib");
    const body = gunzipSync(Buffer.from(await res.arrayBuffer())).toString();
    expect(body).toBe(BODY);
  });
});

describe("server init", () => {
  it("refuses to start without an API origin", async () => {
    const origin = env.API_ORIGIN;
    delete env.API_ORIGIN;
    try {
      expect(() => init()).toThrow(/API_ORIGIN/);
    } finally {
      env.API_ORIGIN = origin;
    }
  });
});
