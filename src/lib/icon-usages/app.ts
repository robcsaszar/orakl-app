import type { IconUsageMeta } from "./types";

/** Usages on app pages: admin, manage, history, profile and solo. */
export const APP_USAGES = {
  "app.authored-details": {
    where: "Authored questions list, details button",
    roles: ["reveal"],
  },
  "app.authored-modal-promote": {
    where: "Authored question modal, promote button",
    roles: ["confirm"],
  },
  "app.authored-promote": {
    where: "Authored questions list, promote button",
    roles: ["confirm"],
  },
  "app.categories-category-delete": {
    where: "Manage categories, delete category button",
    roles: ["delete"],
  },
  "app.categories-category-delete-confirm": {
    where: "Manage categories, delete category confirm step",
    roles: ["confirm"],
  },
  "app.categories-season-delete": {
    where: "Manage categories, delete season button",
    roles: ["delete"],
  },
  "app.categories-season-delete-confirm": {
    where: "Manage categories, delete season confirm step",
    roles: ["confirm"],
  },
  "app.categories-tag-delete": {
    where: "Manage categories, delete tag button",
    roles: ["delete"],
  },
  "app.categories-tag-delete-confirm": {
    where: "Manage categories, delete tag confirm step",
    roles: ["confirm"],
  },
  "app.flag-roles-toggle": {
    where: "Feature flags, expand roles button",
    roles: ["expand"],
  },
  "app.history-endless-badge": {
    where: "History list, endless badge",
    roles: ["endless"],
  },
  "app.history-solo-endless-badge": {
    where: "Solo run detail, endless badge",
    roles: ["endless"],
  },
  "app.history-strongest-category": {
    where: "History stats, strongest category",
    roles: ["star"],
  },
  "app.history-weakest-category": {
    where: "History stats, weakest category",
    roles: ["candle"],
  },
  "app.home-dismiss-quiz": {
    where: "Home actions, dismiss quiz button",
    roles: ["dismiss"],
  },
  "app.home-dismiss-quiz-confirm": {
    where: "Home actions, dismiss quiz confirm step",
    roles: ["confirm"],
  },
  "app.leaderboard-board-tab": {
    where: "Solo leaderboard, board tab",
    roles: ["flame", "hourglass", "shield"],
  },
  "app.leaderboard-claimed": {
    where: "Solo leaderboard, run saved banner",
    roles: ["wreath"],
  },
  "app.leaderboard-share-rank": {
    where: "Solo leaderboard, share rank link",
    roles: ["share"],
  },
  "app.leaderboard-streak": {
    where: "Solo leaderboard, streak column",
    roles: ["flame"],
  },
  "app.lobbies-block-player": {
    where: "Admin lobbies, remove and block player button",
    roles: ["block"],
  },
  "app.lobbies-remove-player": {
    where: "Admin lobbies, remove player button",
    roles: ["delete"],
  },
  "app.lobbies-rename-cancel": {
    where: "Admin lobbies, cancel rename button",
    roles: ["dismiss"],
  },
  "app.lobbies-rename-player": {
    where: "Admin lobbies, rename player button",
    roles: ["edit"],
  },
  "app.lobbies-rename-save": {
    where: "Admin lobbies, save rename button",
    roles: ["confirm"],
  },
  "app.notices-action": {
    where: "Manage notices, action button",
    roles: ["confirm"],
  },
  "app.ratings-delete": {
    where: "Question ratings, delete button",
    roles: ["delete"],
  },
  "app.ratings-down": {
    where: "Question ratings, thumbs down count",
    roles: ["rate-down"],
  },
  "app.ratings-up": {
    where: "Question ratings, thumbs up count",
    roles: ["rate-up"],
  },
  "app.sessions-details": {
    where: "Sessions list, details tooltip",
    roles: ["info"],
  },
  "app.solo-cta-headline": {
    where: "Solo guest prompt, headline",
    roles: ["sun"],
  },
  "app.solo-cta-perk": {
    where: "Solo guest prompt, perk list",
    roles: ["star"],
  },
  "app.solo-cta-sun-detail": {
    where: "Solo guest prompt, background sun",
    roles: ["sun-detail"],
  },
  "app.solo-play-continue": {
    where: "Solo play, continue button",
    roles: ["next"],
  },
  "app.solo-play-faster-than": {
    where: "Solo play, faster than players note",
    roles: ["time"],
  },
  "app.solo-results-flame": {
    where: "Solo results, streak card",
    roles: ["flame"],
  },
  "app.solo-results-flame-detail": {
    where: "Solo results, streak card background",
    roles: ["flame-detail"],
  },
  "app.solo-results-horn": {
    where: "Solo results, record card",
    roles: ["horn"],
  },
  "app.solo-results-horn-detail": {
    where: "Solo results, record card background",
    roles: ["horn-detail"],
  },
  "app.solo-setup-claimed": {
    where: "Solo setup, run saved banner",
    roles: ["wreath"],
  },
  "app.users-powers-toggle": {
    where: "Admin users, powers show or hide button",
    roles: ["expand", "collapse"],
  },
} as const satisfies Record<`app.${string}`, IconUsageMeta>;
