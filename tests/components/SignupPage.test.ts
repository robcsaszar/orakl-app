import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "../../src/routes/(auth)/signup/+page.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// jsdom lacks the popover API the password-strength hint uses.
beforeEach(() => {
  HTMLElement.prototype.showPopover ??= vi.fn();
  HTMLElement.prototype.hidePopover ??= vi.fn();
  HTMLElement.prototype.togglePopover ??= vi.fn();
});

describe("/signup — age floor line (map #840, decision #10)", () => {
  it("states the 16+ floor and acceptance beneath the form, linking both documents", () => {
    render(SignupPage, {
      props: {
        data: { prefillNickname: null },
        form: null,
      } as never,
    });
    const line = screen.getByTestId("age-line");
    // Link renders as a flex box with a trailing whitespace text node, so
    // allow it before the full stop.
    expect(line).toHaveTextContent(
      /By creating an account you confirm you are 16 or older and accept the terms and privacy policy\s*\./,
    );
    expect(screen.getByRole("link", { name: "terms" })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(
      screen.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "/legal/privacy");
    // No age field or checkbox — self-declaration by use only.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
