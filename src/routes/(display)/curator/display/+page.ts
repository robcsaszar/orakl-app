import { DisplayPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  const t = url.searchParams.get("t");
  if (t !== null) query.set("t", t);
  const qs = query.toString();
  return pageData(
    await fetch(`/api/pages/display${qs ? `?${qs}` : ""}`),
    DisplayPageSchema,
  );
};
