import { AdminLobbiesPageSchema } from "@orakl/protocol";
import type { DbAvatar } from "@orakl/shared";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, depends }) => {
  depends("app:admin-lobbies");
  // Uploaded avatars resolve roster avatar ids beside the static set; a
  // failed read leaves those rows on PlayerRow's empty avatar.
  const [page, avatars] = await Promise.all([
    fetch("/api/pages/admin/lobbies").then((res) =>
      pageData(res, AdminLobbiesPageSchema),
    ),
    fetch("/api/avatars")
      .then((res) => (res.ok ? (res.json() as Promise<DbAvatar[]>) : []))
      .catch((): DbAvatar[] => []),
  ]);
  return { ...page, avatars };
};
