import { promisify } from "node:util";
import { gzip as gzipCb } from "node:zlib";

const gzip = promisify(gzipCb);

/** Below this size gzip's overhead (and CPU) isn't worth the few saved bytes. */
export const COMPRESS_MIN_BYTES = 1024;

/**
 * Does the client actually accept gzip? Honors RFC 7231 §5.3.4 quality values:
 * `gzip;q=0` means gzip is explicitly *not* acceptable, so a plain
 * `includes("gzip")` would wrongly compress for such clients.
 */
function acceptsGzip(header: string | null): boolean {
  if (!header) return false;
  for (const part of header.split(",")) {
    const [coding, ...params] = part.trim().split(";");
    if (coding.trim().toLowerCase() !== "gzip") continue;
    const q = params.find((p) => p.trim().toLowerCase().startsWith("q="));
    return !q || Number(q.split("=")[1]) > 0;
  }
  return false;
}

/**
 * Copy headers for a rebuilt Response, preserving multiple `Set-Cookie` headers.
 * The `Headers` copy constructor can fold repeated Set-Cookie into one
 * comma-joined value (corrupting cookies), so re-append them individually —
 * endpoints like /api/game/state reissue the game token via Set-Cookie.
 */
function cloneHeaders(src: Headers): Headers {
  const headers = new Headers(src);
  const cookies = src.getSetCookie?.() ?? [];
  if (cookies.length) {
    headers.delete("set-cookie");
    for (const c of cookies) headers.append("set-cookie", c);
  }
  return headers;
}

/**
 * Gzip a JSON response body when the client advertises gzip support.
 *
 * Scope is deliberately narrow — **only `application/json`** is compressed:
 * - `text/event-stream` (SSE) and every other content type pass through
 *   untouched. Buffering an SSE stream to gzip it would defeat incremental
 *   flush and stall realtime updates.
 * - Responses already carrying `Content-Encoding`, or with no body, pass
 *   through unchanged.
 * - Payloads under {@link COMPRESS_MIN_BYTES} pass through (re-buffered, since
 *   reading the body consumes it) without compression.
 *
 * Returns a new `Response` with `Content-Encoding: gzip` + `Vary:
 * Accept-Encoding`, or the original/equivalent response when compression
 * doesn't apply.
 */
export async function maybeGzipJson(
  response: Response,
  acceptEncoding: string | null,
): Promise<Response> {
  if (!acceptsGzip(acceptEncoding)) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/json") ||
    response.headers.has("content-encoding") ||
    !response.body
  ) {
    return response;
  }

  // Reading the body consumes the stream, so we rebuild the Response either way.
  const raw = Buffer.from(await response.arrayBuffer());
  const headers = cloneHeaders(response.headers);

  if (raw.byteLength < COMPRESS_MIN_BYTES) {
    headers.set("content-length", String(raw.byteLength));
    return new Response(raw, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const gz = await gzip(raw);
  headers.set("content-encoding", "gzip");
  headers.set("content-length", String(gz.byteLength));
  const vary = headers.get("vary");
  if (!vary) headers.set("vary", "Accept-Encoding");
  else if (!/\bAccept-Encoding\b/i.test(vary))
    headers.set("vary", `${vary}, Accept-Encoding`);

  return new Response(gz, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
