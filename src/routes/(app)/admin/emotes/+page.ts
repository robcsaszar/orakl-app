import { ManageEmotesPageSchema } from "@orakl/protocol";
import { error } from "@sveltejs/kit";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, depends }) => {
  if (!__FEATURE_PLAYER_EMOTES__) error(404, "Not found");
  depends("app:admin-emotes");
  return pageData(
    await fetch("/api/pages/admin/emotes"),
    ManageEmotesPageSchema,
  );
};
