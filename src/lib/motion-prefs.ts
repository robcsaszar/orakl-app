/**
 * True if the viewer's OS/browser asks for reduced motion. False during SSR.
 * A snapshot at call time, not reactive: read it inside onMount or a handler.
 * A site that must follow live changes keeps its own MediaQuery.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
