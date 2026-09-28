import { ManageImportPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";

// This page and the endpoints behind it sit on one gate: ENABLE_IMPORTS &&
// can-import-quizzes. No row in ROUTE_GUARDS covers `/manage`, so signing in
// is this page's own job — a signed-out visitor needs the login prompt, not
// a 403 they cannot act on.
export const load: PageLoad = async ({ fetch }) => {
  await pageData(
    await fetch("/api/pages/manage/import"),
    ManageImportPageSchema,
  );
};
