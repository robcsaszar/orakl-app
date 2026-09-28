import { ResetPasswordPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  const token = url.searchParams.get("token");
  if (token !== null) query.set("token", token);
  const qs = query.toString();
  return pageData(
    await fetch(`/api/pages/auth/reset-password${qs ? `?${qs}` : ""}`),
    ResetPasswordPageSchema,
  );
};
