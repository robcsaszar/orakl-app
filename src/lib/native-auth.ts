// Native (Capacitor) auth bridging for the cross-origin solo WebSocket.
//
// Web rides the HttpOnly `game_token` cookie on the WS upgrade and never touches
// this module. Native WebViews are cross-origin (`capacitor://localhost` →
// `https://orakl.quest`), so no cookie is sent; they authenticate with a bearer
// token as the socket's first message. See ADR 0002 (dual auth transport) and
// ADR 0014 (solo WebSocket auth).

/** localStorage key the native shell writes the signed game token to on login. */
export const NATIVE_TOKEN_KEY = "orakl_auth_token";

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

/** True when running inside a Capacitor native WebView (iOS/Android shell). */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/**
 * The bearer token for the native WebSocket handshake, or null on web/guest.
 *
 * The native shell writes the signed game token to localStorage (the WebView's
 * synchronous store — needed because the socket's `onopen` must send `auth`
 * synchronously) on login and token refresh. On web, auth is the HttpOnly
 * cookie — unreadable by JS — so this is null and the cookie-on-upgrade path is
 * used instead. Gated on `isNativePlatform()` so a web page never sources a
 * token from localStorage.
 */
export function getNativeAuthToken(): string | null {
  if (!isNativePlatform()) return null;
  try {
    return window.localStorage.getItem(NATIVE_TOKEN_KEY);
  } catch {
    return null;
  }
}
