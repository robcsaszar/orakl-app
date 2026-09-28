/**
 * Which `/api/*` requests the web app hands to the Hono API: exact paths for
 * single endpoints, and prefixes (trailing slash) for whole groups, dynamic
 * segments included. Every other path is a SvelteKit route.
 */
export const FORWARDED_API_PATHS: ReadonlySet<string> = new Set([
  "/api/feedback",
  "/api/layout",
  "/api/game",
  "/api/lobby",
  "/api/lobby/join",
  "/api/lobby/me",
  "/api/lobby/player",
  "/api/quiz/journey",
  "/api/quiz/context",
  "/api/quiz/results",
  "/api/avatars",
  "/api/categories",
  "/api/categories/color",
  "/api/topics",
  "/api/topics/color",
  "/api/draw-questions",
  "/api/solo/leaderboard",
  "/api/upload-image",
  "/api/webhooks/polar",
  "/api/analytics",
  "/api/font",
  "/api/theme",
  "/solo/leaderboard/card",
]);

export const FORWARDED_API_PREFIXES: readonly string[] = [
  "/api/auth/",
  "/api/manage/",
  "/api/pages/",
  "/api/profile/",
  "/api/custom-questions/",
  "/api/curator/",
  "/api/admin/",
  "/api/history/",
  "/api/questions/",
  "/media/",
];

export function isForwardedApiPath(pathname: string): boolean {
  if (FORWARDED_API_PATHS.has(pathname)) return true;
  return FORWARDED_API_PREFIXES.some(
    (prefix) => pathname === prefix.slice(0, -1) || pathname.startsWith(prefix),
  );
}
