import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = () => {
  throw error(403, "Mimic: forced 403 for preview");
};
