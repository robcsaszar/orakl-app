import type { IconUsageMeta } from "./types";

/** Usages on admin pages. */
export const ADMIN_USAGES = {
  "admin.icon-preview": {
    where: "Icon admin, previews of the role being edited",
    roles: "any",
  },
} as const satisfies Record<`admin.${string}`, IconUsageMeta>;
