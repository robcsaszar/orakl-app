import type { RoleName } from "$lib/icons";

/** SvGrid chrome icon names → the repo's icon roles. Shared by every
 *  grid under `/manage`, so one map decides the chrome for all of them. */
export const TABLE_ICON_MAP: Record<string, RoleName> = {
  sort: "sort",
  "sort-asc": "sort-asc",
  "sort-desc": "sort-desc",
  filter: "filter",
  menu: "menu",
  group: "group",
  x: "dismiss",
  "chevron-down": "expand",
  autosize: "autosize",
  columns: "columns",
  reset: "reset",
  "pagination-first": "first-page",
  "pagination-prev": "prev",
  "pagination-next": "next",
  "pagination-last": "last-page",
  "op-startsWith": "filter",
  "op-greaterThan": "filter",
};
