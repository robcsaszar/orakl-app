/**
 * Design tokens shared by the web app's Tailwind theme and the mobile app's
 * NativeWind theme. `themeCss()` in `./css.ts` renders these into
 * `theme.css`, which the web imports into `src/styles/global.css`.
 */

/** Semantic surface/state colours. Rendered inside a non-inline `@theme`
 * block so Tailwind utilities reference `var(--color-*)` and the phase
 * override rules in global.css can cascade over them. */
export const semanticColors = {
  background: "oklch(10.7% 0.031 279.92)",
  "background-lighter": "oklch(14.5% 0.042 278.50)",
  foreground: "oklch(92.3% 0.020 286.05)",
  "foreground-darker": "oklch(55%   0.060 283.00)",
  border: "oklch(27%   0.075 278.00)",
  surface: "oklch(20.2% 0.067 278.57)",
  "surface-raised": "oklch(31.9% 0.117 277.47)",
  success: "oklch(57%   0.14  156.69)",
  warning: "oklch(76%   0.17  66.31)",
  danger: "oklch(56%   0.22  28.32)",
  correct: "var(--color-success)",
  incorrect: "var(--color-danger)",
} as const;

/** Palette colours and scales. Rendered inside `@theme inline` since they
 * reference other tokens (`var(--color-primary-500)` etc). */
export const colors = {
  transparent: "transparent",
  current: "currentColor",
  facebook: "oklch(58.91% 0.2029 257.86)",
  linkedin: "oklch(54.58% 0.130182 242.2738)",
  whatsapp: "oklch(43.35% 0.0754 182.23)",
  instagram: "oklch(61.95% 0.1995 14.61)",
  youtube: "oklch(62.8% 0.2577 29.23)",

  "bronze-lightest": "oklch(95% 0.02 65)",
  "bronze-lighter": "oklch(88% 0.04 65)",
  "bronze-light": "oklch(78% 0.08 60)",
  bronze: "oklch(62% 0.11 55)",
  "bronze-dark": "oklch(42% 0.08 55)",
  "bronze-darker": "oklch(24% 0.04 55)",
  "bronze-darkest": "oklch(14% 0.02 55)",

  "silver-lightest": "oklch(97% 0.005 240)",
  "silver-lighter": "oklch(94% 0.01 240)",
  "silver-light": "oklch(82% 0.01 240)",
  silver: "oklch(70% 0.02 240)",
  "silver-dark": "oklch(45% 0.02 240)",
  "silver-darker": "oklch(22% 0.01 240)",
  "silver-darkest": "oklch(13% 0.005 240)",

  "gold-lightest": "oklch(96% 0.04 85)",
  "gold-lighter": "oklch(93% 0.06 85)",
  "gold-light": "oklch(86% 0.10 85)",
  gold: "oklch(78% 0.14 85)",
  "gold-dark": "oklch(50% 0.10 80)",
  "gold-darker": "oklch(25% 0.05 75)",
  "gold-darkest": "oklch(14% 0.03 70)",

  "platinum-lightest": "oklch(98% 0.005 160)",
  "platinum-lighter": "oklch(96% 0.015 160)",
  "platinum-light": "oklch(88% 0.02 160)",
  platinum: "oklch(79% 0.025 160)",
  "platinum-dark": "oklch(48% 0.02 160)",
  "platinum-darker": "oklch(23% 0.015 160)",
  "platinum-darkest": "oklch(13% 0.008 160)",

  "primary-50": "oklch(98.519% 0.01915 90.538)",
  "primary-100": "oklch(96.829% 0.03965 89.685)",
  "primary-200": "oklch(93.603% 0.0781 88.912)",
  "primary-300": "oklch(90.579% 0.11217 88.004)",
  "primary-400": "oklch(87.549% 0.14085 86.149)",
  "primary-500": "oklch(84.746% 0.16058 83.298)",
  "primary-600": "oklch(77.707% 0.16275 76.718)",
  "primary-700": "oklch(60.602% 0.12686 76.862)",
  "primary-800": "oklch(42.516% 0.08878 77.508)",
  "primary-900": "oklch(22.408% 0.04613 82.451)",
  "primary-950": "oklch(9.6644% 0.02005 99.316)",
  primary: "var(--color-primary-500)",

  "secondary-50": "oklch(0.966 0.008 286.4)",
  "secondary-100": "oklch(0.923 0.02 286.05)",
  "secondary-200": "oklch(0.855 0.043 285.48)",
  "secondary-300": "oklch(0.781 0.072 284.62)",
  "secondary-400": "oklch(0.713 0.101 283.54)",
  "secondary-500": "oklch(0.643 0.141 281.67)",
  "secondary-600": "oklch(0.538 0.162 279.48)",
  "secondary-700": "oklch(0.428 0.171 276.38)",
  "secondary-800": "oklch(0.319 0.117 277.47)",
  "secondary-900": "oklch(0.202 0.067 278.57)",
  "secondary-950": "oklch(0.107 0.031 279.92)",
  secondary: "var(--color-secondary-500)",

  info: "oklch(39% 0.14 257.38)",
  "info-dark": "oklch(19% 0.05 252.97)",
  "info-lighter": "oklch(84% 0.14 233.05)",
  "info-light": "oklch(93% 0.03 233.05)",

  "success-dark": "oklch(15% 0.05 182.55)",
  "success-lighter": "oklch(84.5% 0.143 164.978)",
  "success-light": "oklch(95% 0.08 163.05)",

  "warning-dark": "oklch(30% 0.06 87.41)",
  "warning-lighter": "oklch(90% 0.17 75.28)",
  "warning-light": "oklch(99% 0.02 95.28)",

  "danger-dark": "oklch(16% 0.09 26.04)",
  "danger-lighter": "oklch(71.2% 0.194 13.428)",
  "danger-light": "oklch(97% 0.17 17.38)",

  flame: "oklch(70% 0.21 40.32)",
  "flame-dark": "oklch(16% 0.25 32.32)",
  "flame-lighter": "oklch(80% 0.2 32.32)",
  "flame-light": "oklch(95% 0.1 62.32)",

  "ember-light": "oklch(0.99 0.03 88)",
  ember: "oklch(0.91 0.12 85)",
  "ember-dark": "oklch(0.60 0.10 80)",

  "spark-light": "oklch(0.98 0.09 85)",
  spark: "oklch(0.82 0.26 80)",
  "spark-dark": "oklch(0.45 0.19 75)",

  "blaze-light": "oklch(0.96 0.07 45)",
  blaze: "oklch(0.67 0.27 45)",
  "blaze-dark": "oklch(0.32 0.17 40)",

  "conflagration-light": "oklch(0.95 0.07 35)",
  conflagration: "oklch(0.62 0.24 38)",
  "conflagration-dark": "oklch(0.32 0.15 35)",

  "inferno-light": "oklch(0.95 0.05 25)",
  inferno: "oklch(0.56 0.21 25)",
  "inferno-dark": "oklch(0.28 0.14 25)",

  /** Cold, spent — the streak-lost flourish. Low chroma on purpose: ash, not fire. */
  "ash-light": "oklch(0.96 0.005 260)",
  ash: "oklch(0.72 0.01 260)",
  "ash-dark": "oklch(0.38 0.01 260)",

  "timer-counting": "var(--color-secondary-500)",
  timeout: "var(--color-incorrect-light)",
  "timer-low": "var(--color-info-light)",

  "pure-white": "oklch(100% 0 0)",
  "pure-black": "oklch(0% 0 0)",
  "pure-grey": "oklch(50% 0 0)",
} as const;

