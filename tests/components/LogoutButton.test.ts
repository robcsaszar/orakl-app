import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import LogoutButton from "$lib/components/auth/LogoutButton.svelte";

describe("LogoutButton", () => {
  it("renders a Sign out button", () => {
    render(LogoutButton);
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("button is associated with a form that POSTs to /logout", () => {
    const { container } = render(LogoutButton);
    const form = container.querySelector("form");
    expect(form?.getAttribute("action")).toContain("logout");
    expect(form?.getAttribute("method")).toBe("POST");
  });
});
