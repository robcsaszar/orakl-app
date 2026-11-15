import type { IconUsageMeta } from "./types";

/** Usages inside shared UI components (`src/lib/components/ui`). */
export const UI_USAGES = {
  "ui.back-button": {
    where: "Back button, arrow",
    roles: ["back"],
  },
  "ui.checkbox-check": {
    where: "Checkbox, check mark",
    roles: ["confirm"],
  },
  "ui.confirm-default": {
    where: "Confirm button, default icon",
    roles: ["hourglass"],
  },
  "ui.confirm-progress": {
    where: "Confirm button, countdown hourglass",
    roles: ["hourglass"],
  },
  "ui.data-grid-card-expand": {
    where: "Data grid card, more details toggle",
    roles: ["expand"],
  },
  "ui.field-description-icon": {
    where: "Form field, description icon",
    roles: ["info", "help", "candle"],
  },
  "ui.field-hint-toggle": {
    where: "Form field, description toggle",
    roles: ["hint", "hint-on"],
  },
  "ui.field-required": {
    where: "Form field label, required mark",
    roles: ["required"],
  },
  "ui.icon-draft-discard": {
    where: "Icon draft bar, discard button",
    roles: ["delete"],
  },
  "ui.icon-draft-open-admin": {
    where: "Icon draft bar, open admin link",
    roles: ["settings"],
  },
  "ui.icon-draft-save": {
    where: "Icon draft bar, save button",
    roles: ["upload"],
  },
  "ui.link-external": {
    where: "Link, external mark",
    roles: ["external"],
  },
  "ui.link-inline-arrow": {
    where: "Link, inline arrow",
    roles: ["next"],
  },
  "ui.logout-button": {
    where: "Sign out button",
    roles: ["sign-out"],
  },
  "ui.password-rule-status": {
    where: "Password strength, rule met or failed",
    roles: ["met", "failed"],
  },
  "ui.password-strength-close": {
    where: "Password field, close the strength check",
    roles: ["dismiss"],
  },
  "ui.password-strength-open": {
    where: "Password field, open the strength check",
    roles: ["secure"],
  },
  "ui.password-toggle": {
    where: "Password field, show or hide button",
    roles: ["password-show", "password-hide"],
  },
  "ui.popover-close": {
    where: "Popover, close button",
    roles: ["dismiss"],
  },
  "ui.radio-locked": {
    where: "Radio option, locked mark",
    roles: ["locked"],
  },
  "ui.rarity-legend-step": {
    where: "Rarity legend, step arrow",
    roles: ["leads-to"],
  },
  "ui.ring-timer-outcome": {
    where: "Ring timer, outcome mark",
    roles: ["correct", "incorrect", "wreath", "timeout"],
  },
  "ui.stat-tile-flame": {
    where: "Stat tile, flame mark",
    roles: ["flame"],
  },
  "ui.table-grid": {
    where: "Data grid chrome, sort, filter, menu, paging and column icons",
    roles: [
      "sort",
      "sort-asc",
      "sort-desc",
      "filter",
      "menu",
      "group",
      "dismiss",
      "expand",
      "autosize",
      "columns",
      "reset",
      "first-page",
      "prev",
      "next",
      "last-page",
    ],
  },
  "ui.tabs-scroll-next": {
    where: "Tabs, scroll later button",
    roles: ["next"],
  },
  "ui.tabs-scroll-prev": {
    where: "Tabs, scroll earlier button",
    roles: ["prev"],
  },
} as const satisfies Record<`ui.${string}`, IconUsageMeta>;
