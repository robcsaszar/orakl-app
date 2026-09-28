import { globSync, readFileSync } from "node:fs";
import type { UserPower, UserRole } from "@orakl/shared";
import { describe, expect, it } from "vitest";
import {
  getPageConfig,
  PAGE_CONFIG,
  shouldShow,
  shouldShowFlag,
  shouldShowPhase,
  TEMPLATE_FLAGS,
  UI_FLAGS,
} from "../src/lib/page-config.js";

const roles: UserRole[] = ["anonymous", "member", "curator", "admin"];

const user = (role: UserRole) => ({ role });

describe("shouldShow", () => {
  it("undefined showWhen always returns true", () => {
    for (const role of roles) {
      expect(shouldShow(undefined, undefined, user(role))).toBe(true);
    }
  });

  it("'anonymous' returns true only for anonymous role", () => {
    expect(shouldShow("anonymous", undefined, user("anonymous"))).toBe(true);
    for (const role of roles.filter((r) => r !== "anonymous")) {
      expect(shouldShow("anonymous", undefined, user(role))).toBe(false);
    }
  });

  it("'player' returns true for player and above, false for anonymous", () => {
    expect(shouldShow("member", undefined, user("anonymous"))).toBe(false);
    expect(shouldShow("member", undefined, user("member"))).toBe(true);
    expect(shouldShow("member", undefined, user("curator"))).toBe(true);
    expect(shouldShow("member", undefined, user("admin"))).toBe(true);
  });

  it("'admin' returns true only for admin", () => {
    for (const role of roles.filter((r) => r !== "admin")) {
      expect(shouldShow("admin", undefined, user(role))).toBe(false);
    }
    expect(shouldShow("admin", undefined, user("admin"))).toBe(true);
  });

  it("'curator' returns true for curator and above, false for player/anonymous", () => {
    expect(shouldShow("curator", undefined, user("anonymous"))).toBe(false);
    expect(shouldShow("curator", undefined, user("member"))).toBe(false);
    expect(shouldShow("curator", undefined, user("curator"))).toBe(true);
    expect(shouldShow("curator", undefined, user("admin"))).toBe(true);
  });

  it("hideWhen excludes a role that would otherwise pass showWhen via hierarchy", () => {
    expect(shouldShow("member", "curator", user("member"))).toBe(true);
    expect(shouldShow("member", "curator", user("curator"))).toBe(false);
    expect(shouldShow("member", "curator", user("admin"))).toBe(false);
  });
});

describe("shouldShowPhase", () => {
  it("undefined showWhenPhase ignores phase entirely", () => {
    expect(shouldShowPhase(undefined, null)).toBe(true);
    expect(shouldShowPhase(undefined, "lobby")).toBe(true);
  });

  it("null current phase hides any phase-gated entry", () => {
    expect(shouldShowPhase("lobby", null)).toBe(false);
  });

  it("matches a single phase string", () => {
    expect(shouldShowPhase("lobby", "lobby")).toBe(true);
    expect(shouldShowPhase("lobby", "playing")).toBe(false);
  });

  it("matches any phase in a list", () => {
    expect(shouldShowPhase(["setup", "result"], "setup")).toBe(true);
    expect(shouldShowPhase(["setup", "result"], "playing")).toBe(false);
  });
});

describe("PAGE_CONFIG completeness", () => {
  const knownRoutes = [
    "/",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/signup",
    "/profile",
    "/profile/*",
    "/billing/return",
    "/legal/*",
    "/admin/*",
    "/manage/*",
    "/solo/setup",
    "/solo/play",
    "/solo/results",
    "/solo/leaderboard",
    "/history",
    "/history/*",
    "/curator/create",
    "/curator/history",
    "/curator/history/*",
    "/curator/questions",
    "/manage/import",
    "/manage/questions",
    "/manage/avatars",
    "/curator/display",
    "/join",
    "/closed",
    "/quiz/setup",
    "/quiz/lobby",
    "/quiz/play",
    "/quiz/roles",
    "/quiz/results",
    "/mimic/*",
  ];

  it("has an entry for every known route", () => {
    for (const route of knownRoutes) {
      expect(PAGE_CONFIG[route], `missing config for ${route}`).toBeDefined();
    }
  });

  it("has no extra route entries", () => {
    expect(Object.keys(PAGE_CONFIG).length).toBe(knownRoutes.length);
  });
});

