import { GameReviewPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params }) =>
  pageData(
    await fetch(`/api/pages/history/game/${encodeURIComponent(params.id)}`),
    GameReviewPageSchema,
  );
