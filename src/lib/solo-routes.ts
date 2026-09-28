/**
 * Phase-derived route resolver for the solo journey (ADR 0004 analogue).
 * Pure and dependency-free: imported by the `(app)/solo` layout for client
 * navigation. Solo phase is client-authoritative (sessionStorage), not server.
 */
export type SoloPhase = "setup" | "playing" | "result";

const SOLO_ROUTES: Record<SoloPhase, string> = {
  setup: "/solo/setup",
  playing: "/solo/play",
  result: "/solo/results",
};

export function routeForSoloPhase(phase: SoloPhase): string {
  return SOLO_ROUTES[phase];
}

/**
 * Routes the phase machine owns (and may auto-redirect between). Side pages
 * under `/solo` like the leaderboard are intentionally excluded so the layout
 * doesn't bounce the user off them.
 */
export function isSoloPhaseRoute(pathname: string): boolean {
  return (Object.values(SOLO_ROUTES) as string[]).includes(pathname);
}
