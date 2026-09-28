import { hasPower } from "@orakl/shared";
import { error } from "@sveltejs/kit";

import { dev } from "$app/environment";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ parent }) => {
  const { user } = await parent();
  // Production access is `can-access-mimic` (ADR 0010, as amended). A 404
  // rather than a 403: the fixtures stay concealed, not merely refused. Dev is
  // unconditional.
  if (!dev && !hasPower(user, "can-access-mimic")) error(404, "Not found");
  return {};
};
