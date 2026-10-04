import type { FeatureFlagName, UserPower, UserRole } from "@orakl/shared";
import { hasPower, hasRole } from "@orakl/shared";
import type { HeaderActionKey } from "./header-action-state.svelte.js";
import type { UseCaseId } from "./legal/ledger.js";

export type LinkEntry =
  | {
      type: "link";
      label: string;
      href: string;
      showWhen?: UserRole;
      /** Shows the link only to a holder of this power, whatever their role. */
      showWhenPower?: UserPower;
      /** Shows the link only while this feature flag is on for the viewer.
       *  The flag states arrive as layout data; see `UI_FLAGS`. */
      showWhenFlag?: FeatureFlagName;
      /** Excludes a role that would otherwise pass `showWhen` via hierarchy
       *  (e.g. `showWhen: "member"` also matches curator/admin — use this to
       *  carve curator back out for a player-only entry). */
      hideWhen?: UserRole;
      /** Gates on the current `/quiz/*` journey state or solo phase
       *  (`headerActionState.phase`, `header-action-state.svelte.ts`) —
       *  e.g. only show once a lobby exists. Omit to ignore phase entirely. */
      showWhenPhase?: string | string[];
      icon?: string;
    }
  | { type: "logout"; showWhen?: UserRole }
  | {
      /** A confirm-then-act header button (`EndSessionButton`) whose
       *  callback is registered by whichever route owns it
       *  (`registerHeaderActions`), resolved here by key so the *choice* of
       *  when to show it stays declarative. */
      type: "action";
      label: string;
      action: HeaderActionKey;
      showWhen?: UserRole;
      hideWhen?: UserRole;
      showWhenPhase?: string | string[];
    }
  | {
      /** The curator's `CastButton` (mint a display token, cast or open the
       *  Display) rendered inline in the header, no confirm step. */
      type: "cast";
      showWhen?: UserRole;
      showWhenPhase?: string | string[];
    };

export type HeaderConfig = {
  hidden?: boolean;
  showWordmark: boolean;
  href?: string;
  back?: string;
  leftLinks?: LinkEntry[];
  rightLinks?: LinkEntry[];
  rightBadge?: { icon: string; label?: string };
};

/** Footer block of a route (map #840 decision #13). Every route renders a
 *  footer: `showNav: true` is the full variant (legal nav, analytics control,
 *  copyright), `false` the compact one-liner (policy link + analytics
 *  control) for live game phases, auth screens and the display. `useCases`
 *  names the privacy-ledger rows whose data this page collects; the footer
 *  then adds the use-case notice — an info-i whose popover carries each
 *  row's sentence and anchor link. Omit on routes that collect nothing new.
 *  The ledger guard (`tests/legal-ledger.test.ts`) keeps this list and the
 *  ledger's own route lists in step, both ways. */
export type FooterConfig = {
  showNav: boolean;
  useCases?: UseCaseId[];
};

/** One route's page chrome — header and footer together. `getPageConfig`
 *  resolves exact keys first, then `parent/*` wildcards. */
export type PageConfig = {
  header: HeaderConfig;
  footer: FooterConfig;
};

export function shouldShow(
  showWhen: UserRole | undefined,
  hideWhen: UserRole | undefined,
  user: { role: UserRole; powers?: UserPower[] },
  showWhenPower?: UserPower,
): boolean {
  if (hideWhen !== undefined && hasRole(user.role, hideWhen)) return false;
  // A power-gated link must match the gate behind it, not a role that
  // approximates it (map #859, decision 9).
  if (
    showWhenPower !== undefined &&
    !hasPower({ powers: user.powers ?? [] }, showWhenPower)
  )
    return false;
  if (showWhen === undefined) return true;
  if (showWhen === "anonymous") return user.role === "anonymous";
  return hasRole(user.role, showWhen);
}

/** Gate a `showWhenFlag` entry against the flag states resolved for this
 *  request. Undefined ignores flags; a flag missing from the record reads as
 *  off, since a link pointing at a refusal is worse than a missing link. */
export function shouldShowFlag(
  showWhenFlag: FeatureFlagName | undefined,
  flags: Partial<Record<FeatureFlagName, boolean>>,
): boolean {
  if (showWhenFlag === undefined) return true;
  return flags[showWhenFlag] === true;
}

/** Gate a `showWhenPhase` entry against the live phase bridged through
 *  `headerActionState.phase` — undefined ignores phase, null (no route has
 *  reported one yet) hides any phase-gated entry. */
