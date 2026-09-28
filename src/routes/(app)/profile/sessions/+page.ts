import { ProfileSessionsPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) =>
  pageData(
    await fetch("/api/pages/profile/sessions"),
    ProfileSessionsPageSchema,
  );
