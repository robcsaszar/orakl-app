---
version: "alpha"
name: "Orakl"
description: "Oracle-themed real-time quiz platform with mythology-inspired visual language"

colors:
  # Semantic surface tokens — dark mode default; overridden by data-effective-theme / data-sky-phase
  background: "oklch(10.7% 0.031 279.92)"
  background-lighter: "oklch(14.5% 0.042 278.50)"
  foreground: "oklch(92.3% 0.020 286.05)"
  foreground-darker: "oklch(55% 0.060 283.00)"
  border: "oklch(27% 0.075 278.00)"
  surface: "oklch(20.2% 0.067 278.57)"
  surface-raised: "oklch(31.9% 0.117 277.47)"

  # Primary — warm golden amber; the oracle's light
  primary: "oklch(84.746% 0.16058 83.298)"
  primary-light: "oklch(90.579% 0.11217 88.004)"
  primary-dark: "oklch(60.602% 0.12686 76.862)"

  # Secondary — cool indigo-violet; the deep archive
  secondary: "oklch(64.3% 0.141 281.67)"
  secondary-light: "oklch(78.1% 0.072 284.62)"
  secondary-dark: "oklch(42.8% 0.171 276.38)"
  secondary-darkest: "oklch(10.7% 0.031 279.92)"

  # Prestige metallic palette — used for scoring tiers, leaderboards, achievements
  gold: "oklch(78% 0.14 85)"
  silver: "oklch(70% 0.02 240)"
  bronze: "oklch(62% 0.11 55)"
  platinum: "oklch(79% 0.025 160)"

  # State — success, warning, danger, info
  success: "oklch(57% 0.14 156.69)"
  success-light: "oklch(95% 0.08 163.05)"
  success-dark: "oklch(15% 0.05 182.55)"
  warning: "oklch(76% 0.17 66.31)"
  warning-light: "oklch(99% 0.02 95.28)"
  danger: "oklch(56% 0.22 28.32)"
  danger-light: "oklch(97% 0.17 17.38)"
  danger-dark: "oklch(16% 0.09 26.04)"
  info: "oklch(39% 0.14 257.38)"
  info-light: "oklch(93% 0.03 233.05)"

  # Quiz answer feedback — map to state tokens
  correct: "{colors.success}"
  incorrect: "{colors.danger}"

  # Featured / promotional — violet accent for upsell surfaces
  featured: "oklch(57% 0.21 293)"

  # Flame — hot-streak / momentum signal (streak indicators, ceremony stats, difficulty selector)
  flame: "oklch(70% 0.21 40.32)"
  flame-dark: "oklch(16% 0.25 32.32)"
  flame-lighter: "oklch(80% 0.2 32.32)"
  flame-light: "oklch(95% 0.1 62.32)"

  pure-white: "oklch(100% 0 0)"
  pure-black: "oklch(0% 0 0)"

typography:
  display:
    fontFamily: "\"Albertus Nova\", serif"
    fontSize: "64px"
    fontWeight: 700
    lineHeight: "88px"
    letterSpacing: "-1.92px"
  heading-xl:
    fontFamily: "\"Albertus Nova\", serif"
    fontSize: "44px"
    fontWeight: 700
    lineHeight: "56px"
    letterSpacing: "-1.04px"
  heading-lg:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "44px"
    letterSpacing: "-0.4px"
  heading-md:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "0"
  heading-sm:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "0"
  heading-xs:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "0"
  body-lg:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: "28px"
    letterSpacing: "0"
  body:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0"
  body-sm:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "12px"
    letterSpacing: "0"
  label:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0"
  overline:
    fontFamily: "\"Geist\", sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: "1"
    letterSpacing: "0.05em"
  mono:
    fontFamily: "\"Geist Mono\", monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "0"
  # Accessibility override — replaces Albertus Nova, Geist, and Geist Mono everywhere
  # when html[data-font="dyslexic"] is set (user preference, SSR + live toggle)
  dyslexic-override:
    fontFamily: "\"OpenDyslexic\", sans-serif"
    fontWeight: 400