export function shouldShowPhase(
  showWhenPhase: string | string[] | undefined,
  currentPhase: string | null,
): boolean {
  if (showWhenPhase === undefined) return true;
  if (currentPhase === null) return false;
  return Array.isArray(showWhenPhase)
    ? showWhenPhase.includes(currentPhase)
    : showWhenPhase === currentPhase;
}

export const PAGE_CONFIG: Record<string, PageConfig> = {
  "/": {
    header: {
      showWordmark: true,
      leftLinks: [
        {
          type: "link",
          label: "Profile",
          href: "/profile",
          showWhen: "member",
          icon: "campfire",
        },
        {
          type: "link",
          label: "Sign in",
          href: "/login",
          showWhen: "anonymous",
          icon: "moon",
        },
      ],
      rightLinks: [
        {
          type: "link",
          label: "Sign up",
          href: "/signup",
          showWhen: "anonymous",
          icon: "north-star",
        },
        { type: "logout", showWhen: "member" },
      ],
    },
    footer: { showNav: true },
  },
  "/login": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [
        {
          type: "link",
          label: "Sign up",
          href: "/signup",
          showWhen: "anonymous",
          icon: "north-star",
        },
      ],
    },
    footer: {
      showNav: false,
      useCases: ["device-label", "location", "audit"],
    },
  },
  "/forgot-password": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/login",
      rightLinks: [
        {
          type: "link",
          label: "Sign in",
          href: "/login",
          showWhen: "anonymous",
          icon: "moon",
        },
      ],
    },
    footer: {
      showNav: false,
      useCases: ["tokens"],
    },
  },
  "/reset-password": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/login",
    },
    footer: {
      showNav: false,
      useCases: ["password", "tokens"],
    },
  },
  "/verify-email": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/profile",
    },
    footer: {
      showNav: false,
      useCases: ["tokens"],
    },
  },
  "/signup": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [
        {
          type: "link",
          label: "Sign in",
          href: "/login",
          showWhen: "anonymous",
          icon: "moon",
        },
      ],
    },
    footer: {
      showNav: false,
      useCases: ["account", "password", "tokens", "device-label", "audit"],
    },
  },
  "/profile": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: {
      showNav: true,
      useCases: [
        "account",
        "password",
        "preference-cookies",
        "audit",
        "billing",
      ],
    },
  },
  // Polar's checkout success URL (map #1124): reconciles, then redirects to
  // /profile, so its chrome is never painted.
  "/billing/return": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/profile",
    },
    footer: {
      showNav: false,
      useCases: ["billing"],
    },
  },
  // /profile/sessions (active-sessions manager, #829) — back to profile.
  "/profile/*": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/profile",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: {
      showNav: true,
      useCases: ["location", "device-label"],
    },
  },
  "/legal/*": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: { showNav: true },
  },
  "/admin/*": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: { showNav: true },
  },
  // Delegated surfaces: same chrome as the admin area, reached with a Power
  // rather than the role. Exact entries under `/manage/` (`/manage/import`,
  // `/manage/questions`) override this.
  "/manage/*": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: { showNav: true },
  },
  "/solo/setup": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [
        {
          type: "link",
          label: "Leaderboard",
          href: "/solo/leaderboard",
          showWhenFlag: "SOLO_LEADERBOARDS",
          icon: "wreath",
        },
        {
          type: "link",
          label: "Your history",
          href: "/history",
          showWhenFlag: "PLAYER_HISTORY",
          showWhen: "member",
          icon: "scroll",
        },
        {
          type: "link",
          label: "Sign in",
          href: "/login",
          showWhen: "anonymous",
          icon: "sign-in",
        },
        { type: "logout", showWhen: "member" },
      ],
    },
    footer: { showNav: true },
  },
  "/solo/play": {
    header: {
      showWordmark: false,
    },
    footer: {
      showNav: false,
      useCases: ["solo", "ratings"],
    },
  },
  "/solo/results": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [
        {
          type: "link",
          label: "Leaderboard",
          href: "/solo/leaderboard",
          showWhenFlag: "SOLO_LEADERBOARDS",
          icon: "wreath",
        },
        {
          type: "link",
          label: "Your history",
          href: "/history",
          showWhenFlag: "PLAYER_HISTORY",
          showWhen: "member",
          icon: "scroll",
        },
        {
          type: "link",
          label: "Sign in",
          href: "/login",
          showWhen: "anonymous",
          icon: "sign-in",
        },
        { type: "logout", showWhen: "member" },
      ],
    },
    footer: {
      showNav: true,
      useCases: ["solo", "flags"],
    },
  },
  "/solo/leaderboard": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/solo/setup",
      rightLinks: [
        {
          type: "link",
          label: "Your history",
          href: "/history",
          showWhenFlag: "PLAYER_HISTORY",
          showWhen: "member",
          icon: "scroll",
        },
        {
          type: "link",
          label: "Sign in",
          href: "/login",
          showWhen: "anonymous",
          icon: "sign-in",
        },
        { type: "logout", showWhen: "member" },
      ],
    },
    footer: {
      showNav: true,
      useCases: ["solo"],
    },
  },
  // "Your history" — solo + multiplayer record (moved from /solo/history, then /trials).
  "/history": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/profile",
      rightLinks: [
        {
          type: "link",
          label: "Leaderboard",
          href: "/solo/leaderboard",
          showWhenFlag: "SOLO_LEADERBOARDS",
          icon: "wreath",
        },
        { type: "logout", showWhen: "member" },
      ],
    },
    footer: {
      showNav: true,
      useCases: ["answers", "solo"],
    },
  },
  // Per-run review (/history/solo/[id]) — back to the history list.
  "/history/*": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/history",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: {
      showNav: true,
      useCases: ["answers", "solo", "flags"],
    },
  },
  "/curator/create": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [
        {
          type: "link",
          label: "Questions",
          href: "/curator/questions",
          showWhenPower: "can-add-questions",
        },
        {
          type: "link",
          label: "History",
          href: "/curator/history",
          showWhenFlag: "CURATOR_HISTORY",
        },
      ],
      rightBadge: { icon: "wreath", label: "Manage" },
    },
    footer: {
      showNav: true,
      useCases: ["uploads", "questions"],
    },
  },
  "/curator/history": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/curator/create",
      rightLinks: [
        {
          type: "link",
          label: "Questions",
          href: "/curator/questions",
          showWhenPower: "can-add-questions",
        },
        {
          type: "link",
          label: "History",
          href: "/curator/history",
          showWhenFlag: "CURATOR_HISTORY",
        },
      ],
      rightBadge: { icon: "wreath", label: "Manage" },
    },
    footer: {
      showNav: true,
      useCases: ["answers"],
    },
  },
  "/curator/history/*": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/curator/history",
      rightLinks: [
        {
          type: "link",
          label: "Questions",
          href: "/curator/questions",
          showWhenPower: "can-add-questions",
        },
        {
          type: "link",
          label: "History",
          href: "/curator/history",
          showWhenFlag: "CURATOR_HISTORY",
        },
      ],
      rightBadge: { icon: "wreath", label: "Manage" },
    },
    footer: {
      showNav: true,
      useCases: ["answers"],
    },
  },
  "/curator/questions": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/curator/create",
      rightLinks: [
        {
          type: "link",
          label: "Questions",
          href: "/curator/questions",
          showWhenPower: "can-add-questions",
        },
        {
          type: "link",
          label: "Import",
          href: "/manage/import",
          showWhenPower: "can-import-quizzes",
        },
      ],
      rightBadge: { icon: "wreath", label: "Manage" },
    },
    footer: {
      showNav: true,
      useCases: ["questions"],
    },
  },
  "/manage/import": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/curator/create",
      rightLinks: [
        {
          type: "link",
          label: "Questions",
          href: "/curator/questions",
          showWhenPower: "can-add-questions",
        },
        {
          type: "link",
          label: "Import",
          href: "/manage/import",
          showWhenPower: "can-import-quizzes",
        },
      ],
      rightBadge: { icon: "wreath", label: "Manage" },
    },
    footer: { showNav: true },
  },
  "/manage/questions": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: { showNav: true, useCases: ["questions"] },
  },
  "/manage/avatars": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/profile",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: { showNav: true },
  },
  "/curator/display": {
    header: {
      hidden: true,
      showWordmark: false,
    },
    footer: { showNav: false },
  },
  "/join": {
    header: {
      showWordmark: true,
      href: "/",
      back: "/",
      rightLinks: [{ type: "logout", showWhen: "member" }],
    },
    footer: {
      showNav: true,
      useCases: ["player", "browser-storage"],
    },
  },
  "/closed": {
    header: { showWordmark: true, href: "/", back: "/" },
    footer: { showNav: true },
  },
  "/quiz/setup": {
    header: {
      showWordmark: false,
      href: "/",
      back: "/join",
      // Invite-only lobby, awaiting curator approval — same "Leave lobby"
      // action /quiz/lobby's player uses, gated on the pending sub-state
      // rather than a whole extra route.
      rightLinks: [
        {
          type: "action",
          label: "Leave lobby",
          action: "leaveLobby",
          showWhenPhase: "pending",
        },
      ],
    },
    footer: {
      showNav: true,
      useCases: ["player", "browser-storage"],
    },
  },
  "/quiz/lobby": {
    header: {
      showWordmark: false,
      href: "/",
      // Curator only, pre-game (this page IS the waiting room, so phase is
      // already implicitly "lobby" — showWhenPhase is belt-and-suspenders).
      // Reopens the create form, prefilled, re-submitting to the same lobby
      // code (POST /api/lobby's update branch).
      leftLinks: [
        {
          type: "link",
          label: "Edit quiz",
          icon: "arrow-left",
          href: "/curator/create",
          showWhen: "curator",
          showWhenPhase: "lobby",
        },
      ],
      rightLinks: [
        // Cast sits with the other lobby actions: this page has no toolbox.
        { type: "cast", showWhen: "curator", showWhenPhase: "lobby" },
        {
          type: "action",
          label: "Close lobby",
          action: "endLobby",
          showWhen: "curator",
        },
        {
          type: "action",
          label: "Leave lobby",
          action: "leaveLobby",
          showWhen: "member",
          hideWhen: "curator",
        },
      ],
    },
    footer: { showNav: true },
  },
  "/quiz/play": {
    header: {
      showWordmark: false,
      // Curator has no header action here — the toolbox (FAB + drawer) covers
      // End game/End lobby instead (ADR 0019 route unification).
      rightLinks: [
        {
          type: "action",
          label: "Exit quiz",
          action: "exitQuiz",
          showWhen: "member",
          hideWhen: "curator",
        },
      ],
    },
    footer: {
      showNav: false,
      useCases: ["answers", "ratings"],
    },
  },
  "/quiz/roles": {
    header: {
      showWordmark: false,
    },
    footer: { showNav: true },
  },
  "/quiz/results": {
    header: {
      showWordmark: true,
      href: "/",
    },
    footer: {
      showNav: true,
      useCases: ["answers", "flags"],
    },
  },
  "/mimic/*": {
    header: {
      showWordmark: false,
      href: "/",
      back: "/profile",
    },
    footer: { showNav: false },
  },
};

