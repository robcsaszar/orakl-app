import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import FieldDescription from "../../src/lib/components/ui/partials/FieldDescription.svelte";

/** What `setPowerUser` publishes; read here by key so the test drives the
 *  same channel the root layout does. */
const POWER_USER = Symbol.for("orakl.power-user");

const show = (holder: boolean) =>
  render(FieldDescription, {
    props: { description: "Choose your categories.", id: "cats-description" },
    context: new Map([[POWER_USER, () => holder]]),
  });

describe("FieldDescription — is-power-user", () => {
  it("shows the info-i and the copy to an ordinary account", () => {
    show(false);
    expect(
      screen.getByRole("button", { name: /toggle description/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Choose your categories.")).toBeInTheDocument();
  });

  it("drops the info-i for a holder", () => {
    show(true);
    expect(
      screen.queryByRole("button", { name: /toggle description/i }),
    ).toBeNull();
  });

  it("keeps the copy addressable, so aria-describedby still resolves", () => {
    show(true);
    const p = document.getElementById("cats-description");
    expect(p).not.toBeNull();
    expect(p).toHaveTextContent("Choose your categories.");
    expect(p).toHaveClass("sr-only");
  });

  it("falls back to showing it when no provider sits above", () => {
    render(FieldDescription, {
      props: { description: "No provider here.", id: "orphan-description" },
    });
    expect(
      screen.getByRole("button", { name: /toggle description/i }),
    ).toBeInTheDocument();
  });
});
