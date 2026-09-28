const MAX_ENTRIES = 5;

/** Last few pathnames visited this session — cheap "breadcrumbs" for error
 *  reports (Sentry's own breadcrumb trail isn't retrievable as text client-side,
 *  it only lives in the dashboard against the event ID). Written from root
 *  `+layout.svelte`'s `afterNavigate`; read by the 500 page's report builder. */
export const routeHistory = $state({ paths: [] as string[] });

export function recordRoute(pathname: string): void {
  if (routeHistory.paths.at(-1) === pathname) return;
  routeHistory.paths.push(pathname);
  if (routeHistory.paths.length > MAX_ENTRIES) routeHistory.paths.shift();
}
