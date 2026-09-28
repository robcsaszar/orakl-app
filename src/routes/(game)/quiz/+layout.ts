import { QuizContextPageSchema } from "@orakl/protocol";
import { error } from "@sveltejs/kit";
import { Either, Schema } from "effect";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ fetch, url, untrack }) => {
  // untrack: phase navigations inside /quiz/* (goto from the layout's
  // phase-effect) drop ?code, and a tracked read would re-run this load —
  // avatars query included — on every transition. The layout component seeds
  // the session once at init and ignores later `data`, so a re-run is pure
  // blocked-navigation waste. Entering the tree (join/create/refresh) still
  // runs it fresh.
  const code =
    untrack(() => url.searchParams.get("code"))
      ?.trim()
      .toLowerCase() || undefined;
  const query = new URLSearchParams(code ? { code } : {});
  const qs = query.toString();
  const res = await fetch(`/api/quiz/context${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw error(res.status, "Failed to load");
  const decoded = Schema.decodeUnknownEither(QuizContextPageSchema)(
    await res.json(),
  );
  if (Either.isLeft(decoded)) error(502, "Malformed response");
  return decoded.right;
};
