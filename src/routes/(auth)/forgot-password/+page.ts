import { ForgotPasswordPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, url }) => {
  const query = new URLSearchParams();
  const email = url.searchParams.get("email");
  if (email !== null) query.set("email", email);
  const sent = url.searchParams.get("sent");
  if (sent !== null) query.set("sent", sent);
  const qs = query.toString();
  return pageData(
    await fetch(`/api/pages/auth/forgot-password${qs ? `?${qs}` : ""}`),
    ForgotPasswordPageSchema,
  );
};