const FALLBACK: PageConfig = {
  header: { showWordmark: false, href: "/" },
  footer: { showNav: false },
};

export function getPageConfig(pathname: string): PageConfig {
  const exact = PAGE_CONFIG[pathname];
  if (exact) return exact;
  for (const [key, config] of Object.entries(PAGE_CONFIG)) {
    if (key.endsWith("/*") && pathname.startsWith(`${key.slice(0, -2)}/`)) {
      return config;
    }
  }
  return FALLBACK;
}

/**
 * Flags a page template reads straight off `uiFlags`, rather than through a
 * `showWhenFlag` nav gate. Listed here because nothing else can see them;
 * `tests/page-config.test.ts` fails if a template reads one that is missing.
 */
export const TEMPLATE_FLAGS: FeatureFlagName[] = [
  "PLAYER_HISTORY",
  "SOLO_LEADERBOARDS",
  "QUIZ_SCORING_MODES",
  "QUIZ_ACCESS_MODES",
  "QUIZ_MAX_PLAYERS",
  "QUIZ_PRESETS",
  "BADGE_DISPLAY",
  "ROLE_SELECTION",
  "QUESTION_RATING",
];

/**
 * Every flag the client needs resolved to decide what to show — the nav gates
 * in `PAGE_CONFIG` plus `TEMPLATE_FLAGS`. Derived rather than hand-listed, so
 * a link that gains a `showWhenFlag` is resolved for free instead of silently
 * reading as off.
 */
export const UI_FLAGS: FeatureFlagName[] = [
  ...new Set([
    ...Object.values(PAGE_CONFIG)
      .flatMap((cfg) => [
        ...(cfg.header.leftLinks ?? []),
        ...(cfg.header.rightLinks ?? []),
      ])
      .flatMap((l) =>
        l.type === "link" && l.showWhenFlag ? [l.showWhenFlag] : [],
      ),
    ...TEMPLATE_FLAGS,
  ]),
];
