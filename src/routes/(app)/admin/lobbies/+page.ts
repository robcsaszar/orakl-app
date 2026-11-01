import { AdminLobbiesPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, depends }) => {
  depends("app:admin-lobbies");
  return pageData(
    await fetch("/api/pages/admin/lobbies"),
    AdminLobbiesPageSchema,
  );
};
