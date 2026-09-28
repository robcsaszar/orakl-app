import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// "Your trials" was renamed "Your history" (#788).
export const load: PageLoad = () => {
  redirect(301, "/history");
};
