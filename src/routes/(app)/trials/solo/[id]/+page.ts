import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Per-run review lives at /history/solo/[id] (#788).
export const load: PageLoad = ({ params }) => {
  redirect(301, `/history/solo/${params.id}`);
};
