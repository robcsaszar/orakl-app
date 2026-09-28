import { ManageQuestionsPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  for (const key of [
    "page",
    "author",
    "category",
    "published",
    "q",
    "changed",
  ]) {
    const value = url.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const qs = query.toString();
  const res = await fetch(`/api/pages/manage/questions${qs ? `?${qs}` : ""}`);
  return pageData(res, ManageQuestionsPageSchema);
};
