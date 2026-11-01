import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClosedPage from "../../src/routes/(game)/closed/+page.svelte";

let url = new URL("http://localhost/closed");
vi.mock("$app/state", () => ({
  page: {
    get url() {
      return url;
    },
  },
}));

beforeEach(() => {
  url = new URL("http://localhost/closed");
});

describe("/closed", () => {
  it("states the curator closed the lobby and links to /join", () => {
    const { container, getByText } = render(ClosedPage);
    expect(container.textContent).toContain("The curator closed the lobby");
    expect(getByText("Join a quiz")).toHaveAttribute("href", "/join");
  });

  it("states Orakl closed the lobby for reason moderated", () => {
    url = new URL("http://localhost/closed?reason=moderated");
    const { container, getByText } = render(ClosedPage);
    expect(container.textContent).toContain("Orakl closed this lobby");
    expect(container.textContent).toContain(
      "A moderator ended it. Nothing from this lobby was saved.",
    );
    expect(container.textContent).not.toContain("The curator closed");
    expect(getByText("Join a quiz")).toHaveAttribute("href", "/join");
  });

  it("states the lobby closed, without blaming anyone, for another reason", () => {
    url = new URL("http://localhost/closed?reason=no_lobby");
    const { container } = render(ClosedPage);
    expect(container.textContent).toContain("This lobby has closed");
    // A reconnect after a finished, saved Game lands here too.
    expect(container.textContent).not.toContain("saved");
    expect(container.textContent).not.toContain("curator");
  });
});
