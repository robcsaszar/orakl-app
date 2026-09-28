import { render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import HomeActions from "../../src/routes/(app)/HomeActions.svelte";

const entitled = { badge: null, open: true };

describe("HomeActions — visitor who cannot host", () => {
  it("renders nothing when host is null", () => {
    const { container } = render(HomeActions, { props: { host: null } });
    expect(container.firstElementChild).toBeNull();
  });
});

describe("HomeActions — entitled account, no active quiz", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("shows 'Host quiz' link when no quiz in sessionStorage", async () => {
    render(HomeActions, { props: { host: entitled } });
    expect(
      await screen.findByRole("link", { name: /host quiz/i }),
    ).toBeInTheDocument();
  });

  it("'Host quiz' link points to /curator/create, no badge", async () => {
    render(HomeActions, { props: { host: entitled } });
    const link = await screen.findByRole("link", { name: /host quiz/i });
    expect(link.getAttribute("href")).toContain("/curator/create");
    expect(screen.queryByText(/left/)).not.toBeInTheDocument();
  });
});

describe("HomeActions — entitled account, with active quiz", () => {
  beforeEach(() => {
    sessionStorage.setItem(
      "orakl-quiz-config",
      JSON.stringify({ name: "My Quiz" }),
    );
  });
  afterEach(() => sessionStorage.clear());

  it("shows 'Edit quiz' when quiz config exists", async () => {
    render(HomeActions, { props: { host: entitled } });
    expect(
      await screen.findByRole("link", { name: /edit quiz/i }),
    ).toBeInTheDocument();
  });
});

describe("HomeActions — member on the free allowance (map #1184, decision 4)", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("credits left: Host quiz → /curator/create with the count badge", async () => {
    render(HomeActions, {
      props: { host: { badge: "3/5 left", open: true } },
    });
    const link = await screen.findByRole("link", { name: /host quiz/i });
    expect(link.getAttribute("href")).toContain("/curator/create");
    expect(screen.getByText("3/5 left")).toBeInTheDocument();
  });

  it("none left: button stays, badge reads 0/5, click lands on the profile", async () => {
    render(HomeActions, {
      props: { host: { badge: "0/5 left", open: false } },
    });
    const link = await screen.findByRole("link", { name: /host quiz/i });
    expect(link.getAttribute("href")).toBe("/profile#host");
    expect(screen.getByText("0/5 left")).toBeInTheDocument();
  });

  it("unverified: badge says Verify email and the button lands on the profile", async () => {
    render(HomeActions, {
      props: { host: { badge: "Verify email", open: false } },
    });
    const link = await screen.findByRole("link", { name: /host quiz/i });
    expect(link.getAttribute("href")).toBe("/profile#host");
    expect(screen.getByText("Verify email")).toBeInTheDocument();
  });
});