rounded:
  sm: "8px"        # form controls, small interactive elements
  md: "16px"       # inputs, inner panels — rounded-2xl
  lg: "24px"       # cards, modals — rounded-3xl
  full: "9999px"   # pill badges, tags
  squircle: "16px" # + corner-shape: superellipse(2); the default button shape

spacing:
  # Section / container sizing scale (not 4px grid)
  xs: "100px"
  sm: "200px"
  md: "300px"
  lg: "500px"
  xl: "800px"
  2xl: "1300px"
  # Base grid: Tailwind 4px default (1 = 4px, 2 = 8px, 4 = 16px …)
  page: "{spacing.xl}"
  header-height: "160px"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.squircle}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.squircle}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.squircle}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.squircle}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger-light}"
    rounded: "{rounded.squircle}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-cta:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.squircle}"
    padding: "12px 32px"
    typography: "18px / 600"
  input:
    backgroundColor: "{colors.background-lighter}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    typography: "{typography.body}"
  card-default:
    backgroundColor: "oklch(64.3% 0.141 281.67 / 5%)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-raised:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-difficulty:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    typography: "{typography.overline}"
  badge-pill:
    rounded: "{rounded.full}"
    padding: "4px 12px"
    typography: "{typography.body-sm}"
  badge-role:
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.body-sm}"
  card-flame:
    backgroundColor: "oklch(70% 0.21 40.32 / 20%)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-ground:
    backgroundColor: "oklch(64.3% 0.141 281.67 / 5%)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  dialog:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  drawer:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.squircle}"
    padding: "0"
    typography: "{typography.body-sm}"
---

## Overview

Orakl draws its character from classical antiquity — the oracle, the chronicle, the vault — translated into a sparse, modern interface. The atmosphere is one of quiet authority: dark skies, warm golden light, cool indigo depth. It is a serious tool worn lightly, purposeful without ceremony.

The design system is dark-first and dynamically sky-aware: a procedural background shifts through eight celestial phases (night, dawn, morning, noon, evening, sunset, dusk, night again), and semantic colour tokens respond to each phase rather than holding static values.

Token values (colours, type scale, weights, spacing, breakpoints) live in `packages/design-tokens` (`@orakl/design-tokens`) — the one source the web's Tailwind and the mobile app's NativeWind read. `theme.css` there is generated from it with `pnpm tokens:build`; a test fails when the two drift.

### Register

**product** — design serves the app. Every screen is a workflow surface (host, join, play, review, manage), not a marketing surface; there is no landing or campaign layer. Layout, motion, and colour decisions optimise for task completion under time pressure, not for first impressions.

### Users & Purpose

Curators (granted role) host quiz sessions for casual social play — friends, colleagues, informal group settings. Players join anonymously from their own device via link, QR code, or join code; no account required. The job to be done is fast, low-friction group play: a curator wants to get a room of people playing within seconds, and a player wants to join, answer, and see how they did without setup friction. Solo mode ("Trial of the Sphinx") extends the same experience to a single player, with a guest tier that converts into a signed-in tier.

### Brand Personality

Measured, intelligent, grounded. Orakl behaves like a referee who knows the rules and has no interest in spectacle — confident without needing to prove it, precise without being cold. Interactions are immediate; animations serve clarity, not decoration.

### Design Principles

- **Semantic over literal** — reach for tokens that carry meaning (`background`, `foreground`, `primary`), never raw scale values or hardcoded phase colours.
- **Clarity over decoration** — motion and visual flourish exist only to clarify state changes (answer reveal, streak, score), never as ornament.
- **Precision over spectacle** — the interface confirms and informs quickly; it does not perform enthusiasm the way generic party-quiz apps do.
- **One shape language** — the squircle is the interactive signature across every surface; consistency here reads as authority.
- **Accessible by default** — accessibility accommodations (dyslexia-friendly type, reduced motion, WCAG AA contrast) are first-class settings, not afterthoughts bolted onto a finished screen.

### Accessibility & Inclusion

