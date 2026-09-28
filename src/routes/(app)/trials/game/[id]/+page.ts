import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

// Per-game review lives at /history/game/[id] (#788).
export const load: PageLoad = ({ params }) => {
  redirect(301, `/history/game/${params.id}`);
};