/** Type scale sub-key. */
export type TextToken = {
  value: string;
  lineHeight?: string;
  fontWeight?: string;
  letterSpacing?: string;
};

/** Type scale — headings, body, small, button. */
export const text = {
  "h1-desktop": {
    value: "64px",
    lineHeight: "88px",
    fontWeight: "700",
    letterSpacing: "-1.92px",
  },
  "h1-mobile": {
    value: "40px",
    lineHeight: "56px",
    fontWeight: "700",
    letterSpacing: "-1.2px",
  },
  "h2-desktop": {
    value: "44px",
    lineHeight: "56px",
    fontWeight: "700",
    letterSpacing: "-1.04px",
  },
  "h2-mobile": {
    value: "32px",
    lineHeight: "40px",
    fontWeight: "700",
    letterSpacing: "-0.64px",
  },
  "h3-desktop": {
    value: "36px",
    lineHeight: "44px",
    fontWeight: "700",
    letterSpacing: "-0.4px",
  },
  "h3-mobile": {
    value: "28px",
    lineHeight: "36px",
    fontWeight: "700",
    letterSpacing: "-0.3px",
  },
  "h4-desktop": {
    value: "32px",
    lineHeight: "40px",
    fontWeight: "700",
    letterSpacing: "0",
  },
  "h4-mobile": {
    value: "24px",
    lineHeight: "32px",
    fontWeight: "700",
    letterSpacing: "0",
  },
  "h5-desktop": {
    value: "24px",
    lineHeight: "32px",
    fontWeight: "600",
    letterSpacing: "0",
  },
  "h5-mobile": {
    value: "20px",
    lineHeight: "28px",
    fontWeight: "600",
    letterSpacing: "0",
  },
  "h6-desktop": {
    value: "16px",
    lineHeight: "24px",
    fontWeight: "600",
    letterSpacing: "0",
  },
  "h6-mobile": {
    value: "16px",
    lineHeight: "24px",
    fontWeight: "600",
    letterSpacing: "0",
  },
  paragraph: { value: "16px", lineHeight: "24px", letterSpacing: "0" },
  small: { value: "12px", lineHeight: "12px", letterSpacing: "0" },
  button: {
    value: "16px",
    lineHeight: "16px",
    fontWeight: "600",
    letterSpacing: "0",
  },
} as const satisfies Record<string, TextToken>;

/** Font weight scale. */
export const fontWeight = {
  extralight: "400",
  regular: "400",
  semibold: "600",
  bold: "700",
} as const;

/** Letter-tracking scale. */
export const tracking = {
  relaxed: "0.4em",
} as const;

/** Prose container widths. */
export const container = {
  "blog-post": "80ch",
} as const;

/** Responsive breakpoints. */
export const breakpoints = {
  xs: "425px",
} as const;

/** Spacing scale. */
export const spacing = {
  xs: "100px",
  sm: "200px",
  md: "300px",
  lg: "500px",
  xl: "800px",
  "2xl": "1300px",
  page: "var(--spacing-xl)",
} as const;