Baseline target is WCAG 2.1 AA. Two accommodations are user settings, not per-screen afterthoughts: a dyslexia-friendly typeface swap (`html[data-font="dyslexic"]`, set by `src/lib/font-helpers.ts` client-side and `hooks.server.ts` on SSR — mechanics under Typography → Accessibility override), and reduced motion, where state-communicating motion (answer reveal, streak) degrades to instant or crossfade rather than being skipped, since it still carries meaning.


## Colors

### Foundation surface (dark default)

| Token | Value | Role |
|---|---|---|
| `background` | `oklch(10.7% 0.031 279.92)` — near-black indigo | Page canvas |
| `background-lighter` | `oklch(14.5% 0.042 278.50)` | Elevated canvas, input fills |
| `surface` | `oklch(20.2% 0.067 278.57)` | Cards, panels |
| `surface-raised` | `oklch(31.9% 0.117 277.47)` | Popovers, toasts, dialogs |
| `border` | `oklch(27% 0.075 278.00)` | Dividers, form outlines |

### Foundation surface (light override)

When `data-effective-theme="light"` or `data-sky-phase="morning"` is active, `background` flips to `oklch(96.6% 0.008 286.4)` and `foreground` to near-black. This is why the semantic tokens exist: a component written against `background` follows the flip for free.

### Interactive brand

| Token | Value | Role |
|---|---|---|
| `primary` | `oklch(84.746% 0.16058 83.298)` — Warm Gold | Primary CTA, key actions, selected state highlights |
| `primary-light` | `oklch(90.579% 0.11217 88.004)` | Hover state on primary |
| `secondary` | `oklch(64.3% 0.141 281.67)` — Deep Indigo | Secondary CTA, active navigation, toggles |
| `secondary-dark` | `oklch(42.8% 0.171 276.38)` | Pressed secondary |

### Typography colours

`foreground` (`oklch(92.3% 0.020 286.05)`) is the primary text colour. `foreground-darker` (`oklch(55% 0.060 283.00)`) covers labels, placeholders, helper text, and metadata.

### State palette

| State | Fill | Light (text/bg) | Dark (container bg) |
|---|---|---|---|
| Success | `oklch(57% 0.14 156.69)` | `oklch(95% 0.08 163.05)` | `oklch(15% 0.05 182.55)` |
| Warning | `oklch(76% 0.17 66.31)` | `oklch(99% 0.02 95.28)` | `oklch(30% 0.06 87.41)` |
| Danger | `oklch(56% 0.22 28.32)` | `oklch(97% 0.17 17.38)` | `oklch(16% 0.09 26.04)` |
| Info | `oklch(39% 0.14 257.38)` | `oklch(93% 0.03 233.05)` | `oklch(19% 0.05 252.97)` |

In-game answer feedback maps directly: correct answers use `success`, incorrect use `danger`.

### Prestige metallic scale

Gold, Silver, Bronze, and Platinum are 7-stop perceptual scales used exclusively for ranking displays, leaderboards, and achievement badges. They are not interactive and should never appear as button or input colours.

### Featured / promotional

Violet (`oklch(57% 0.21 293)`) marks exclusively promotional or upsell surfaces — the `featured` button variant and promotional card tints. Never use for functional actions.

### Flame — momentum signal

| Token | Value | Role |
|---|---|---|
| `flame` | `oklch(70% 0.21 40.32)` | Streak indicators, hot-streak ceremony stats, difficulty selector accents |
| `flame-dark` | `oklch(16% 0.25 32.32)` | Container background for flame-toned cards |
| `flame-lighter` | `oklch(80% 0.2 32.32)` | Hover/emphasis state |
| `flame-light` | `oklch(95% 0.1 62.32)` | Text on flame-dark containers |

Flame is distinct from `danger` — it signals positive momentum (a correct-answer streak), not an error state. Never substitute `danger` for streak UI or vice versa.


## Typography

