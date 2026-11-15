// Usage metadata only — no drawings — so server code can validate keys.
import type { RoleName } from "../icon-roles";
import { ADMIN_USAGES } from "./admin";
import { APP_USAGES } from "./app";
import { GAME_USAGES } from "./game";
import { LAYOUT_USAGES } from "./layout";
import { SKY_USAGES } from "./sky";
import type { IconUsageMeta } from "./types";
import { UI_USAGES } from "./ui";

export type { IconUsageMeta } from "./types";

/**
 * Every place an icon renders, by usage id (`<area>.<place>`). Each area's
 * file holds only ids with its own prefix, so the spread never overwrites.
 */
export const ICON_USAGES = {
  ...ADMIN_USAGES,
  ...APP_USAGES,
  ...GAME_USAGES,
  ...LAYOUT_USAGES,
  ...SKY_USAGES,
  ...UI_USAGES,
} as const satisfies Record<string, IconUsageMeta>;

/** Id of one place an icon renders; every `<Icon>` names one. */
export type IconUsage = keyof typeof ICON_USAGES;

/** Draft and file key of one usage's own drawing of a role: `role@usage`. */
export const usageKey = (role: string, usage: string) => `${role}@${usage}`;

/** Role and usage of a `role@usage` key; null unless the usage can show that role. */
export function parseUsageKey(
  key: string,
): { role: RoleName; usage: IconUsage } | null {
  const at = key.indexOf("@");
  if (at < 0) return null;
  const role = key.slice(0, at);
  const usage = key.slice(at + 1);
  if (!Object.hasOwn(ICON_USAGES, usage)) return null;
  const roles = ICON_USAGES[usage as IconUsage].roles;
  if (roles === "any" || !(roles as readonly string[]).includes(role))
    return null;
  return { role: role as RoleName, usage: usage as IconUsage };
}

/** Usages that can show `role` and can be split (not `"any"`). */
export const usagesOf = (role: string): IconUsage[] =>
  (Object.keys(ICON_USAGES) as IconUsage[]).filter((usage) => {
    const roles = ICON_USAGES[usage].roles;
    return roles !== "any" && (roles as readonly string[]).includes(role);
  });
