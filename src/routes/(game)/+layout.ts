import { hasRole } from "@orakl/shared";

import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ parent }) => {
  const { user } = await parent();
  return {
    isAdmin: user.role === "admin",
    // hasRole, not strict equality — a signed-in curator's account role may
    // outrank "curator" (moderator/editor/admin — ROLE_HIERARCHY).
    // A member hosting on the free allowance is the curator of their lobby
    // by token (`lobbyRole`), not by account role.
    isCurator: hasRole(user.role, "curator") || user.lobbyRole === "curator",
  };
};
