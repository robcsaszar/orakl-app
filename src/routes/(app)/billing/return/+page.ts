import { BillingReturnPageSchema } from "@orakl/protocol";
import { redirect } from "@sveltejs/kit";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

/**
 * Polar's checkout success URL. Reconciles from Customer State and lands the
 * member back on `/profile` — the redirect the endpoint's route names.
 */
export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch("/api/pages/billing/return", { method: "POST" });
  const body = await pageData(res, BillingReturnPageSchema);
  redirect(303, body.route);
};
