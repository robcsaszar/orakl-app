import type { RoleName } from "../icon-roles";

/**
 * One place in the app an icon renders.
 * - `where`: what the admin reads, in words.
 * - `roles`: every role this place can show; `"any"` for previews that draw
 *   whatever role they are given (no split there).
 */
export type IconUsageMeta = {
  where: string;
  roles: readonly RoleName[] | "any";
};
