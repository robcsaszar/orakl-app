import { SoloLayoutPageSchema } from "@orakl/protocol";
import { pageData } from "@/lib/page-data";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ fetch }) =>
  pageData(await fetch("/api/pages/solo/layout"), SoloLayoutPageSchema);
