/** SvGrid chrome icon names → the repo's `table/*` icon set. Shared by every
 *  grid under `/manage`, so one map decides the chrome for all of them. */
export const TABLE_ICON_MAP: Record<string, string> = {
  sort: "table/arrows-sort",
  "sort-asc": "table/sort-ascending",
  "sort-desc": "table/sort-descending",
  filter: "table/filter",
  menu: "table/dots-vertical",
  group: "table/group",
  x: "table/x",
  "chevron-down": "table/chevron-down",
  autosize: "table/arrow-autofit-content",
  columns: "table/layout-columns",
  reset: "table/restore",
  "pagination-first": "table/chevron-left-pipe",
  "pagination-prev": "table/chevron-left",
  "pagination-next": "table/chevron-right",
  "pagination-last": "table/chevron-right-pipe",
  "op-startsWith": "table/filter",
  "op-greaterThan": "table/filter",
};