describe("getPageConfig", () => {
  it("returns exact match for known routes", () => {
    expect(getPageConfig("/")).toBe(PAGE_CONFIG["/"]);
    expect(getPageConfig("/curator/create")).toBe(
      PAGE_CONFIG["/curator/create"],
    );
    expect(getPageConfig("/quiz/play")).toBe(PAGE_CONFIG["/quiz/play"]);
  });

  it("returns wildcard match for /legal/* routes", () => {
    expect(getPageConfig("/legal/privacy")).toBe(PAGE_CONFIG["/legal/*"]);
    expect(getPageConfig("/legal/terms")).toBe(PAGE_CONFIG["/legal/*"]);
  });

  it("returns wildcard match for /admin/* routes", () => {
    expect(getPageConfig("/admin/users")).toBe(PAGE_CONFIG["/admin/*"]);
  });

  it("returns wildcard match for the staged mimic routes (#1101)", () => {
    expect(getPageConfig("/mimic/join")).toBe(PAGE_CONFIG["/mimic/*"]);
    expect(getPageConfig("/mimic/closed")).toBe(PAGE_CONFIG["/mimic/*"]);
    expect(getPageConfig("/mimic/error/403")).toBe(PAGE_CONFIG["/mimic/*"]);
  });

  it("exact match takes precedence over wildcard", () => {
    expect(getPageConfig("/curator/questions")).toBe(
      PAGE_CONFIG["/curator/questions"],
    );
    // /profile exact vs /profile/* wildcard (#829).
    expect(getPageConfig("/profile")).toBe(PAGE_CONFIG["/profile"]);
    expect(getPageConfig("/profile/sessions")).toBe(PAGE_CONFIG["/profile/*"]);
  });

  it("returns fallback for unknown routes", () => {
    const fallback = getPageConfig("/unknown/route");
    expect(fallback.header.href).toBe("/");
    expect(fallback.header.showWordmark).toBe(false);
    // Every route has a footer (decision #13); the fallback is compact.
    expect(fallback.footer).toEqual({ showNav: false });
  });
});

describe("page config shape", () => {
  it("separates header and footer blocks per route", () => {
    const home = getPageConfig("/");
    expect(home.header.showWordmark).toBe(true);
    expect(home.footer).toEqual({ showNav: true });
  });

  it("carries the use cases a collection point declares", () => {
    expect(getPageConfig("/join").footer?.useCases).toContain("player");
    expect(getPageConfig("/profile/sessions").footer?.useCases).toContain(
      "location",
    );
  });

  it("declares no use cases on routes that collect nothing new", () => {
    expect(getPageConfig("/legal/privacy").footer?.useCases).toBeUndefined();
  });
});

// ── power-gated links (map #859, decision 9) ─────────────────────────────────

describe("shouldShow — showWhenPower", () => {
  const withPowers = (role: UserRole, powers: UserPower[]) => ({
    role,
    powers,
  });

  it("shows a power-gated link to a holder of any role", () => {
    expect(
      shouldShow(
        undefined,
        undefined,
        withPowers("curator", ["can-import-quizzes"]),
        "can-import-quizzes",
      ),
    ).toBe(true);
  });

  it("hides it from an admin who lacks the power — no role shortcut", () => {
    expect(
      shouldShow(
        undefined,
        undefined,
        withPowers("admin", []),
        "can-import-quizzes",
      ),
    ).toBe(false);
  });

  it("hides it from a user carrying no powers at all", () => {
    expect(
      shouldShow(
        undefined,
        undefined,
        { role: "admin" as UserRole },
        "can-import-quizzes",
      ),
    ).toBe(false);
  });

  it("still honours showWhen alongside the power", () => {
    expect(
      shouldShow(
        "curator",
        undefined,
        withPowers("member", ["can-import-quizzes"]),
        "can-import-quizzes",
      ),
    ).toBe(false);
  });
});

