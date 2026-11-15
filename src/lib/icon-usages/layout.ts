import type { IconUsageMeta } from "./types";

/** Usages in app chrome: header, footer, error page, feedback and dev tools. */
export const LAYOUT_USAGES = {
  "layout.analytics-control": {
    where: "Footer, analytics notice trigger",
    roles: ["analytics-on", "analytics-off"],
  },
  "layout.end-session": {
    where: "Header, end session button",
    roles: ["end-session"],
  },
  "layout.error-back": {
    where: "Error page, go back button",
    roles: ["back"],
  },
  "layout.error-home": {
    where: "Error page, go home button",
    roles: ["orakl"],
  },
  "layout.error-report": {
    where: "Error page, report error button",
    roles: ["scroll"],
  },
  "layout.error-retry": {
    where: "Error page, try again button",
    roles: ["shuffle"],
  },
  "layout.feedback-fab": {
    where: "Feedback widget, floating button",
    roles: ["pencil"],
  },
  "layout.feedback-fab-drag": {
    where: "Feedback widget, floating button drag grip",
    roles: ["drag"],
  },
  "layout.feedback-pick": {
    where: "Feedback widget, pick element button",
    roles: ["shuffle"],
  },
  "layout.feedback-repick": {
    where: "Feedback widget, pick a different element button",
    roles: ["shuffle"],
  },
  "layout.feedback-select-parent": {
    where: "Feedback widget, select parent element button",
    roles: ["collapse"],
  },
  "layout.header-badge": {
    where: "Header, right badge",
    roles: ["wreath"],
  },
  "layout.header-left-link": {
    where: "Header, left nav link",
    roles: ["profile", "sign-in", "back"],
  },
  "layout.header-right-link": {
    where: "Header, right nav link",
    roles: ["sign-up", "sign-in", "wreath", "scroll"],
  },
  "layout.mimic-cast-remove": {
    where: "Dev toolbar, remove cast row button",
    roles: ["delete"],
  },
  "layout.mimic-close": {
    where: "Dev toolbar, close button",
    roles: ["dismiss"],
  },
  "layout.mimic-fab": {
    where: "Dev toolbar, floating button",
    roles: ["settings"],
  },
  "layout.mimic-fab-drag": {
    where: "Dev toolbar, floating button drag grip",
    roles: ["drag"],
  },
  "layout.mimic-section-toggle": {
    where: "Dev toolbar, section expand marker",
    roles: ["expand"],
  },
  "layout.use-case-notice": {
    where: "Footer, what this page collects trigger",
    roles: ["reveal"],
  },
} as const satisfies Record<`layout.${string}`, IconUsageMeta>;
