import { LoginPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  const reset = url.searchParams.get("reset");
  if (reset !== null) query.set("reset", reset);
  const qs = query.toString();
  return pageData(
    await fetch(`/api/pages/auth/login${qs ? `?${qs}` : ""}`),
    LoginPageSchema,
  );
};
