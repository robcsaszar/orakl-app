/**
 * Build a same-origin WS URL for a browser socket: `wss:` over `https:`,
 * `ws:` otherwise, current host, the given path, and an optional query
 * string. SSR-safe — returns "" with no `window` (the caller's connect then
 * no-ops, matching {@link WsClient.connect}'s own SSR guard). The single
 * protocol ternary for every WS URL builder (player session, solo mode).
 *
 * Reads `window.location`, so it stays in the web app — `@orakl/client-core`'s
 * `WsClient` takes the resulting URL (or a URL function) explicitly and never
 * resolves one itself.
 */
export function buildWsUrl(
  path: string,
  query?: Record<string, string>,
): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const base = `${proto}//${window.location.host}${path}`;
  if (!query) return base;
  const qs = Object.entries(query)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${base}?${qs}`;
}
