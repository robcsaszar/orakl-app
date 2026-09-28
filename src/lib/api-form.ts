import type { ActionResult, SubmitFunction } from "@sveltejs/kit";
import { applyAction } from "$app/forms";

/**
 * Finishes an enhanced submit to an `/api/*` action. `update()` runs the
 * default handling, which skips a success or failure result because the
 * action's path is not the page's; this applies those to `form` itself.
 */
export async function settleApiResult(
  result: ActionResult,
  update: () => Promise<void>,
): Promise<void> {
  await update();
  if (result.type === "success" || result.type === "failure") {
    await applyAction(result);
  }
}

/** `use:enhance` handler for a form whose action is an `/api/*` path. */
export const apiSubmit: SubmitFunction =
  () =>
  ({ result, update }) =>
    settleApiResult(result, update);
