import "../sentry.server.config";
import {
  ANALYTICS_COOKIE,
  analyticsState,
  DYNAMIC_LOOKUP_STRING,
  FONT_COOKIE,
  parseFont,
  parseSystemPref,
  parseThemeMode,
  renderAnalytics,
  resolveTheme,
  SYSTEM_PREF_COOKIE,
  THEME_COOKIE,
} from "@orakl/shared";
import * as Sentry from "@sentry/sveltekit";
import { handleErrorWithSentry } from "@sentry/sveltekit";
import type { Handle, HandleFetch, ServerInit } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { isForwardedApiPath } from "@/lib/api-forward-paths";
import { maybeGzipJson } from "@/lib/compression";
import { logger, runWithRequestId } from "@/lib/logger";
import { applySecurityHeaders } from "@/lib/security-headers";
import { env } from "$env/dynamic/private";

// ─── Server init ──────────────────────────────────────────────────────────────

// The API is a separate service (`orakl-api`); the web app only forwards to it.
export const init: ServerInit = () => {
  if (!env.API_ORIGIN) throw new Error("API_ORIGIN must name the API service");
};

// ─── API forward ──────────────────────────────────────────────────────────────

// The paths in `src/lib/api-forward-paths.ts` are answered by the Hono API at
// `API_ORIGIN`; the request is proxied there over HTTP. The API learns the
// public host and protocol from `x-forwarded-host` / `x-forwarded-proto`,
// which only this hop may set.

// Headers that describe this hop, not the request: forwarding them makes the
// upstream client reject the request (RFC 9110 §7.6.1). `host` is the upstream's
// to set. `accept-encoding` is replaced, not dropped (see below).
const UPSTREAM_STRIPPED_HEADERS = [
  "connection",
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

const handleApiForward: Handle = async ({ event, resolve }) => {
  const { pathname, search } = event.url;
  if (!isForwardedApiPath(pathname)) return resolve(event);

  const url = new URL(pathname + search, env.API_ORIGIN);
  const headers = new Headers(event.request.headers);
  for (const name of UPSTREAM_STRIPPED_HEADERS) headers.delete(name);
  headers.set("x-forwarded-host", event.url.host);
  headers.set("x-forwarded-proto", event.url.protocol.replace(":", ""));
  // Node's fetch fills a missing accept-encoding with gzip, then decodes the
  // body but keeps its content-encoding header. Asking for identity keeps
  // header and body in step; the gzip decision is made once, below.
  headers.set("accept-encoding", "identity");
  const init: RequestInit & { duplex?: "half" } = {
    method: event.request.method,
    headers,
    body: event.request.body,
    redirect: "manual",
  };
  if (event.request.body) init.duplex = "half";
  const upstream = await fetch(new Request(url, init));
  return maybeGzipJson(upstream, event.request.headers.get("accept-encoding"));
};

// SvelteKit's internal `event.fetch` (what a universal load's server-side run
// uses to reach `/api/layout`) forwards only cookie, authorization, accept and
// accept-language from the page request — never GPC/DNT or the color-scheme
// client hint. Without this, the SSR pass answers analytics/theme questions
// from the wrong signals while the client-side rerun (a real browser fetch)
// answers them correctly, so the two disagree.
const FORWARDED_HINT_HEADERS = [
  "sec-gpc",
  "dnt",
  "sec-ch-prefers-color-scheme",
];

export const handleFetch: HandleFetch = ({ event, request, fetch }) => {
  if (new URL(request.url).pathname === "/api/layout") {
    for (const name of FORWARDED_HINT_HEADERS) {
      const value = event.request.headers.get(name);
      if (value) request.headers.set(name, value);
    }
  }
  return fetch(request);
};

// ─── Logging ──────────────────────────────────────────────────────────────────

const handleLogging: Handle = async ({ event, resolve }) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const { method } = event.request;
  const url = event.url.pathname;

  let response: Response;
  try {
    response = await runWithRequestId(requestId, () => resolve(event));
  } catch (err) {
    logger.error(
      { method, url, status: 500, duration: Date.now() - start, err },
      "request",
    );
    throw err;
  }

  logger.info(
    { method, url, status: response.status, duration: Date.now() - start },
    "request",
  );
  response.headers.set("X-Request-Id", requestId);
  return response;
};

// ─── Theme ────────────────────────────────────────────────────────────────────

const handleTheme: Handle = async ({ event, resolve }) => {
  const modeCookie = event.cookies.get(THEME_COOKIE);
  const mode = parseThemeMode(modeCookie);

  let sysPref: "dark" | "light" | undefined;
  if (mode === "system") {
    const hint = event.request.headers.get("Sec-CH-Prefers-Color-Scheme");
    sysPref =
      parseSystemPref(hint ?? undefined) ??
      parseSystemPref(event.cookies.get(SYSTEM_PREF_COOKIE));
  }

  const hour = new Date().getHours();
  event.locals.theme = resolveTheme(mode, hour, sysPref);
  event.locals.font = parseFont(event.cookies.get(FONT_COOKIE));
  // Analytics opt-out (decision #12): cookie or GPC/DNT → no script served.
  event.locals.analytics = analyticsState(
    event.request,
    event.cookies.get(ANALYTICS_COOKIE),
  );

  const response = await resolve(event);

  response.headers.set("Accept-CH", "Sec-CH-Prefers-Color-Scheme");
  response.headers.set("Vary", "Sec-CH-Prefers-Color-Scheme");

  return response;
};

// ─── HTML injection ───────────────────────────────────────────────────────────

// Theme script lives in app.html with nonce="%sveltekit.nonce%" — SvelteKit
// substitutes the nonce before transformPageChunk runs, satisfying the CSP.
const handleHtml: Handle = async ({ event, resolve }) => {
  const { mode, effective, phase } = event.locals.theme;
  const font = event.locals.font;
  const analytics = event.locals.analytics;
  return resolve(event, {
    transformPageChunk: ({ html }) =>
      renderAnalytics(
        html.replace(
          /(<html[^>]*?)>/,
          `$1 data-theme-mode="${mode}" data-effective-theme="${effective}" data-sky-phase="${phase ?? "night"}" data-font="${font}" data-dynamic-lookup="${DYNAMIC_LOOKUP_STRING}">`,
        ),
        analytics,
      ),
  });
};

// ─── Security headers ─────────────────────────────────────────────────────────

const handleSecurity: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  return applySecurityHeaders(response);
};

// ─── Compression ────────────────────────────────────────────────────────────

// Gzip JSON API responses (Accept-Encoding aware). Outermost wrapper so it
// compresses the fully-decorated final body. MUST stay scoped to
// application/json — SSE (text/event-stream) must keep flushing incrementally.
const handleCompression: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  return maybeGzipJson(response, event.request.headers.get("accept-encoding"));
};

// ─── Composed handle ──────────────────────────────────────────────────────────

export const handle = sequence(
  handleApiForward,
  handleCompression,
  handleLogging,
  handleTheme,
  handleHtml,
  handleSecurity,
);

// ─── Error handler ────────────────────────────────────────────────────────────

export const handleError = handleErrorWithSentry(
  ({ error, status }: { error: unknown; status: number }) => {
    if (status === 404) return { message: "Not found" };
    logger.error({ err: error }, "unhandled server error");
    return {
      message: "Internal server error",
      eventId: Sentry.lastEventId(),
      ...(import.meta.env.DEV && error instanceof Error
        ? { stack: error.stack }
        : {}),
    };
  },
);
