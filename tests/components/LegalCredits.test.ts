import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CreditsPage from "../../src/routes/(app)/legal/credits/+page.svelte";

describe("/legal/credits", () => {
  it("renders the Solar, Kenney and RLTiles sections", () => {
    render(CreditsPage);
    expect(screen.getByRole("heading", { name: /Solar/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Kenney/ })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /RLTiles/ }),
    ).toBeInTheDocument();
  });

  it("states the RLTiles sentence verbatim and names the modifier", () => {
    const { container } = render(CreditsPage);
    const text = container.textContent?.replace(/\s+/g, " ") ?? "";
    expect(text).toContain(
      'Part of (or All) the graphic tiles used in this program is the public domain roguelike tileset "RLTiles".',
    );
    expect(text).toContain(
      "Some of the tiles have been modified by Rob Csaszar.",
    );
    expect(screen.getByRole("link", { name: "RLTiles" })).toHaveAttribute(
      "href",
      "https://rltiles.sourceforge.net/",
    );
  });

  it("links the Kenney badge with a light and a dark image", () => {
    const { container } = render(CreditsPage);
    const link = container.querySelector('a[href="https://kenney.nl/support"]');
    expect(link).not.toBeNull();
    const srcs = [...(link?.querySelectorAll("img") ?? [])].map((i) =>
      i.getAttribute("src"),
    );
    expect(srcs).toEqual([
      "/images/credits/kenney-featuring-light.svg",
      "/images/credits/kenney-featuring-dark.svg",
    ]);
  });

  it("links the Solar licence and source", () => {
    render(CreditsPage);
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by/4.0/",
    );
    expect(
      screen.getByRole("link", { name: /Solar icon set/ }),
    ).toHaveAttribute(
      "href",
      "https://www.figma.com/community/file/1166831539721848736",
    );
  });
});
