export const HISTORY_TABS = ["solo", "multiplayer"] as const;
export type HistoryTab = (typeof HISTORY_TABS)[number];

/** `tabParam` if it names a known tab, else `null` — the caller picks the default. */
export function parseHistoryTab(tabParam: string | null): HistoryTab | null {
  return (HISTORY_TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as HistoryTab)
    : null;
}
