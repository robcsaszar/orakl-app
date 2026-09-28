import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { COMPRESS_MIN_BYTES, maybeGzipJson } from "../src/lib/compression.js";

function jsonResponse(body: string, headers: Record<string, string> = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

const big = JSON.stringify({ data: "x".repeat(COMPRESS_MIN_BYTES * 2) });

describe("maybeGzipJson", () => {
  it("gzips a large JSON body when gzip is accepted", async () => {
    const res = await maybeGzipJson(jsonResponse(big), "gzip, deflate, br");
    expect(res.headers.get("content-encoding")).toBe("gzip");
    expect(res.headers.get("vary")).toContain("Accept-Encoding");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(gunzipSync(buf).toString()).toBe(big);
    expect(res.headers.get("content-length")).toBe(String(buf.byteLength));
  });

  it("passes through unchanged when the client does not accept gzip", async () => {
    const res = await maybeGzipJson(jsonResponse(big), "br");
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(await res.text()).toBe(big);
  });

  it("passes through when accept-encoding is null", async () => {
    const res = await maybeGzipJson(jsonResponse(big), null);
    expect(res.headers.get("content-encoding")).toBeNull();
  });

  it("honors gzip;q=0 (explicitly not acceptable)", async () => {
    const res = await maybeGzipJson(jsonResponse(big), "identity, gzip;q=0");
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(await res.text()).toBe(big);
  });

  it("compresses when gzip carries a positive q-value", async () => {
    const res = await maybeGzipJson(jsonResponse(big), "gzip;q=0.5, br");
    expect(res.headers.get("content-encoding")).toBe("gzip");
  });

  it("never compresses text/event-stream (SSE)", async () => {
    const sse = new Response("data: hi\n\n", {
      headers: { "content-type": "text/event-stream" },
    });
    const res = await maybeGzipJson(sse, "gzip");
    expect(res.headers.get("content-encoding")).toBeNull();
    // Same object — body left untouched so SSE keeps streaming incrementally.
    expect(res).toBe(sse);
  });

  it("does not compress small JSON bodies", async () => {
    const small = JSON.stringify({ ok: true });
    const res = await maybeGzipJson(jsonResponse(small), "gzip");
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(await res.text()).toBe(small);
  });

  it("skips responses already content-encoded", async () => {
    const res0 = jsonResponse(big, { "content-encoding": "br" });
    const res = await maybeGzipJson(res0, "gzip");
    expect(res.headers.get("content-encoding")).toBe("br");
    expect(res).toBe(res0);
  });

  it("appends to an existing Vary header", async () => {
    const res = await maybeGzipJson(
      jsonResponse(big, { vary: "Cookie" }),
      "gzip",
    );
    expect(res.headers.get("vary")).toBe("Cookie, Accept-Encoding");
  });

  it("preserves multiple Set-Cookie headers through gzip", async () => {
    const h = new Headers({ "content-type": "application/json" });
    h.append("set-cookie", "a=1; Path=/");
    h.append("set-cookie", "b=2; Path=/");
    const res = await maybeGzipJson(new Response(big, { headers: h }), "gzip");
    expect(res.headers.get("content-encoding")).toBe("gzip");
    const cookies = res.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies).toContain("a=1; Path=/");
    expect(cookies).toContain("b=2; Path=/");
  });

  it("passes through non-JSON content types", async () => {
    const html = new Response("<html></html>".repeat(200), {
      headers: { "content-type": "text/html" },
    });
    const res = await maybeGzipJson(html, "gzip");
    expect(res.headers.get("content-encoding")).toBeNull();
  });
});
