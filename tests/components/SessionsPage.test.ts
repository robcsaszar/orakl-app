import { render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SessionsPage from "../../src/routes/(app)/profile/sessions/+page.svelte";

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
}));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { goto, invalidateAll } from "$app/navigation";

const NOW = Math.floor(Date.now() / 1000);

beforeEach(() => {
  // jsdom lacks the Web Animations API — stub so any transition is inert.
  Element.prototype.animate = vi.fn().mockReturnValue({
    cancel: vi.fn(),
    onfinish: null,
  });
  vi.clearAllMocks();
  global.fetch = vi.fn(async () =>
    Promise.resolve({ ok: true, json: async () => ({}) } as Response),
  );
});

function session(over: Record<string, unknown> = {}) {
  return {
    sid: "s1",
    fingerprint: "abc123",
    label: "Chrome on Linux",
    createdAt: NOW,
    lastSeen: NOW,
    current: true,
    location: null,
    ...over,
  };
}

function renderPage(
  sessions = [session()],
  locationOptIn = { enabled: false, since: null },
) {
  return render(SessionsPage, {
    props: { data: { sessions, locationOptIn } } as never,
  });
}

const two = () => [
  session(),
  session({
    sid: "s2",
    fingerprint: "def456",
    label: "Safari on iOS",
    current: false,
  }),
];

/** ConfirmButton needs a reveal click then a confirm click on the same el. */
async function confirm(user: ReturnType<typeof userEvent.setup>, el: Element) {
  await user.click(el);
  await user.click(el);
}

describe("/profile/sessions page", () => {
  it("lists each session and badges the current device", () => {
    renderPage(two());
    expect(screen.getByText("Chrome on Linux")).toBeInTheDocument();
    expect(screen.getByText("Safari on iOS")).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
  });

  it("exposes sign-in time + fingerprint via the info tooltip", () => {
    renderPage();
    const info = screen.getByRole("button", { name: "Session details" });
    const tip = info.getAttribute("data-tooltip") ?? "";
    expect(tip).toMatch(/Signed in/);
    expect(tip).toContain("ID abc123");
  });

  it("empty state offers no destructive actions", () => {
    renderPage([]);
    expect(
      screen.getByText(/no active sessions on record/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign out everywhere" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign out other devices" }),
    ).not.toBeInTheDocument();
  });

  it("per-row sign out revokes that device in place (non-current)", async () => {
    const user = userEvent.setup();
    renderPage(two());
    // Two per-row "Sign out" controls; index 1 is the non-current row (s2).
    const rows = screen.getAllByRole("button", { name: "Sign out" });
    await user.click(rows[1]); // reveal the confirm
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    await user.click(rows[1]); // confirm

    expect(fetch).toHaveBeenCalledWith("/api/profile/sessions/s2", {
      method: "DELETE",
    });
    expect(invalidateAll).toHaveBeenCalledOnce();
    expect(goto).not.toHaveBeenCalled();
  });

  it("per-row sign out of the current device returns to login", async () => {
    const user = userEvent.setup();
    renderPage(two());
    const rows = screen.getAllByRole("button", { name: "Sign out" });
    await confirm(user, rows[0]); // current device (s1)

    expect(fetch).toHaveBeenCalledWith("/api/profile/sessions/s1", {
      method: "DELETE",
    });
    expect(goto).toHaveBeenCalledWith("/login");
  });

  it("sign out other devices confirms in a dialog, scoped to others", async () => {
    const user = userEvent.setup();
    renderPage(two());
    await user.click(
      screen.getByRole("button", { name: "Sign out other devices" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/every device except this one/i);
    await user.click(
      within(dialog).getByRole("button", { name: "Sign out other devices" }),
    );

    expect(fetch).toHaveBeenCalledWith("/api/profile/sessions?scope=others", {
      method: "DELETE",
    });
    expect(goto).not.toHaveBeenCalled();
  });

  it("sign out everywhere confirms in a dialog, then returns to login", async () => {
    const user = userEvent.setup();
    renderPage(two());
    await user.click(
      screen.getByRole("button", { name: "Sign out everywhere" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/all devices will be signed out/i);
    await user.click(
      within(dialog).getByRole("button", { name: "Sign out everywhere" }),
    );

    expect(fetch).toHaveBeenCalledWith("/api/profile/sessions", {
      method: "DELETE",
    });
    expect(goto).toHaveBeenCalledWith("/login");
  });

  it("cancelling a bulk dialog does nothing", async () => {
    const user = userEvent.setup();
    renderPage(two());
    await user.click(
      screen.getByRole("button", { name: "Sign out everywhere" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it("hides the bulk card when only the current device exists", () => {
    renderPage(); // single current-only device
    expect(
      screen.queryByRole("button", { name: "Sign out other devices" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign out everywhere" }),
    ).not.toBeInTheDocument();
  });
});

describe("/profile/sessions — sign-in locations opt-in (decision #9)", () => {
  it("asks the agreed question and links the policy at the location use case", () => {
    renderPage();
    expect(
      screen.getByText("Would you like to see your sign-in locations?"),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /privacy policy/i });
    expect(link).toHaveAttribute("href", "/legal/privacy#use-location");
    expect(
      screen.getByRole("button", { name: "Turn on sign-in locations" }),
    ).toBeInTheDocument();
  });

  it("turning on warns about signing out everywhere, then PUTs and returns to login", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      screen.getByRole("button", { name: "Turn on sign-in locations" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/signed out everywhere/i);
    await user.click(within(dialog).getByRole("button", { name: "Turn on" }));

    expect(fetch).toHaveBeenCalledWith("/api/profile/location-opt-in", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    expect(goto).toHaveBeenCalledWith("/login");
  });

  it("turning off confirms in place, PUTs, and refreshes the list", async () => {
    const user = userEvent.setup();
    renderPage([session()], { enabled: true, since: NOW });
    expect(
      screen.queryByRole("button", { name: "Turn on sign-in locations" }),
    ).not.toBeInTheDocument();
    const off = screen.getByRole("button", {
      name: "Turn off sign-in locations",
    });
    await confirm(user, off);

    expect(fetch).toHaveBeenCalledWith("/api/profile/location-opt-in", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    expect(invalidateAll).toHaveBeenCalledOnce();
    expect(goto).not.toHaveBeenCalled();
  });

  it("shows a session's city label when present", () => {
    renderPage([session({ location: "London, United Kingdom" })], {
      enabled: true,
      since: NOW,
    });
    expect(screen.getByText("London, United Kingdom")).toBeInTheDocument();
  });
});

describe("/profile/sessions — GeoLite2 attribution (decision #16)", () => {
  it("shows the MaxMind attribution only while sign-in locations are on", () => {
    renderPage([session()], { enabled: true, since: NOW });
    expect(
      screen.getByText(/GeoLite2 data created by MaxMind/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "maxmind.com" })).toHaveAttribute(
      "href",
      "https://www.maxmind.com",
    );
  });

  it("hides the attribution when locations are off", () => {
    renderPage();
    expect(screen.queryByText(/MaxMind/)).not.toBeInTheDocument();
  });
});
