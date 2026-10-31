import { pageData } from "@/lib/page-data";
import type { PageLoad } from "./$types";
import type { Notice } from "./types";

export const load: PageLoad = async ({ fetch }) =>
  pageData<{ notices: Notice[] }>(await fetch("/api/pages/manage/notices"));
