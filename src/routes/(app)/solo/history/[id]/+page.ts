import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Per-run review lives under /history (was /trials, before that /solo/history — ADR 0018).
export const load: PageLoad = ({ params }) => {
  redirect(301, `/history/solo/${params.id}`);
};
