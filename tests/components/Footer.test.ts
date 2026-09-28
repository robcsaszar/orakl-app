import { render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Footer from "../../src/lib/components/layout/Footer.svelte";
import { anchorFor, LEDGER } from "../../src/lib/legal/ledger.js";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const on = { enabled: true, browserSignal: false };

beforeEach(() => {
  localStorage.clear();
  // jsdom: popover API + matchMedia are absent.
  HTMLElement.prototype.togglePopover ??= vi.fn();
  HTMLElement.prototype.showPopover ??= vi.fn();
  HTMLElement.prototype.hidePopover ??= vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
});

describe("Footer — variants (decision #13)", () => {
  it("full variant carries the legal nav, the analytics control and the copyright", () => {
    render(Footer, { props: { showNav: true, analytics: on } });
    const nav = screen.getByRole("navigation", { name: "Legal" });
    expect(within(nav).getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    expect(
      within(nav).getByRole("link", { name: "Terms" }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("link", { name: "Cookies" }),
    ).toBeInTheDocument();
    // The analytics control sits beside the Cookies link, in the nav.
    expect(
      within(nav).getByRole("button", { name: "Analytics on" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
  });

  it("compact variant is one line: policy link + analytics control, no nav, no copyright", () => {
    const { container } = render(Footer, {
      props: { showNav: false, analytics: on },
    });
    expect(container.querySelector("footer")?.dataset.variant).toBe("compact");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByText(/All rights reserved/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analytics on" }),
    ).toBeInTheDocument();
  });

  it("the analytics control reflects a browser privacy signal and offers no toggle", () => {
    const { container } = render(Footer, {
      props: {
        showNav: false,
        analytics: { enabled: false, browserSignal: true },
      },
    });
    const trigger = screen.getByRole("button", { name: "Analytics off" });
    const panel = container.querySelector(
      `#${trigger.getAttribute("aria-controls")}`,
    ) as HTMLElement;
    expect(panel).toHaveTextContent(/your browser asks not to be tracked/i);
    expect(
      within(panel).queryByRole("button", {
        name: /turn (on|off)/i,
        hidden: true,
      }),
    ).not.toBeInTheDocument();
  });
});

describe("Footer — use-case notice", () => {
  it("renders no info-i on a route that collects nothing new", () => {
    render(Footer, { props: { showNav: true, analytics: on } });
    expect(
      screen.queryByRole("button", { name: "What this page collects" }),
    ).not.toBeInTheDocument();
  });

  it("renders the info-i; its popover carries each ledger sentence and anchor link", async () => {
    const user = userEvent.setup();
    const { container } = render(Footer, {
      props: {
        showNav: false,
        useCases: ["player", "browser-storage"],
        pathname: "/join",
        analytics: on,
      },
    });
    const i = screen.getByRole("button", { name: "What this page collects" });
    await user.click(i);
    // jsdom keeps a closed popover display:none, which hides it from ARIA
    // name computation; the wiring (aria-controls → id) and its content are
    // what we assert on.
    const dialog = container.querySelector(
      `#${i.getAttribute("aria-controls")}`,
    ) as HTMLElement;
    expect(dialog).toHaveAttribute("role", "dialog");
    expect(dialog).toHaveTextContent("What this page collects");
    for (const id of ["player", "browser-storage"] as const) {
      const row = LEDGER.find((r) => r.id === id)!;
      expect(within(dialog).getByText(row.sentence)).toBeInTheDocument();
      expect(
        within(dialog).getByRole("link", { name: row.element, hidden: true }),
      ).toHaveAttribute("href", `/legal/privacy#${anchorFor(id)}`);
    }
  });
});

describe("Footer — first-visit shine", () => {
  const props = {
    showNav: false,
    useCases: ["player" as const],
    pathname: "/join",
    analytics: on,
  };
  const icon = () =>
    screen.getByRole("button", { name: "What this page collects" });

  it("shines on the first visit to a collection point and remembers it", async () => {
    render(Footer, { props });
    await vi.waitFor(() => expect(icon().dataset.shine).toBe("true"));
    expect(
      JSON.parse(localStorage.getItem("orakl-notice-seen") ?? "[]"),
    ).toEqual(["/join"]);
  });

  it("does not shine again on a later visit", async () => {
    localStorage.setItem("orakl-notice-seen", JSON.stringify(["/join"]));
    render(Footer, { props });
    await new Promise((r) => setTimeout(r, 0));
    expect(icon().dataset.shine).toBeUndefined();
  });

  it("never shines under prefers-reduced-motion, but still records the visit", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    render(Footer, { props });
    await new Promise((r) => setTimeout(r, 0));
    expect(icon().dataset.shine).toBeUndefined();
    expect(
      JSON.parse(localStorage.getItem("orakl-notice-seen") ?? "[]"),
    ).toEqual(["/join"]);
  });
});

describe("Footer — persistent layout, client-side navigation", () => {
  it("re-evaluates the shine per pathname and closes an open panel on navigation", async () => {
    const user = userEvent.setup();
    localStorage.setItem("orakl-notice-seen", JSON.stringify(["/join"]));
    const { rerender } = render(Footer, {
      props: {
        showNav: false,
        useCases: ["player" as const],
        pathname: "/join",
        analytics: on,
      },
    });
    const i = () =>
      screen.getByRole("button", { name: "What this page collects" });
    await new Promise((r) => setTimeout(r, 0));
    expect(i().dataset.shine).toBeUndefined(); // already seen
    await user.click(i());
    expect(i()).toHaveAttribute("aria-expanded", "true");

    // Navigate to a collection point not yet seen: panel closes, shine plays,
    // the new path is recorded.
    await rerender({
      showNav: false,
      useCases: ["uploads" as const],
      pathname: "/curator/create",
      analytics: on,
    });
    await vi.waitFor(() => expect(i().dataset.shine).toBe("true"));
    expect(i()).toHaveAttribute("aria-expanded", "false");
    expect(
      JSON.parse(localStorage.getItem("orakl-notice-seen") ?? "[]"),
    ).toEqual(["/join", "/curator/create"]);
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(Footer, {
      props: {
        showNav: false,
        useCases: ["player" as const],
        pathname: "/join",
        analytics: on,
      },
    });
    const i = screen.getByRole("button", { name: "What this page collects" });
    await user.click(i);
    expect(i).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(i).toHaveAttribute("aria-expanded", "false");
  });
});
