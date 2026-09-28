import type { LawfulBasis } from "./ledger.js";

/**
 * Shared front matter for the three hand-written legal pages (map #840,
 * decision #12). The pages render the ledger; this holds what the ledger
 * does not: the effective date, the per-page changelog, and the plain-word
 * label for each lawful basis.
 *
 * Effective date is set when the privacy-compliance PR merges (decision #18,
 * Route 10 confirms it). Until then the pages are not served.
 */
export const EFFECTIVE_DATE = "2026-09-20";

export type ChangelogEntry = { date: string; note: string };

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: EFFECTIVE_DATE,
    note: "Terms: the hosting subscription — prices, renewal, the seven-day grace after a failed payment, lifetime, cancellation through Polar's customer portal, and refunds handled by Polar as merchant of record. Privacy: Polar named as the payment processor.",
  },
  {
    date: "2026-09-09",
    note: "First version of these pages, rewritten by hand from the privacy ledger to describe exactly what the app does.",
  },
];

export const basisLabel: Record<LawfulBasis, string> = {
  contract: "Performing our contract with you",
  "legitimate-interest": "Our legitimate interests",
  consent: "Your consent",
  "strictly-necessary": "Strictly necessary to run the service",
};
