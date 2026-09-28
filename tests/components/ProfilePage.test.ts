import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "../../src/routes/(app)/profile/+page.svelte";

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  replaceState: vi.fn(),
  invalidateAll: vi.fn(),
}));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { replaceState } from "$app/navigation";

beforeEach(() => {
  // jsdom lacks the Web Animations API — stub so any transition is inert.
  Element.prototype.animate = vi.fn().mockReturnValue({
    cancel: vi.fn(),
    onfinish: null,
  });
  vi.clearAllMocks();
  global.fetch = vi.fn(async () =>
    Promise.resolve({ ok: true, json: async () => [] } as Response),
  );
});

function profileData(over: Record<string, unknown> = {}) {
  return {
    user: {
      nickname: "Rob",
      role: "member",
      powers: [],
      avatar: "",
      emailVerified: true,
    },
    theme: { mode: "day" },
    font: "default",
    pendingRequest: null,
    graceOver: false,
    allowance: null,
    breakdown: {
      exact: null,
      estimate: {
        monthly: { vat: 87, fee: 56, net: 357 },
        lifetime: { vat: 1736, fee: 417, net: 7847 },
      },
    },
    welcome: null,
    claimed: false,
    verified: false,
    tab: "account",
    tools: false,
    uiFlags: {},
    analytics: { enabled: true, browserSignal: false },
    ...over,
  };
}

function renderPage(over: Record<string, unknown> = {}) {
  return render(ProfilePage, { props: { data: profileData(over) } as never });
}

