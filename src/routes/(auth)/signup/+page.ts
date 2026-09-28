import { SignupPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  const claim = url.searchParams.get("claim");
  if (claim !== null) query.set("claim", claim);
  const nickname = url.searchParams.get("nickname");
  if (nickname !== null) query.set("nickname", nickname);
  const qs = query.toString();
  return pageData(
    await fetch(`/api/pages/auth/signup${qs ? `?${qs}` : ""}`),
    SignupPageSchema,
  );
};
