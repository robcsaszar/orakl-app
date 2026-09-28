import type { PageLoad } from "./$types";

export const load: PageLoad = () => {
  throw new Error("Mimic: forced 500 for preview");
};