Two families drive the entire typographic hierarchy. **Albertus Nova** (serif) is the brand voice — reserved for display headings, large scores, ceremonial moments. It carries the weight of an oracle inscription. **Geist** (sans-serif, variable) is the working voice — UI labels, body copy, navigation, form fields. **Geist Mono** appears in scores, codes, tokens, and anywhere a fixed-width glyph grid aids legibility.

All weights are available as variable font ranges (100–900). UI defaults are regular (400), semi-bold (600), and bold (700). Extra-light and light weights are explicitly avoided in the token set.

### Scale

| Level | Size | Weight | Family | Use |
|---|---|---|---|---|
| `display` | 64px / 88px | 700 | Albertus Nova | Hero headings, score reveals |
| `heading-xl` | 44px / 56px | 700 | Albertus Nova | Page titles, section headers |
| `heading-lg` | 36px / 44px | 700 | Geist | Admin section headings |
| `heading-md` | 32px / 40px | 700 | Geist | Modal titles, card primaries |
| `heading-sm` | 24px / 32px | 600 | Geist | Sub-section headers |
| `heading-xs` | 16px / 24px | 600 | Geist | Eyebrows, group labels |
| `body-lg` | 20px / 28px | 400 | Geist | Lead paragraphs, question text |
| `body` | 16px / 24px | 400 | Geist | General prose, descriptions |
| `body-sm` | 12px / 12px | 400 | Geist | Metadata, timestamps |
| `label` | 16px / 16px | 600 | Geist | Button text, form labels |
| `overline` | 10px / 1 | 700 | Geist | Difficulty badges, all-caps tags |
| `mono` | 14px / 1.5 | 400 | Geist Mono | Join codes, IDs, scores |

Mobile reduces display (64→40px), heading-xl (44→32px), heading-lg (36→28px) with tighter line heights; letter-spacing tracks proportionally. Body and label sizes remain constant across breakpoints.

**Sentence case everywhere.** Only proper nouns capitalised. The `overline` level is the sole exception — it uses all-caps as a visual signal, not a default.

### Accessibility override

When `html[data-font="dyslexic"]` is set, every family in the scale above — Albertus Nova, Geist, Geist Mono — is replaced with **OpenDyslexic** at the CSS custom-property layer (`--albertus-nova`, `--geist`, `--geist-mono` in `src/lib/styles/fonts.css`). Sizes, weights, and line-heights are unchanged; only the glyph shapes swap. Never reference a font-family literal in component code — always go through these variables so the override applies everywhere automatically.


## Layout

### Container

Pages use a single centred container: `max-width: 1280px`, `padding-inline: 2rem`. Below 425px (`xs` breakpoint) the container is unconstrained; above 1280px it locks. No multi-column grid framework — layout is composited from flex rows and columns per-component, governed by the spacing scale below.

### Spacing strategy

The spacing scale is not a 4px grid for fine-grained padding; it is a macro scale for section and feature block vertical rhythm:

| Token | Value | Role |
|---|---|---|
| `xs` | 100px | Tight grouping within a section |
| `sm` | 200px | Standard section gap |
| `md` | 300px | Major section separation |
| `lg` | 500px | Full-bleed hero blocks |
| `xl` | 800px | Page-width container |
| `2xl` | 1300px | Ultra-wide layout lock |

Within components, use Tailwind's base 4px unit system (multiples of 4px up to 64px for spacing utilities).

### Density and header

The app is comfortable density — forms, lists, and cards breathe generously. The sticky header occupies 160px on desktop and collapses on scroll via `AppHeader`. Content begins below that offset; `scroll-padding-bottom: 7rem` reserves space for the sticky footer on mobile so focused inputs are never obscured.

### Responsive approach

Single breakpoint philosophy: design mobile-first, then enhance above `xs` (425px) and desktop (1280px). Typographic downscaling and layout reflow are the primary adaptations; the colour and elevation system is identical across screen sizes.


## Elevation & Depth

Orakl's depth system is tonal rather than shadow-based. Layers are distinguished by lightness within the secondary perceptual scale — darker layers recede, lighter ones rise — creating a consistent z-axis vocabulary that survives both dark and light themes without requiring shadow colour overrides.

### Tonal layer stack