describe("shouldShowFlag", () => {
  it("shows an ungated link whatever the flags say", () => {
    expect(shouldShowFlag(undefined, {})).toBe(true);
    expect(shouldShowFlag(undefined, { PLAYER_HISTORY: false })).toBe(true);
  });

  it("hides a gated link while its flag is off", () => {
    expect(shouldShowFlag("PLAYER_HISTORY", { PLAYER_HISTORY: false })).toBe(
      false,
    );
  });

  it("shows a gated link once its flag is on", () => {
    expect(shouldShowFlag("PLAYER_HISTORY", { PLAYER_HISTORY: true })).toBe(
      true,
    );
  });

  it("hides a gated link when the flag never resolved, rather than leaking it", () => {
    // A link pointing at a refusal is worse than a missing link, so an
    // unresolved flag reads as off.
    expect(shouldShowFlag("PLAYER_HISTORY", {})).toBe(false);
  });
});

describe("nav links into the player's record", () => {
  const linkEntries = () =>
    Object.entries(PAGE_CONFIG).flatMap(([route, cfg]) =>
      [...(cfg.header.leftLinks ?? []), ...(cfg.header.rightLinks ?? [])]
        .filter((l) => l.type === "link")
        .map((l) => [route, l] as const),
    );

  // Each area the surface flags govern, and the flag that must cover any link
  // into it. A link the flag does not cover points straight at a refusal.
  const GATED_AREAS = [
    ["/history", "PLAYER_HISTORY"],
    ["/curator/history", "CURATOR_HISTORY"],
    ["/solo/leaderboard", "SOLO_LEADERBOARDS"],
  ] as const;

  it.each(GATED_AREAS)("gates every link into %s on %s", (area, flag) => {
    const ungated = linkEntries()
      .filter(([, l]) => l.href === area || l.href.startsWith(`${area}/`))
      .filter(([, l]) => l.showWhenFlag !== flag)
      .map(([route, l]) => `${route} → ${l.label}`);
    expect(ungated).toEqual([]);
  });

  it("lists every flag the nav gates on, so the layout can resolve them", () => {
    for (const [, flag] of GATED_AREAS) expect(UI_FLAGS).toContain(flag);
  });

  it("resolves every flag a page template reads off uiFlags", () => {
    // A template reading a flag the layout never resolved gets `undefined`,
    // which hides the control for good while the flag is on — and typechecks.
    const read = new Set<string>();
    for (const file of globSync("src/**/*.svelte")) {
      for (const m of readFileSync(file, "utf8").matchAll(
        /uiFlags\.([A-Z_]+)/g,
      )) {
        if (m[1]) read.add(m[1]);
      }
    }
    expect([...read].sort()).toEqual([...TEMPLATE_FLAGS].sort());
    for (const flag of read) expect(UI_FLAGS).toContain(flag);
  });
});

// ── Cast in the lobby header (#979) ───────────────────────────────────────────

describe("/quiz/lobby cast entry", () => {
  const castEntry = getPageConfig("/quiz/lobby").header.rightLinks?.find(
    (l) => l.type === "cast",
  );

  it("has a cast entry gated to curator during the lobby phase", () => {
    expect(castEntry).toBeDefined();
    expect(castEntry?.showWhen).toBe("curator");
    expect(castEntry?.showWhenPhase).toBe("lobby");
  });

  it("shows for curator, hides for player", () => {
    expect(
      shouldShow(castEntry?.showWhen, undefined, { role: "curator" }),
    ).toBe(true);
    expect(shouldShow(castEntry?.showWhen, undefined, { role: "member" })).toBe(
      false,
    );
  });
});

describe("AppHeader renders every LinkEntry.type", () => {
  it("has a branch for the 'cast' link type", () => {
    const src = readFileSync(
      "src/lib/components/layout/AppHeader.svelte",
      "utf8",
    );
    expect(src).toContain('link.type === "cast"');
  });
});
