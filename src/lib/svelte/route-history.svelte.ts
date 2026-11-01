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

/** Pathname the current page was pushed from, or null when that is unknown
 *  (first load, browser back/forward). `BackButton` reads it: when it equals
 *  the button's target, a `history.back()` returns to that exact entry — tab,
 *  filters and scroll intact — instead of pushing a fresh copy. */
export const backTrail = $state({ from: null as string | null });

/** Updates `backTrail` from one `afterNavigate`. A query-only change on the
 *  same path (a tab or filter swap) keeps the trail; a popstate clears it,
 *  since the entry behind the new page is unknown. */
export function recordNavigation(nav: {
  type: string;
  from: string | null;
  to: string | null;
}): void {
  if (nav.from !== null && nav.from === nav.to) return;
  backTrail.from =
    nav.type === "link" || nav.type === "goto" || nav.type === "form"
      ? nav.from
      : null;
}
