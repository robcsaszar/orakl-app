import { ProfilePageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  const claimed = url.searchParams.get("claimed");
  if (claimed !== null) query.set("claimed", claimed);
  const verified = url.searchParams.get("verified");
  if (verified !== null) query.set("verified", verified);
  const tab = url.searchParams.get("tab");
  if (tab !== null) query.set("tab", tab);
  const qs = query.toString();
  const res = await fetch(`/api/pages/profile${qs ? `?${qs}` : ""}`);
  return pageData(res, ProfilePageSchema);
};
