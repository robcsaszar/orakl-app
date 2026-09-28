import { SoloLeaderboardPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  for (const key of ["scope", "board", "difficulty", "categoryId", "around"]) {
    const value = url.searchParams.get(key);
    if (value !== null) query.set(key, value);
  }
  const qs = query.toString();
  const res = await fetch(`/api/pages/solo/leaderboard${qs ? `?${qs}` : ""}`);
  return pageData(res, SoloLeaderboardPageSchema);
};
