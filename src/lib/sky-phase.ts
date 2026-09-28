import type { SkyPhase } from "@orakl/shared";
import { SKY_PHASES } from "@orakl/shared";

// Single source of truth for the live client-side sky phase.
//
// The phase lives on the `data-sky-phase` DOM attribute, written client-side by
// the theme picker (fixed phases), DynamicBackground (clock) and the system-mode
// inline script (matchMedia) — none of which round-trip through server data. One
// shared MutationObserver fans changes out to all subscribers so consumers don't
// each spin up their own observer.

type Listener = (phase: SkyPhase) => void;

const PHASE_SET = new Set<string>(SKY_PHASES);
const listeners = new Set<Listener>();
let observing = false;
let current: SkyPhase | undefined;

function readPhase(): SkyPhase | undefined {
  if (typeof document === "undefined") return undefined;
  const p = document.documentElement.dataset.skyPhase;
  return p && PHASE_SET.has(p) ? (p as SkyPhase) : undefined;
}

function ensureObserver() {
  if (observing || typeof document === "undefined") return;
  observing = true;
  current = readPhase();
  const obs = new MutationObserver(() => {
    const p = readPhase();
    if (p && p !== current) {
      current = p;
      for (const l of listeners) l(p);
    }
  });
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-sky-phase"],
  });
}

/**
 * Subscribe to live sky-phase changes. Fires immediately with the current phase
 * (if known) and on every subsequent change. Returns an unsubscribe fn. No-op
 * on the server. Call from onMount / client-only code.
 */
export function subscribeSkyPhase(cb: Listener): () => void {
  ensureObserver();
  listeners.add(cb);
  if (current) cb(current);
  return () => {
    listeners.delete(cb);
  };
}
