import { ManageFlaggedQuestionsPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  const status = url.searchParams.get("status");
  if (status !== null) query.set("status", status);
  const page = url.searchParams.get("page");
  if (page !== null) query.set("page", page);
  const qs = query.toString();
  const res = await fetch(
    `/api/pages/manage/flagged-questions${qs ? `?${qs}` : ""}`,
  );
  return pageData(res, ManageFlaggedQuestionsPageSchema);
};
