# UI Components

Always prefer these over native HTML elements. **Where a component lives follows from who imports it:**

- imported from more than one place → `src/lib/components/**`, imported via `$lib/components/...` (primitives in `ui/`, feature families in `quiz/`, `results/`, `quiz-setup/`, chrome in `auth/` and `layout/`)
- imported by exactly one route → colocated beside that route's `+page.svelte` (the nearest common route folder when several routes in one group share it); imported relatively (`./Foo.svelte`). `mimic/*` dev routes may import them via `@/routes/...`
- a private child used only by one lib component sits in that component's folder

There is no third tree. A component that gains a second importer from another route folder moves to the lib — never a second copy beside it.

Every new table renders through `DataGrid`: the table on desktop, cards on mobile, with the viewer's "Show as cards" Switch either way. A page supplies the card body and, where a row has secondary fields, the "More" disclosure's contents.

## Core atoms — `src/lib/components/ui/`

| Component | Use instead of | Key props |
|-----------|----------------|-----------|
| `Button.svelte` | `<button>`, `<a>` (actions) | `variant` (primary\|secondary\|ghost\|outline\|danger\|success\|warning\|featured\|disabled), `intent` (button\|cta\|compact\|icon), `radius` (pill\|squircle\|rounded\|sharp), `href`, `unstyled` (class only), `ref` (bindable element) |
| `Link.svelte` | `<a>` (inline/nav links) | `href`, `intent` (inline\|link\|button), `content` (text\|inline\|icon) |
| `Card.svelte` | `<div>` (containers) | `variant` (default\|highlighted\|success\|warning\|danger\|info), `padding` |
| `Input.svelte` | `<input>`, `<textarea>` | `type`, `label`, `id`, `size?` (default\|large\|sm), `description?`, `error?`, `showStrength?` (password reveal + strength), standard input attrs |
| `Icon.svelte` | `<svg>` (icons) | `name` — resolves `src/assets/icons/**/*.svg` |
| `Badge.svelte` | `<span>` (difficulty/category/role/status chips — NOT achievements) | `variant` (default\|primary\|secondary\|easy\|medium\|hard\|all\|category\|pill\|host\|observer\|count\|count-active\|status), `tone` (neutral\|primary\|success\|warning\|danger\|info — for `status`) |
| `Avatar.svelte` | `<img>` (player avatars) | — |
| `AnswerButton.svelte` | `<button>` (answer choices — every grid) | `state` (idle\|selected\|correct\|incorrect\|dimmed\|answered, from `lib/answer-variants`), `questionType` (multiple_choice\|true_false\|match), `flavor` (positive\|negative\|none, true/false hue) |
| `Checkbox.svelte` / `CheckboxOption.svelte` | `<input type="checkbox">` | `Checkbox`: `id`, `label`, `checked` (bindable), `size?` (default\|sm), `description?`, `error?`; `CheckboxOption` (styled label around your own input): `variant` (row\|tile), `locked?` |
| `Switch.svelte` | `<input type="checkbox">` used as an on/off control; hand-rolled toggles | `label` (accessible name), `checked?`, `disabled?`, `onchange?` (receives the state being moved to), `class?`; renders a `role="switch"` button |
| `FileInput.svelte` | `<input type="file">`, hand-rolled drop zones | `id`, `label`, `accept?`, `onfiles` (change or drop), `dropzone?` (dashed panel), children for hint text |
| `RadioOption.svelte` | `<input type="radio">` (single tile) | `locked?` |
| `RadioGroup.svelte` | hand-rolled radio groups | `options` (may be dynamic), `selected` (bindable), `name`, `legend`, `hint?`, `description?`, `optionLabel` snippet, `lockedOptions?`, `onLocked?`; renders `role="radiogroup"` over `RadioOption` tiles |
| `Select.svelte` | `<select>` | `id`, `label` (`hideLabel?` for sr-only), `name?`, `value` (bindable), `size` (default\|compact), `description?`, `error?`; `<option>`s as children |
| `Slider.svelte` | `<input type="range">` | `id`, `label` (`hideLabel?`), `min`, `max`, `step`, `value` (bindable), `showValue?`, `format?`, `size?` (default\|sm) |
| `Progress.svelte` | hand-rolled progress bars, anything animating `width` | `value` (0–100), `label` (aria), `class?` (track), `barClass?` (fill) — fills via `scaleX` |
| `Drawer.svelte` | bottom-sheet overlay | `id` (required), `title?` (string or snippet), `footer?`; opens on `drawer:open` / closes on `drawer:close` window events with a matching `id`; a `ResponsiveOverlay` pinned to drawer mode |
| `ResponsiveOverlay.svelte` | bespoke modals | `id`, `open`, `onClose`, `title?` snippet, `footer?`, `panelClass?`, `bodyClass?`, `draggable?`, `mode` (auto\|drawer) — dialog on desktop, drawer on mobile |
| `ConfirmButton.svelte` | two-step destructive actions | `label`, `ariaLabel?` (accessible name before confirm; defaults to `label`), `confirmLabel?`, `icon` snippet, `onConfirm?` or `formAction?`, `confirmVariant` (danger\|success\|neutral — neutral keeps the button's own colour, `border-current` ring), `variant?` (outline\|secondary\|danger\|primary — filled look; omit for the inline text form), `progressStyle` (bar\|border) |
| `SegmentedPicker.svelte` | hand-rolled option tiles, link-tab rows | `options`, `selectedKey`, `optionKey?`, `label`, `option` snippet; picker mode via `onSelect` (radiogroup, arrow keys) or tab mode via `hrefFor` (nav of links); `variant` (tile\|pill) |
| `Tabs.svelte` | ARIA tab row with one mounted panel (`/profile`); one line, scrolls sideways with an edge fade and muted chevron cue on overflow | `tabs` (`{key,label}[]`), `selected`, `onSelect`, `label`, `panel` snippet (receives the selected key), `panelClass?`; role="tablist"/"tab"/"tabpanel", arrow/Home/End roving focus, pill recipe |
| `StatTile.svelte` | hand-rolled stat cards | `label`, `value`, `tone` (primary\|secondary\|success\|warning\|neutral\|flame) |
| `PlayerRow.svelte` | hand-built player list rows | `nickname`, `avatarSrc?`, `prefix?`/`suffix?`, `rank?`, `score?`, `variant?`, `size?` (`md`|`lg` — lg: larger name, affixes always shown; display use)\|`lg` — lg: larger avatar/name, affixes always shown; display use), `badge`/`actions`/`name` snippets |
| `RingTimer.svelte` | hand-drawn countdown rings | `timerState`, `timeRemaining`, `timerFraction`, `observer?`, `size` (sm\|md\|lg, responsive) |
| `RarityLegend.svelte` | inline rarity ladders | `id`, `icon?` — the four rarity chips behind a `FieldDescription` toggle |
| `Popover.svelte` | anchored panel | `id` (required), `anchorEl` (trigger element), `placement?` (top\|bottom), `title?` — JS-positioned via `lib/positioning`, flips above when no room below, over the native top-layer popover API |
| `IconPopover.svelte` | icon button that opens a `Popover` (footer use-case notice, analytics control) | `id`, `icon`, `ariaLabel`, `title?`, `open` (bindable), `shine?`, `placement?`; handles toggle, Escape and outside-click |
| `Spinner.svelte` | ad-hoc `animate-spin` markup | `class?` (default `size-4`); used by `toast.loading` |
| `DataGrid.svelte` | a bare `SvGrid` in a page; hand-rolled narrow-screen card branches | `data`, `columns`, `features`, `getRowId`, `label` (accessible name), `height?`, `empty?` (empty-state copy), `page`, `pageSize`, `total?` (omit where the page knows only its own slice — the pager then reads `Page N` and takes `hasMore?` for Next), `busy?` (disables both pager buttons during a fetch), `onPageChange`, `card?` snippet (one row's card — omit to always render the table with no Switch), `cardDetails?` snippet (one row's secondary fields, behind a "More" disclosure below the card body — omit for no disclosure), `cardDisclosureClass?` (extra classes on that disclosure, so a card reserving a selection gutter can indent it to match its own body), `cardHeader?` snippet (the page's own control — a select-all, say — at the left of the toggle row in card mode only, since the table carries it in a column header instead; absent leaves the row unchanged), `svgrid?` (bag spread onto `SvGrid`, typed `SvGridPassthroughProps` — SvGrid's own props less the ones the wrapper hard-wires, so a misspelled key is a compile error rather than a silently ignored entry). In card mode, where a column has a string `header`, an accessor (`field` or `fieldFn`) and no `enableSorting: false`, a "Sort by" Select reorders a copy of the cards ascending, `null` last — a column whose `fieldFn` coalesces null to a string sorts by that string instead, which is what keeps blanks in the same place as the table's own text sort; absent in table mode, where SvGrid sorts itself, and where no column qualifies. Owns the mount skeleton, the device default (cards below `sm`, table above), the "Show as cards" `Switch` and its persisted `orakl-table-layout` (`table`\|`cards`) override, the `sg-theme` `Card` + `TableGridIcons` shell, the empty message, and a Previous / Next pager with a "Showing a–b of n" range that calls back into the page's own paging |
| `TableSkeleton.svelte` | table loading state | `rows?`, `columns?`, `height?` |
| `table-icons.ts` | `TABLE_ICON_MAP` — SvGrid chrome icon names → the `table/*` icon set, shared by every `/manage` grid | — |
| `Tooltip.svelte` | `title` attr, per-component tooltip markup | global host, mounted once in `src/routes/+layout.svelte`; targets any element with `data-tooltip` (+ `data-tooltip-position`, `-show`, `-once`, `-timeout`) |
| `BackButton.svelte` | page back navigation | `href` |
| `Logo.svelte` | inline logo markup | — |
| `PasswordStrength.svelte` | bespoke strength meters | used by `Input` `showStrength` |
| `dialog/` | `<dialog>` | compound set (`Root`, `Content`, `Footer`, `Handle`, `Title`) via `index.ts` |
| `drawer/` | bespoke drawers | compound set (`Root`, `Content`, `Header`, `Footer`, `Overlay`, `Portal`, `Handle`, `Title`) via `index.ts` |
| `partials/ProgressiveBlur.svelte` | gradient blur edges | — |
| `partials/FieldDescription.svelte` | inline field hint with a toggle | `description` (string or snippet), `id`, `icon?` (info\|question\|candle\|bulbs) |
| `partials/StickyFooter.svelte` | sticky bottom bars | children; frosts and lifts while the page can still scroll |