| Layer | Token | Approx. lightness |
|---|---|---|
| Pit | `background` | 10.7% |
| Base | `background-lighter` | 14.5% |
| Floor | `surface` | 20.2% |
| Raised | `surface-raised` | 31.9% |
| Overlay | Use `surface-raised` + `backdrop-blur-sm` | — |

Interactive overlays (drawers, modals, popovers) combine `surface-raised` fill with `backdrop-blur-sm` or `backdrop-blur-xs` for a layered glass effect. Never use a solid `background` colour for overlays — the blur must read through.

### Shadows

Shadows supplement tonal depth for interactive affordance signals only — not decorative hierarchy. Three custom shadow tokens define standard elevations:

- **`shadow-button`**: `0px 4px 0px 2px <color>` — gives physical press depth to primary buttons
- **`shadow-button-hover`**: `0px 2px 0px 2px currentColor` — reduced on hover, suggesting lift
- **`shadow-menu`**: `0px 3px 0px 1px currentColor` — tight outline shadow for dropdown menus

Shadows always inherit from `currentColor` or a semantic token. Never use `rgba(0,0,0,0.x)` shadows — they flatten on light phase variants.

### Z-index philosophy

Five named z-levels cover all use cases: `back (-2)`, `behind (-1)`, `base (0)`, `front (1)`, `overlay (2)`. The dynamic sky background lives at `back`; all product UI above `base`. Modals and drawers use `overlay`. The naming is intentional — use the token, not a raw integer.

### Noise texture

Background surfaces use SVG noise overlays (`noise-10`, `noise-25`, `noise-50`, `noise-full`) at varying opacities to prevent the deep-dark palette from reading as pure flat colour. Apply with `background-image: var(--background-image-noise-10)` on canvas regions. Never apply noise to interactive elements.


## Shapes

The squircle is Orakl's primary shape. Every interactive element — buttons, inputs, cards, menus — uses `border-radius: 16px` combined with `corner-shape: superellipse(2)`, producing a continuous curvature that is softer than a rectangle but more structural than a circle. This shape evokes the rounded stone of a temple column, cohesive and unhurried.

### Radius scale

| Token | Value | Used for |
|---|---|---|
| `sm` | 8px | Small badges, inline chips, simple dividers |
| `md` | 16px | Inputs, inner panels, list rows — `rounded-2xl` |
| `lg` | 24px | Cards, dialogs, drawers — `rounded-3xl` |
| `full` | 9999px | Pill tags, avatar frames, chip counts |
| `squircle` | 16px + `superellipse(2)` | All buttons, primary interactive controls |

### Philosophy

Sharp (`rounded-none`) is available as a button radius variant but reserved for intentional design moments — destructive confirmations, plain administrative UI. Never use sharp edges in game-play or player-facing screens.

Pill (`rounded-full`) is appropriate for status badges, avatar containers, and passive count indicators. Never apply pill to primary action buttons — squircle is always the interactive default.

**Floating action buttons are squircles too.** A FAB (`CuratorToolboxFab`, the feedback widget and mimic dev toolbar triggers — those two share `lib/fab-variants`) uses `rounded-2xl corner-shape-squircle` at its fixed size, not `rounded-full`. One shape language for every action, floating or inline — a circular FAB beside squircle buttons reads as a different system.


## Components

### Buttons

Buttons are the most expressive surface in the system. They carry brand intent through colour, and structure through squircle shape and physical shadow depth.

**Variants:**

| Variant | Background | Text | Hover |
|---|---|---|---|
| `primary` | Warm Gold (`{colors.primary}`) | Dark background | Gold-light (`{colors.primary-light}`) |
| `secondary` | Deep Indigo (`{colors.secondary}`) | Foreground | Indigo-400 |
| `ghost` | Transparent + backdrop blur | Foreground | Tinted background wash |
| `outline` | Transparent + border | Foreground | Border darkens, subtle fill |
| `danger` | Danger red | Danger-light | Danger-light fill, danger text |
| `success` | Success green | Success-light | Success-light fill, success text |
| `warning` | Warning amber | Warning-light | Warning-lighter fill |
| `featured` | Violet | White | Violet-500 |

