import { HistoryPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";
import { parseHistoryRange } from "./range";

export const load: PageLoad = async ({ fetch, url }) => {
  const range = parseHistoryRange(url.searchParams.get("range"));
  return pageData(
    await fetch(`/api/pages/history?${new URLSearchParams({ range })}`),
    HistoryPageSchema,
  );
};
