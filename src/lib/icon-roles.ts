// Role metadata only — no drawings — so server code (the icon admin API,
// which runs without Vite's `?raw` imports) can read names, tiers and pairs.

/** Size steps, `xs` smallest to `xl` largest. */
export type IconStep = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Icon tiers.
 * - `control`: line icons in buttons, links, inputs and tables; stroke follows size.
 * - `emblem`: filled Orakl glyphs for badges, nav and game feedback.
 * - `art`: detailed pieces for large decorative use.
 */
export type IconTier = "control" | "emblem" | "art";

/** Every step of every tier: `px` is the rendered width and height. */
export type IconScale = {
  /** `stroke` is the stroke width in 24-grid units. */
  control: Record<IconStep, { px: number; stroke: number }>;
  emblem: Record<IconStep, { px: number }>;
  art: Record<IconStep, { px: number }>;
};

/** Every role: its tier and, for an emblem, the `art` role of its `-detail` pair. */
export const ROLE_META = {
  // Control roles — one per meaning.
  dismiss: { tier: "control" },
  delete: { tier: "control" },
  confirm: { tier: "control" },
  edit: { tier: "control" },
  reveal: { tier: "control" },
  "sign-out": { tier: "control" },
  "end-session": { tier: "control" },
  next: { tier: "control" },
  prev: { tier: "control" },
  expand: { tier: "control" },
  collapse: { tier: "control" },
  back: { tier: "control" },
  external: { tier: "control" },
  time: { tier: "control" },
  block: { tier: "control" },
  endless: { tier: "control" },
  required: { tier: "control" },
  filter: { tier: "control" },
  sort: { tier: "control" },
  "sort-asc": { tier: "control" },
  "sort-desc": { tier: "control" },
  menu: { tier: "control" },
  group: { tier: "control" },
  columns: { tier: "control" },
  autosize: { tier: "control" },
  reset: { tier: "control" },
  "first-page": { tier: "control" },
  "last-page": { tier: "control" },
  info: { tier: "control" },
  help: { tier: "control" },
  hint: { tier: "control" },
  "hint-on": { tier: "control" },
  report: { tier: "control" },
  settings: { tier: "control" },
  drag: { tier: "control" },
  share: { tier: "control" },
  "rate-up": { tier: "control" },
  "rate-down": { tier: "control" },
  locked: { tier: "control" },
  secure: { tier: "control" },
  "analytics-on": { tier: "control" },
  "analytics-off": { tier: "control" },
  shuffle: { tier: "control" },
  theme: { tier: "control" },
  undo: { tier: "control" },
  redo: { tier: "control" },
  brush: { tier: "control" },
  fill: { tier: "control" },
  erase: { tier: "control" },
  grab: { tier: "control" },
  revisions: { tier: "control" },
  layers: { tier: "control" },
  "align-center": { tier: "control" },
  "align-middle": { tier: "control" },
  "distribute-horizontal": { tier: "control" },
  "distribute-vertical": { tier: "control" },
  line: { tier: "control" },
  add: { tier: "control" },
  tag: { tier: "control" },
  upload: { tier: "control" },
  wand: { tier: "control" },
  roll: { tier: "control" },
  stop: { tier: "control" },
  "leads-to": { tier: "control" },
  failed: { tier: "control" },
  met: { tier: "control" },
  // Emblem roles named for a meaning.
  correct: { tier: "emblem" },
  incorrect: { tier: "emblem" },
  timeout: { tier: "emblem" },
  profile: { tier: "emblem" },
  "sign-in": { tier: "emblem" },
  "sign-up": { tier: "emblem" },
  "password-show": { tier: "emblem" },
  "password-hide": { tier: "emblem" },
  // Emblem glyph roles, named as the glyph.
  banner: { tier: "emblem" },
  candle: { tier: "emblem" },
  check: { tier: "emblem" },
  church: { tier: "emblem" },
  dice: { tier: "emblem" },
  difficulty: { tier: "emblem" },
  door: { tier: "emblem" },
  "empty-skull": { tier: "emblem" },
  "eye-1": { tier: "emblem" },
  "eye-2": { tier: "emblem" },
  flame: { tier: "emblem", art: "flame-detail" },
  "flower-1": { tier: "emblem" },
  heart: { tier: "emblem" },
  horn: { tier: "emblem", art: "horn-detail" },
  hourglass: { tier: "emblem" },
  "north-star": { tier: "emblem" },
  olympus: { tier: "emblem" },
  orakl: { tier: "emblem" },
  "orakl-closed": { tier: "emblem" },
  owl: { tier: "emblem" },
  pencil: { tier: "emblem" },
  rhombus: { tier: "emblem" },
  scroll: { tier: "emblem" },
  shield: { tier: "emblem" },
  star: { tier: "emblem" },
  stars: { tier: "emblem" },
  steps: { tier: "emblem" },
  sun: { tier: "emblem", art: "sun-detail" },
  "top-right": { tier: "emblem" },
  wreath: { tier: "emblem" },
  x: { tier: "emblem" },
  clock: { tier: "emblem" },
  flag: { tier: "emblem" },
  "chevron-up": { tier: "emblem" },
  // Art roles.
  bonfire: { tier: "art" },
  "flame-detail": { tier: "art" },
  "horn-detail": { tier: "art" },
  "sun-detail": { tier: "art" },
} as const satisfies Record<string, { tier: IconTier; art?: string }>;

export type RoleName = keyof typeof ROLE_META;
