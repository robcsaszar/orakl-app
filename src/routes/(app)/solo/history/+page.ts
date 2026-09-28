import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// "Your history" lives at /history (was /trials, before that /solo/history — ADR 0018).
export const load: PageLoad = () => {
  redirect(301, "/history");
};
