import { CuratorCreatePageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import { requireJourney } from "@/lib/quiz-guard";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  await requireJourney(fetch, [
    "code-entry",
    "setup",
    "lobby",
    "final_scores",
    "role_selection",
  ]);
  return pageData(
    await fetch("/api/pages/curator/create"),
    CuratorCreatePageSchema,
  );
};
