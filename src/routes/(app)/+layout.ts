import { hasRole } from "@orakl/shared";

import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ parent }) => {
  const { user } = await parent();
  return {
    isLoggedIn: hasRole(user.role, "member"),
  };
};