`toast` (`src/lib/toast.ts`) replaces inline status banners: `toast.success|error|warning|info|loading(msg, opts?)`, `toast.dismiss(id?)` — wraps svelte-sonner.

## Auth / layout / misc — `src/lib/components/`

| Component | Path | Purpose |
|-----------|------|---------|
| `ShowFor` | `auth/ShowFor.svelte` | Renders children only when user meets minimum role (`role` prop) |
| `ShowPower` | `auth/ShowPower.svelte` | Renders children only when user has a specific power (`power` prop) |
| `LogoutButton` | `auth/LogoutButton.svelte` | Sign-out action, used by the header and the app layout |
| `AppHeader` | `layout/AppHeader.svelte` | Global header, driven by the `header` block of `src/lib/page-config.ts` |
| `EndSessionButton` | `layout/EndSessionButton.svelte` | `ui/ConfirmButton` for end/leave session, wired via header action slots |
| `StickyHeader` | `layout/StickyHeader.svelte` | Sticky-header shell |
| `AdminPageShell` | `layout/AdminPageShell.svelte` | Page shell for admin management pages |
| `Footer` | `layout/Footer.svelte` | Global footer on every route, driven by the `footer` block of `src/lib/page-config.ts`: `showNav` (full vs compact one-liner), `useCases`, `pathname`, `analytics` |
| `UseCaseNotice` | `layout/UseCaseNotice.svelte` | Eye icon + popover (via `IconPopover`) listing each ledger use case a route declares (sentence + `/legal/privacy#use-<id>` link); shines once per route per viewer, never under reduced motion |
| `AnalyticsControl` | `layout/AnalyticsControl.svelte` | Umami opt-out control: `analytics` state, `variant` — `card` (button + status, `/profile`) or `inline` (on/off icon + popover beside the footer's Cookies link) |
| `Metatags` | `seo/Metatags.svelte` | Head meta/OG tags |
| `CardTitle` | `typography/CardTitle.svelte` | Card heading typography |
| `Background` / `Birds` / `DynamicBackground` | root | Decorative page backgrounds |

## Feature families — `src/lib/components/{quiz,results,quiz-setup,history}/`

Domain components shared by solo `(app)`, multiplayer `(game)` and the `(display)` screen. Private children (used by one family member only) live in the same folder.

| Family | Components | Purpose |
|--------|------------|---------|
| `quiz/` | `QuestionBlock`, `QuestionHeader`, `QuestionMedia`, `MultipleChoiceAnswers`, `TrueFalseAnswers`, `ImageMatchingGrid`, `AnswerStatus`, `StreakIndicator` (own-streak pill and flourish, solo and multiplayer play), `QuestionFlagFab`, `CastButton` (header + curator toolbox) | Rendering one question and its answer grid in play, display and admin review |
| `quiz/` (private children of `QuestionHeader`) | `IdentityPill`, `ProgressBar` (round progress over `ui/Progress`), `QuestionBadges` | Header chrome |
| `results/` | `CeremonyFrame`, `ResultCard`, `CeremonyLeaderboard`, `QuestionFlagFollowUp`, `EarnedBadge` (registry in `lib/badges.ts`) | Results ceremony and per-run/per-game review |
| `quiz-setup/` | `QuizSetupFields`, `QuizSetupFooter`, `CategorySelector`, `DifficultySelector` | Shared quiz-setup form for solo setup and curator create |
| `history/` | `HistoryRow` | One past run or game as a Card row: title (text or snippet), trailing key value, meta line, review link — every history list |
| `questions/` | `RevisionList` | Edit history of a question, newest first: each entry names what that edit changed against the version that followed it (`current` for the newest), full prior version behind a toggle — no fetching, renders what it is given; `showActor` adds who made each edit |

## Colocated page components — `src/routes/**`

Used by one route (or one route group) only; they sit beside the page that renders them. Examples: `(app)/admin/users/{AdminUsers,UsersTable}.svelte`, `(app)/manage/flagged-questions/{ManageFlaggedQuestions,FlaggedQuestionModal}.svelte`, `(app)/manage/questions/ManageAuthoredQuestions.svelte`, `(app)/profile/{FontPicker,ThemePicker,ProfileAvatar}.svelte` (pickers wrap `ui/SegmentedPicker`), `(app)/profile/{ChangePassword,DeleteAccount}.svelte` (Account and Privacy & data cards), `(app)/solo/SoloGuestCta.svelte`, `(game)/curator/{create/CreateQuiz,questions/CustomQuestionsPage,questions/QuestionHistoryModal,avatars/ManageAvatars}.svelte`, `(game)/manage/import/ImportPage.svelte`, `(game)/quiz/{CuratorToolboxDrawer,CuratorToolboxFab}.svelte` (playing-curator host controls, ADR 0019), `(game)/quiz/lobby/LobbyRoster.svelte` (one roster for both lobby perspectives; `curator` layers the controls), `(game)/quiz/play/{EmotePetal,SentEmote}.svelte` (Spring-driven fan petal and sent emote), `(game)/quiz/setup/AvatarPlaque.svelte` (selected avatar's image, title and description as a card), `(game)/{IdentityCard,QuizAvatarDialog}.svelte`, `(game)/join/JoinPage.svelte` (code-entry form; the mimic join route mounts it on a `MockQuizSession`), `(display)/curator/display/{DisplayReceiver,QuizDisplay}.svelte`, `routes/FeedbackWidget.svelte`, `mimic/DevToolbar.svelte`.

## Button variants quick-ref

```
variant:  primary  secondary  ghost  outline  danger  success  warning  featured  disabled
intent:   button   cta   compact   icon
radius:   pill   squircle (default)   rounded   sharp
```
