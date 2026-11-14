import { Schema } from "effect";
import { pageData } from "@/lib/page-data";
import { IconScaleSchema } from "@/lib/schemas/icon-admin.schema";
import type { PageLoad } from "./$types";

const IconAdminPageSchema = Schema.Struct({
  drafts: Schema.Record({ key: Schema.String, value: Schema.String }),
  styles: Schema.Record({ key: Schema.String, value: Schema.String }),
  scale: Schema.NullOr(IconScaleSchema),
  outOfStep: Schema.Array(Schema.String),
});

export const load: PageLoad = async ({ fetch, depends }) => {
  depends("app:admin-icons");
  return pageData(await fetch("/api/admin/icons"), IconAdminPageSchema);
};
