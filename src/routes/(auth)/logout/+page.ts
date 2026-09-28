import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Signing out is a POST to /api/auth/logout; the page itself only redirects.
export const load: PageLoad = () => {
  redirect(303, "/");
};
