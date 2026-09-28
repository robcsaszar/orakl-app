import { redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

/**
 * The admin area is role-hard, whole. A surface that answers to a Power lives
 * under `/manage`, where nothing has to be excused for it.
 *
 * This layout is the page lock; each page's data read is refused by its own
 * `ROUTE_GUARDS` row on the API, so a page added here is covered twice.
 */
export const load: LayoutLoad = async ({ parent }) => {
  const { user } = await parent();
  if (user.role !== "admin") redirect(303, "/");
};