All variants share: `border-2 border-transparent`, `font-semibold`, `active:scale-[0.95]`, `focus-visible:ring-2`. The active scale-down provides tactile feedback without animation budget.

**Intents (size):**

| Intent | Padding | Font |
|---|---|---|
| `button` (default) | 10px 20px | 16px / 600 |
| `cta` | 12px 32px | 18px / 600 |
| `compact` | 6px 12px | 14px / 500 |
| `icon` | 12px all sides | — |

**Radius variants:** `squircle` (default), `pill`, `rounded` (8px), `sharp`.

Disabled state: `opacity-50`, pointer-events removed. Never hide buttons that are temporarily unavailable — always disable-in-place.

### Inputs

Inputs use the squircle shape (`rounded-2xl corner-shape-squircle`) with a `border-2` outline that transitions from `secondary/50` at rest to `secondary` on focus. The fill is `background-lighter/25` at rest and `background/50` on focus — a subtle darkening that inverts the surface relationship and signals the edit context.

Error state replaces the border with `danger/70`; the placeholder fades to 10% opacity on focus to leave room for typed content.

Password inputs include a reveal toggle (the Orakl eye icon) and an optional strength popover anchored to the field via CSS anchor positioning.

Textarea variant auto-grows via `field-sizing: content` with a minimum height of 80px.

`Select` shares the input recipe exactly — same squircle, border and fill transitions — with a `compact` size for filter bars. `Slider` is a native range on tokens: a `background-lighter` track and a `secondary` thumb ringed in `background`, the current value shown in mono beside the label. `Progress` is the one determinate bar: a `secondary/25` track with a `secondary` fill that scales on the x axis from the left — a bar never animates `width`. Radio groups compose `RadioGroup` over `RadioOption` tiles: squircle cards that fill `secondary` when checked and fade to 45% with a lock glyph when the option is locked for the current user. Preference pickers are `SegmentedPicker`: `tile` variant for card-like options (selected tile inverts to `foreground-darker` on `background`), `pill` variant for compact link-tabs (selected pill fills `primary`) — squircle either way, never `rounded-full`. Tab rows with a mounted panel are `Tabs`: a WAI-ARIA tablist on the same pill recipe, one tabpanel in the DOM at a time, always one line that scrolls horizontally with an edge fade and a muted chevron cue when tabs overflow.

### Cards

Cards use `rounded-3xl corner-shape-squircle` with a `border-2`. Ten variants cover the semantic range:

| Variant | Border | Background | Use |
|---|---|---|---|
| `default` | `secondary/10` | `secondary/5` | General content panels |
| `highlighted` | `secondary-700` | `secondary-900/30` | Featured items, active selections |
| `success` | `success` | `success/50` | Correct answer reveal |
| `warning` | `warning/40` | `warning-dark/15` | Caution notices |
| `danger` | `danger/40` | `danger-dark/20` | Error states, destructive areas |
| `flame` | `flame/40` | `flame-dark/20` | Streak / momentum callouts |
| `info` | `info` | `info/50` | Informational panels |
| `mezzanine` | `secondary/10` | `secondary/10` + backdrop blur (xs) | Glass overlay panels |
| `rooftop` | `secondary` | `secondary` | Inverted panels, high-contrast insets |
| `ground` | `secondary/2.5` | `secondary-700/5` + backdrop blur (sm) | Recessed, low-emphasis background panels |

Padding variants: `none`, `sm (8px)`, `md (16px, default)`, `lg (24px)`.

### Answer buttons

Every answer tile — multiple choice, true/false, image match — is one `AnswerButton`: a squircle with a 2px border, in six states resolved by `lib/answer-variants` from the round's data, never chosen by hand:

- `idle` — neutral, awaiting input; `selected` — `secondary` border on a translucent wash
- `correct` — solid `success` fill, dark text, bold; `incorrect` — solid `danger` fill, dark text, bold
- `dimmed` — faded to 50% after the reveal; `answered` — faded once the player has locked in elsewhere

