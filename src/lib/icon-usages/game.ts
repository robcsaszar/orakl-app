import type { IconUsageMeta } from "./types";

/** Usages in quiz play, setup, results and the curator's game screens. */
export const GAME_USAGES = {
  "game.answer-status": {
    where: "Answer status, outcome mark",
    roles: ["correct", "incorrect", "timeout"],
  },
  "game.category-season-mark": {
    where: "Category picker, season tile mark",
    roles: ["locked", "scroll"],
  },
  "game.category-show-more": {
    where: "Category picker, show more or less button",
    roles: ["collapse", "expand"],
  },
  "game.ceremony-block-player": {
    where: "Ceremony leaderboard, remove and block button",
    roles: ["block"],
  },
  "game.ceremony-kicker": {
    where: "Ceremony frame, kicker mark",
    roles: ["wreath"],
  },
  "game.ceremony-remove-player": {
    where: "Ceremony leaderboard, remove button",
    roles: ["delete"],
  },
  "game.create-preset-delete": {
    where: "Quiz creation, delete preset button",
    roles: ["delete"],
  },
  "game.create-quiz-name-random": {
    where: "Quiz creation, random quiz name button",
    roles: ["dice"],
  },
  "game.custom-questions-delete": {
    where: "Custom questions list, delete button",
    roles: ["delete"],
  },
  "game.custom-questions-down-votes": {
    where: "Custom questions list, bad rating count",
    roles: ["rate-down"],
  },
  "game.custom-questions-up-votes": {
    where: "Custom questions list, good rating count",
    roles: ["rate-up"],
  },
  "game.difficulty-any": {
    where: "Difficulty picker, any difficulty option",
    roles: ["shuffle"],
  },
  "game.difficulty-level": {
    where: "Difficulty picker, level flames",
    roles: ["difficulty"],
  },
  "game.earned-badge": {
    where: "Results, earned badge emblem",
    roles: [
      "banner",
      "candle",
      "check",
      "chevron-up",
      "church",
      "clock",
      "dice",
      "difficulty",
      "empty-skull",
      "eye-1",
      "eye-2",
      "flag",
      "flame",
      "flower-1",
      "heart",
      "horn",
      "hourglass",
      "north-star",
      "olympus",
      "owl",
      "rhombus",
      "scroll",
      "shield",
      "star",
      "stars",
      "steps",
      "sun-detail",
      "sun",
      "top-right",
      "wreath",
    ],
  },
  "game.flag-follow-up-flagged": {
    where: "Question flag follow-up, flagged note",
    roles: ["report"],
  },
  "game.flag-follow-up-heading": {
    where: "Question flag follow-up, report form heading",
    roles: ["report"],
  },
  "game.flag-follow-up-note": {
    where: "Question flag follow-up, review note",
    roles: ["info"],
  },
  "game.flag-follow-up-open": {
    where: "Question flag follow-up, open button",
    roles: ["report"],
  },
  "game.identity-card-avatar-edit": {
    where: "Identity card, edit avatar button",
    roles: ["edit"],
  },
  "game.identity-card-backdrop": {
    where: "Identity card, backdrop emblem",
    roles: ["bonfire"],
  },
  "game.identity-card-nickname-cancel": {
    where: "Identity card, cancel nickname edit button",
    roles: ["dismiss"],
  },
  "game.identity-card-nickname-edit": {
    where: "Identity card, edit nickname button",
    roles: ["edit"],
  },
  "game.identity-card-nickname-save": {
    where: "Identity card, save nickname button",
    roles: ["confirm"],
  },
  "game.identity-pill-score": {
    where: "Identity pill, score mark",
    roles: ["rhombus"],
  },
  "game.identity-pill-score-delta-arrow": {
    where: "Identity pill, previous to new score arrow",
    roles: ["leads-to"],
  },
  "game.identity-pill-strikes": {
    where: "Identity pill, endless mode lives",
    roles: ["heart"],
  },
  "game.lobby-block-player": {
    where: "Lobby roster, remove and block button",
    roles: ["block"],
  },
  "game.lobby-cancel-nickname": {
    where: "Lobby roster, cancel nickname edit button",
    roles: ["dismiss"],
  },
  "game.lobby-edit-nickname": {
    where: "Lobby roster, edit nickname button",
    roles: ["edit"],
  },
  "game.lobby-remove-player": {
    where: "Lobby roster, kick button",
    roles: ["delete"],
  },
  "game.lobby-save-nickname": {
    where: "Lobby roster, save nickname button",
    roles: ["confirm"],
  },
  "game.play-emote-hint": {
    where: "Quiz play, emote hint",
    roles: ["info"],
  },
  "game.question-difficulty": {
    where: "Question badges, difficulty flames",
    roles: ["difficulty"],
  },
  "game.question-form-pair-arrow": {
    where: "Question form, matching pair arrow",
    roles: ["leads-to"],
  },
  "game.rating-thumb": {
    where: "Quiz play, question rating button",
    roles: ["confirm", "failed", "rate-down", "rate-up"],
  },
  "game.recap-correct-option": {
    where: "History recap, correct option mark",
    roles: ["correct"],
  },
  "game.result-card-outcome": {
    where: "Results, question outcome mark",
    roles: ["correct", "incorrect", "timeout"],
  },
  "game.results-account-backdrop": {
    where: "Results, account prompt backdrop emblem",
    roles: ["orakl"],
  },
  "game.setup-avatar-plaque": {
    where: "Quiz setup, avatar plaque emblem",
    roles: ["orakl"],
  },
  "game.setup-avatar-random": {
    where: "Quiz setup, random avatar button",
    roles: ["dice"],
  },
  "game.setup-nickname-random": {
    where: "Quiz setup, random nickname button",
    roles: ["dice"],
  },
  "game.setup-season-mark": {
    where: "Quiz setup, season tile mark",
    roles: ["locked", "scroll"],
  },
  "game.streak-indicator": {
    where: "Quiz play, streak flame",
    roles: ["flame"],
  },
  "game.toolbox-close-lobby": {
    where: "Curator toolbox, close lobby button",
    roles: ["door"],
  },
  "game.toolbox-close-lobby-confirm": {
    where: "Curator toolbox, close lobby confirm mark",
    roles: ["confirm"],
  },
  "game.toolbox-fab": {
    where: "Curator toolbox, floating open button",
    roles: ["scroll"],
  },
  "game.toolbox-next": {
    where: "Curator toolbox, next question button",
    roles: ["wreath", "next"],
  },
  "game.toolbox-rail-toggle": {
    where: "Curator toolbox rail, collapse toggle",
    roles: ["prev", "next"],
  },
  "game.toolbox-reset": {
    where: "Curator toolbox, reset to setup button",
    roles: ["back"],
  },
  "game.toolbox-reset-confirm": {
    where: "Curator toolbox, reset to setup confirm mark",
    roles: ["confirm"],
  },
  "game.toolbox-stop": {
    where: "Curator toolbox, stop game button",
    roles: ["stop"],
  },
  "game.toolbox-stop-confirm": {
    where: "Curator toolbox, stop game confirm mark",
    roles: ["confirm"],
  },
} as const satisfies Record<`game.${string}`, IconUsageMeta>;
