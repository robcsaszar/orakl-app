import { EmoteGallerySchema, ProfilePageSchema } from "@orakl/protocol";
import { Either, Schema } from "effect";
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
  const [res, emotePacks] = await Promise.all([
    fetch(`/api/pages/profile${qs ? `?${qs}` : ""}`),
    loadEmotePacks(fetch),
  ]);
  return { ...(await pageData(res, ProfilePageSchema)), emotePacks };
};

/** The emote gallery for the picker; a failed read gives none, hiding the section. */
async function loadEmotePacks(fetch: typeof globalThis.fetch) {
  if (!__FEATURE_PLAYER_EMOTES__) return [];
  try {
    const res = await fetch("/api/emotes");
    if (!res.ok) return [];
    const decoded = Schema.decodeUnknownEither(EmoteGallerySchema)(
      await res.json(),
    );
    return Either.isRight(decoded) ? decoded.right : [];
  } catch {
    return [];
  }
}