True/false tiles additionally carry a `flavor` — `positive` (success hue) or `negative` (danger hue) — before the reveal, so the two choices read apart at a glance. Never manually style answer feedback — always go through `AnswerButton` so state transitions remain consistent.

### Badges

One `Badge` component, one shape: `rounded-xl corner-shape-squircle`, all-caps, 12px, bold, wide tracking. Every variant is built from semantic tokens — never a raw scale colour.

Difficulty badges (`easy`, `medium`, `hard`) are solid `success` / `warning` / `danger` fills with the matching `-dark` text — bright container, dark text — so difficulty reads at a glance next to the question.

`category` is a solid `secondary-300` fill with background-coloured text; `default` is a translucent `secondary/20` wash with muted text for passive labels (role on the profile page, an NPC's title). `primary` and `secondary` are solid brand fills for emphasis.

Role and count badges (`host`, `observer`, `count`, `count-active`, `pill`) are lobby-specific pills (`rounded-full`, normal case): `host` is a translucent `secondary` wash, `observer`/`count`/`pill` the neutral `background-lighter` fill, `count-active` a solid `secondary` fill. These sit outside the difficulty/category family — never reuse them for scoring or difficulty signals.

`status` is the admin-table pill (`rounded-lg`, medium weight, normal case) and takes a `tone` — `primary`, `success`, `warning`, `danger` — rendered as a 15% wash of the tone with the tone as text colour. Hand-rolled status spans are not allowed; every status chip goes through `Badge`.

### Dialogs and drawers

Dialog (centered modal) and drawer (bottom sheet, Vaul-style with a drag handle) are the two overlay primitives, both built from composable parts (`dialog/dialog-content`, `dialog/dialog-title`, `dialog/dialog-footer`; `drawer/drawer-content`, `drawer/drawer-header`, `drawer/drawer-footer`, `drawer/drawer-handle`, `drawer/drawer-overlay`, `drawer/drawer-portal`). Both use `surface-raised` fill, `rounded-3xl corner-shape-squircle`, and sit at the `overlay` z-level. Drawer is the mobile-preferred pattern for bottom-anchored actions and carries a drag handle for dismiss-by-swipe; dialog is reserved for centered, modal-blocking confirmations. Never build a one-off modal outside these primitives.

### Tooltips

Hover and focus hints go through one global host (`Tooltip.svelte`, mounted once in the root layout) that watches for `data-tooltip` on any element — no per-component tooltip markup. A tooltip carries short, non-essential copy; anything a user must read to proceed belongs in the control's label or description, not a hover. Never use the native `title` attribute for meaningful copy: it is inconsistent across devices and invisible on touch.

### Utility partials

`ProgressiveBlur` (blur-masked scroll edges, used by the sticky header) and `FieldDescription` (a field hint behind an icon toggle, one open at a time) are shared interaction partials — prefer them over rebuilding the same interaction pattern inline. Destructive confirmations go through `ConfirmButton`, not a dedicated destructive button.

### Footer and use-case notices

Every route ends with `Footer` (`layout/Footer.svelte`), driven by the `footer` block of its `PAGE_CONFIG` entry. Two variants, one component: **full** (`showNav: true`) stacks the legal nav, the inline analytics control, the copyright line and the build stamp with generous `py-10`; **compact** (`showNav: false`) is a single `text-xs` line — privacy-policy link, analytics control — for live game phases, auth screens and the display, where the page must stay quiet. Both use `text-foreground-darker` on `font-sans`; the footer never competes with the content above it.

A **use-case notice** (`layout/UseCaseNotice.svelte`, over the shared `ui/IconPopover`) appears beside the privacy link on any route whose config names `useCases`: a `size-6` round eye (`Icon name="eye"`) that opens a `Popover` titled "What this page collects", one row per ledger use case — the element as an inline link to `/legal/privacy#use-<id>`, the ledger sentence beneath in `text-foreground-darker`. On a viewer's first visit to each collection point the icon plays one shine (`use-case-shine`: a 1.6 s colour lift to `primary` with a soft glow, twice), remembered in `localStorage` (`orakl-notice-seen`) and suppressed entirely under `prefers-reduced-motion`. The notice informs; it never gates. Never add a consent banner or a second footer.

The **analytics control** (`layout/AnalyticsControl.svelte`) has a `card` form for `/profile` (secondary button, status line) and an `inline` form for the footer — an on/off glyph (`analytics-on` / `analytics-off`, via `IconPopover`) beside the Cookies link whose popover tells the viewer whether they are counted and offers the toggle, unless the browser sent GPC/DNT.

Both footer popovers use `Popover`, which is JS-positioned by `lib/positioning` (`computeAnchoredPosition`, shared with the tooltip): the panel sits below its anchor and flips above when there is not enough room, then clamps inside the viewport, over the native top-layer popover API so it never grows the footer.

### Navigation / header

The sticky header height is 160px. It carries the Orakl logo, navigation links, and contextual back button. The logo is white or primary-coloured depending on context. The header entry in `PAGE_CONFIG` (at `src/lib/page-config.ts`) governs per-route visibility — every new route must have an entry.


## Do's and Don'ts

**Do** use semantic colour tokens (`background`, `foreground`, `surface`) rather than scale values (`secondary-950`, `secondary-100`) in component styles. Semantic tokens respond to theme and sky-phase overrides automatically; raw scale values do not.

**Do** use Albertus Nova for display headings and score reveals. This is the brand's ceremonial voice — it marks moments of consequence. Geist handles everything else.

**Do** apply `corner-shape-squircle` alongside `rounded-2xl` or `rounded-3xl` on every interactive element. Using `rounded-*` alone produces standard circular corners. The squircle only activates when both properties are present.

**Do** prefer tonal depth (lighter surface tokens) over shadows for hierarchy. Reach for `shadow-button` only to signal physical interactivity, and `shadow-menu` only for floating menus — not for decorative card elevation.

**Do** write copy in sentence case and maintain a spartan, professional tone. Avoid exclamation marks, filler phrases, and explanatory softeners ("please", "just", "simply"). The interface should feel like a knowledgeable colleague, not a cheerful assistant.

**Do** wire every new navigable route into `PAGE_CONFIG` before opening a PR. A missing entry silently falls through to the default fallback — which is a bug, not graceful degradation.

**Do** route every font reference through the `--albertus-nova` / `--geist` / `--geist-mono` CSS variables (or the `font-serif` / `font-sans` / `font-mono` utilities bound to them), never a literal `"Geist", sans-serif` string in component CSS. That is what lets the OpenDyslexic override apply everywhere at once.

**Don't** design toward generic party-quiz visual language (loud saturated flat colours, cartoonish shapes, exclamation-heavy copy — the Kahoot look). Orakl's energy comes from precision and warmth, not primary-colour noise; use `primary` (warm gold) and `flame` for the game's energetic moments instead.

**Don't** use the `featured` (violet) colour for functional actions. Violet is reserved for promotional surfaces; its presence signals "this is special / paid / optional". Reusing it for standard actions dilutes that signal.

**Don't** hardcode phase-specific values like `oklch(10.7% 0.031 279.92)` directly in component styles. The sky-phase system can override semantic tokens at the `html` level; hardcoded values will not follow and will produce incorrect colour in non-night phases.

**Don't** animate layout properties (`width`, `height`, `top`, `left`) for micro-interactions. Use `transform` (scale, translate) and `opacity`. All in-app micro-animations use cubic-bezier easing — never `ease` or `linear` except for intentional mechanical effects.

**Don't** use sharp (`rounded-none`) on player-facing or game-play buttons. Sharp edges are an administrative/destructive signal. In quiz screens, everything interactive should feel approachable — squircle or pill only.

**Don't** omit `role`, `aria-label`, or `onkeydown` on custom interactive elements. SVG buttons, status containers, and non-semantic clickable elements must be fully accessible. The Palette agent audits for these; new components should arrive compliant.