describe("/profile page — tabs", () => {
  it("shows exactly Account, Appearance, Privacy & data in order, Account selected", () => {
    renderPage();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Account",
      "Appearance",
      "Privacy & data",
    ]);
    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Account panel holds its cards and not the other tabs' content", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Your details" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Change password" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Active sessions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Host quizzes" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Analytics" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Reading font" }),
    ).not.toBeInTheDocument();
  });

  it("offers the curator application only to a holder of the power", () => {
    // Map #1124, decision 3: a member without the power is concealed from the
    // apply path, not shown a control that refuses them.
    renderPage();
    expect(
      screen.queryByRole("button", { name: "Apply for curator" }),
    ).not.toBeInTheDocument();

    cleanup();
    renderPage({
      user: {
        nickname: "Rob",
        role: "member",
        powers: ["can-apply-for-curation"],
        avatar: "",
        emailVerified: true,
      },
    });
    expect(
      screen.getByRole("button", { name: "Apply for curator" }),
    ).toBeInTheDocument();
    // The subscribe path stays present for both: monthly and lifetime.
    expect(
      screen.getAllByRole("button", { name: /Subscribe to host/ }),
    ).toHaveLength(2);
  });

  it("shows a pending request only to a member who holds the power", () => {
    renderPage({ pendingRequest: { id: "r1", status: "pending" } });
    expect(screen.queryByText(/Request submitted/)).not.toBeInTheDocument();

    cleanup();
    renderPage({
      pendingRequest: { id: "r1", status: "pending" },
      user: {
        nickname: "Rob",
        role: "member",
        powers: ["can-apply-for-curation"],
        avatar: "",
        emailVerified: true,
      },
    });
    expect(screen.getByText(/Request submitted/)).toBeInTheDocument();
  });

  it("data.tab = appearance selects Appearance and shows Reading font, not Your details", () => {
    renderPage({ tab: "appearance" });
    expect(screen.getByRole("tab", { name: "Appearance" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "Reading font" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Your details" }),
    ).not.toBeInTheDocument();
  });

  it("data.tab = privacy shows Analytics, Your data, Delete account", () => {
    renderPage({ tab: "privacy" });
    expect(
      screen.getByRole("heading", { name: "Analytics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Your data" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Delete account" }),
    ).toBeInTheDocument();
  });

  it("Host quizzes card: unverified, no subscription row shows a verify prompt, no subscribe buttons", () => {
    renderPage({ user: { ...profileData().user, emailVerified: false } });
    expect(
      screen.getByText("Verify your email to subscribe."),
    ).toBeInTheDocument();
    expect(
      screen.queryAllByRole("button", { name: /Subscribe to host/ }),
    ).toHaveLength(0);
  });

  it("Host quizzes card: verified, no subscription row shows both subscribe buttons", () => {
    renderPage();
    expect(
      screen.getAllByRole("button", { name: /Subscribe to host/ }),
    ).toHaveLength(2);
    expect(
      screen.queryByText("Verify your email to subscribe."),
    ).not.toBeInTheDocument();
  });

  it("Host quizzes card: no row shows two estimate blocks with the €5/€100 figures", () => {
    renderPage();
    expect(
      screen.getByText(
        /My VAT \(21%\) €0\.87 · Polar fee €0\.56 · Orakl €3\.57/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /My VAT \(21%\) €17\.36 · Polar fee €4\.17 · Orakl €78\.47/,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/estimate:/)).toHaveLength(2);
  });

  it("Host quizzes card: active row with an exact order shows the exact figures, not the estimate", () => {
    renderPage({
      subscription: { status: "active", current_period_end: null },
      breakdown: {
        exact: { vat: 12, fee: 34, net: 454, total: 500 },
        estimate: {
          monthly: { vat: 87, fee: 56, net: 357 },
          lifetime: { vat: 1736, fee: 417, net: 7847 },
        },
      },
    });
    expect(
      screen.getByText(
        /My VAT \(21%\) €0\.12 · Polar fee €0\.34 · Orakl €4\.54/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/estimate:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^Last payment:/)).toBeInTheDocument();
  });

  it("Host quizzes card: past_due within the grace shows the stays-open copy and the portal button", () => {
    renderPage({
      subscription: { status: "past_due", current_period_end: null },
      graceOver: false,
    });
    expect(
      screen.getByText(
        "Hosting stays open for seven days after a failed payment.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage subscription" }),
    ).toBeInTheDocument();
  });

  it("Host quizzes card: past_due after the grace shows the closed copy and the portal button", () => {
    renderPage({
      subscription: { status: "past_due", current_period_end: null },
      graceOver: true,
    });
    expect(
      screen.getByText("Hosting is closed until the payment is fixed."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Hosting stays open for seven days after a failed payment.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Manage subscription" }),
    ).toBeInTheDocument();
  });

  it("welcome monthly: heading, renewal date, and host-a-quiz link", () => {
    renderPage({
      welcome: "monthly",
      subscription: { status: "active", current_period_end: "2026-10-01" },
    });
    expect(screen.getByText("Welcome, curator")).toBeInTheDocument();
    expect(
      screen.getByText(/Hosting is open\. Your subscription renews on/),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Host a quiz" });
    expect(link).toHaveAttribute("href", "/curator/create");
  });

  it("welcome lifetime: heading and never-renews copy", () => {
    renderPage({ welcome: "lifetime" });
    expect(screen.getByText("Welcome, curator. For life.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hosting is open and never renews. Nothing more to pay.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Host a quiz" })).toHaveAttribute(
      "href",
      "/curator/create",
    );
  });

  it("welcome absent: no banner when welcome is null", () => {
    renderPage({ welcome: null });
    expect(screen.queryByText(/^Welcome, curator/)).not.toBeInTheDocument();
  });

  it("verify-email nag renders before the tablist when unverified", () => {
    renderPage({ user: { ...profileData().user, emailVerified: false } });
    const nag = screen.getByText("Verify your email");
    const tablist = screen.getByRole("tablist");
    expect(
      nag.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("clicking Appearance replaces the URL shallowly — no history entry, no load rerun", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "Appearance" }));
    expect(replaceState).toHaveBeenCalledOnce();
    const [url] = (replaceState as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("tab=appearance");
    expect(screen.getByRole("tab", { name: "Appearance" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("switching away from Account and back clears typed password fields", async () => {
    const user = userEvent.setup();
    renderPage();
    const current = screen.getByLabelText("Current password");
    await user.type(current, "hunter2");
    expect(current).toHaveValue("hunter2");

    await user.click(screen.getByRole("tab", { name: "Appearance" }));
    await user.click(screen.getByRole("tab", { name: "Account" }));

    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });

  it("tools: false shows exactly three tabs and no Management or Mimic content", () => {
    renderPage({ tools: false });
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Account",
      "Appearance",
      "Privacy & data",
    ]);
    expect(
      screen.queryByRole("heading", { name: "Management" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Mimic mode" }),
    ).not.toBeInTheDocument();
  });

  it("tools: true shows four tabs ending with Tools", () => {
    renderPage({ tools: true });
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Account",
      "Appearance",
      "Privacy & data",
      "Tools",
    ]);
  });

  it("tab: tools, role admin shows Management and Mimic mode under Tools, not Account", () => {
    renderPage({
      tab: "tools",
      tools: true,
      user: { ...profileData().user, role: "admin" },
    });
    const tabpanel = screen.getByRole("tabpanel");
    expect(
      screen.getByRole("heading", { name: "Management" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Mimic mode" }),
    ).toBeInTheDocument();
    expect(tabpanel).toContainElement(
      screen.getByRole("heading", { name: "Management" }),
    );
    expect(tabpanel).toContainElement(
      screen.getByRole("heading", { name: "Mimic mode" }),
    );
  });

  it("ledger heading follows Avatar in Account when a history flag is on", () => {
    renderPage({ uiFlags: { PLAYER_HISTORY: true } });
    const headings = screen.getAllByRole("heading").map((h) => h.textContent);
    const avatarIndex = headings.indexOf("Avatar");
    expect(headings[avatarIndex + 1]).toBe("Your ledger");
  });

  it("no ledger heading when both history flags are off", () => {
    renderPage({ uiFlags: {} });
    expect(
      screen.queryByRole("heading", { name: "Your ledger" }),
    ).not.toBeInTheDocument();
  });
});

describe("/profile page — allowance banner (map #1184)", () => {
  it("verified member, not entitled: banner names the remaining count and links #host", () => {
    renderPage({
      allowance: {
        used: 2,
        limit: 5,
        left: 3,
        entitled: false,
        unverified: false,
      },
    });
    expect(screen.getByText("3 of 5 free games left.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Subscribe to host without limits" }),
    ).toHaveAttribute("href", "#host");
  });

  it("curator (allowance null): no banner", () => {
    renderPage({
      user: { ...profileData().user, role: "curator" },
      allowance: null,
    });
    expect(screen.queryByText(/free games left/)).not.toBeInTheDocument();
  });

  it("past-due subscriber: the past-due banner speaks alone, no allowance banner", () => {
    renderPage({
      subscription: { status: "past_due", current_period_end: null },
      allowance: {
        used: 0,
        limit: 5,
        left: 5,
        entitled: false,
        unverified: false,
      },
    });
    expect(screen.queryByText(/free games left/)).not.toBeInTheDocument();
  });

  it("unverified member: no allowance banner", () => {
    renderPage({
      user: { ...profileData().user, emailVerified: false },
      allowance: {
        used: 0,
        limit: 5,
        left: 5,
        entitled: false,
        unverified: true,
      },
    });
    expect(screen.queryByText(/free games left/)).not.toBeInTheDocument();
  });
});
