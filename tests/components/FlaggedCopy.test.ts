import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminUsers from "../../src/routes/(app)/admin/users/AdminUsers.svelte";
import ProfilePage from "../../src/routes/(app)/profile/+page.svelte";
import SoloGuestCta from "../../src/routes/(app)/solo/SoloGuestCta.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

/**
 * A switched-off feature must not be named anywhere a user can see — no link,
 * no label, no heading, no prose. These are the surfaces that stay reachable
 * while the flags are off, so they are where a stray mention would surface.
 */
const FORBIDDEN = {
  SOLO_LEADERBOARDS: [/leaderboard/i, /ranking/i, /no board/i],
  PLAYER_HISTORY: [/your history/i, /your record/i, /your ledger/i],
};

/**
 * Everything the page says, less the dev fixture links — `/mimic/*` exists to
 * preview UI that is switched off, so its labels are not product copy.
 */
function productText(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  for (const link of clone.querySelectorAll('a[href^="/mimic"]')) link.remove();
  return clone.textContent ?? "";
}

function assertSilent(text: string, flag: keyof typeof FORBIDDEN) {
  for (const pattern of FORBIDDEN[flag]) {
    expect(text, `${flag} is off but the page says ${pattern}`).not.toMatch(
      pattern,
    );
  }
}

const profileData = (uiFlags: Record<string, boolean>) => ({
  data: {
    user: {
      nickname: "Pyth",
      role: "member",
      powers: [],
      avatar: "",
      emailVerified: true,
    },
    theme: { mode: "dynamic" },
    font: "geist",
    pendingRequest: null,
    subscription: null,
    allowance: null,
    breakdown: {
      exact: null,
      estimate: {
        monthly: { vat: 87, fee: 56, net: 357 },
        lifetime: { vat: 1736, fee: 417, net: 7847 },
      },
    },
    claimed: false,
    verified: false,
    tab: "account",
    uiFlags,
    analytics: { enabled: false, browserSignal: false },
  },
});

describe("the profile ledger card names only what is switched on", () => {
  // The page starts a dynamic import of ThemePicker on render; a worker that
  // closes while it is in flight rejects it after the suite has finished.
  afterEach(() => vi.dynamicImportSettled());

  it("drops the card entirely when both are off", () => {
    const { container } = render(
      ProfilePage,
      profileData({ PLAYER_HISTORY: false, SOLO_LEADERBOARDS: false }) as never,
    );
    assertSilent(productText(container), "SOLO_LEADERBOARDS");
    assertSilent(productText(container), "PLAYER_HISTORY");
    // Not merely silent — gone. With nothing to point at, the card does not
    // render at all; a trial starts from the home page instead.
    const headings = [...container.querySelectorAll("h2")].map((h) =>
      h.textContent?.trim(),
    );
    expect(headings).not.toContain("Your ledger");
    expect(headings).not.toContain("Quiz rankings");
  });

  it("names the boards but not the record when only the boards are on", () => {
    const { container } = render(
      ProfilePage,
      profileData({ PLAYER_HISTORY: false, SOLO_LEADERBOARDS: true }) as never,
    );
    assertSilent(productText(container), "PLAYER_HISTORY");
    expect(productText(container)).toMatch(/ranking/i);
  });

  it("names the record but not the boards when only the record is on", () => {
    const { container } = render(
      ProfilePage,
      profileData({ PLAYER_HISTORY: true, SOLO_LEADERBOARDS: false }) as never,
    );
    assertSilent(productText(container), "SOLO_LEADERBOARDS");
    expect(productText(container)).toMatch(/your history/i);
  });
});

describe("the guest pitch sells only what is switched on", () => {
  it("drops the boards from the perks when they are off", () => {
    const { container } = render(SoloGuestCta, {
      props: { leaderboards: false, subline: "Sign in to keep this run." },
    } as never);
    assertSilent(productText(container), "SOLO_LEADERBOARDS");
  });
});

describe("user management offers exclusion only when there is a board", () => {
  // An actually-excluded user, so the marker has something to render from.
  const excludedUser = {
    id: "u1",
    email: "barred@test.local",
    role: "member",
    nickname: "Barred",
    avatar: null,
    powers: "[]",
    created_at: "2026-01-01",
    admin_note: null,
    leaderboard_excluded: 1,
  };
  const props = (leaderboards: boolean) => ({
    props: {
      initial: {
        users: [excludedUser],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
      currentUserId: "a1",
      roles: ["member", "curator", "admin"],
      allPowers: [],
      pendingRequests: [],
      leaderboards,
    },
  });

  it("marks an excluded user while the boards are on", () => {
    const { container } = render(AdminUsers, props(true) as never);
    expect(container.textContent).toMatch(/no board/i);
  });

  it("says nothing of boards or rankings while they are off", () => {
    const { container } = render(AdminUsers, props(false) as never);
    assertSilent(productText(container), "SOLO_LEADERBOARDS");
  });
});
