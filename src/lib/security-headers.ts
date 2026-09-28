export const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "https://visitors.nhg.app"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  "connect-src": [
    "'self'",
    "blob:",
    "https://visitors.nhg.app",
    "https://bugs.nhg.app",
    "wss:",
    "ws:",
  ],
  "font-src": ["'self'", "data:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
} as const;

export const CSP_HEADER = Object.entries(CSP_DIRECTIVES)
  .map(([key, values]) => `${key} ${values.join(" ")}`)
  .join("; ");

/**
 * Apply the shared security header set to a response: CSP (when the response
 * doesn't already carry a nonce-bearing one), nosniff, frame denial, referrer
 * policy, permissions policy, HSTS, and no-store on uncached HTML.
 */
export function applySecurityHeaders(response: Response): Response {
  // For HTML responses SvelteKit sets a nonce-bearing CSP via kit.csp; don't overwrite it.
  if (!response.headers.has("Content-Security-Policy")) {
    response.headers.set("Content-Security-Policy", CSP_HEADER);
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );

  const contentType = response.headers.get("Content-Type") ?? "";
  if (
    contentType.includes("text/html") &&
    !response.headers.has("Cache-Control")
  ) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}
