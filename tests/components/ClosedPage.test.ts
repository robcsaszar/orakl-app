import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ClosedPage from "../../src/routes/(game)/closed/+page.svelte";

describe("/closed", () => {
  it("states the curator closed the lobby and links to /join", () => {
    const { container, getByText } = render(ClosedPage);
    expect(container.textContent).toContain("The curator closed the lobby");
    expect(getByText("Join a quiz")).toHaveAttribute("href", "/join");
  });
});
