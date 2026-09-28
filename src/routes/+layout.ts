import { LayoutPageSchema } from "@orakl/protocol";
import { error } from "@sveltejs/kit";
import { Either, Schema } from "effect";
import { UI_FLAGS } from "@/lib/page-config";
import type { LayoutLoad } from "./$types";

// Universal load (#1286): user, theme, and feature-flag reads for every
// route go through the API's one endpoint instead of `locals` directly, so
// the same call works whether the page renders on the web server or, later,
// in the mobile shell. It names the flags the page chrome gates on.
export const load: LayoutLoad = async ({ fetch }) => {
  const flags = new URLSearchParams({ flags: UI_FLAGS.join(",") });
  const res = await fetch(`/api/layout?${flags}`);
  if (!res.ok) throw error(res.status, "Failed to load");
  const decoded = Schema.decodeUnknownEither(LayoutPageSchema)(
    await res.json(),
  );
  if (Either.isLeft(decoded)) error(502, "Malformed response");
  return decoded.right;
};
