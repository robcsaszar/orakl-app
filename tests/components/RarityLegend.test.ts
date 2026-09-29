import { RARITY_LABELS, RARITY_ORDER } from "@orakl/shared";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

import RarityLegend from "../../src/lib/components/ui/RarityLegend.svelte";

describe("RarityLegend", () => {
  it("lists every rarity, lowest to highest", () => {
    render(RarityLegend, { props: { id: "legend" } });
    const chips = RARITY_ORDER.map((r) => screen.getByText(RARITY_LABELS[r]));
    expect(chips).toHaveLength(RARITY_ORDER.length);
    const positions = chips.map((c) => c.compareDocumentPosition(chips[0]));
    // every later chip follows the first one in document order
    for (const p of positions.slice(1))
      expect(p & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it("shows the four metals, no blue or violet", () => {
    const { container } = render(RarityLegend, { props: { id: "legend" } });
    for (const m of ["bronze", "silver", "gold", "platinum"])
      expect(container.querySelector(`.metal-${m}`)).not.toBeNull();
    expect(container.innerHTML).not.toMatch(/blue|violet/);
  });

  it("exotic swatch carries the opal ring; others do not", () => {
    const { container } = render(RarityLegend, { props: { id: "legend" } });
    expect(container.querySelector(".metal-platinum .opal")).not.toBeNull();
    expect(container.querySelectorAll(".opal")).toHaveLength(1);
  });

  it("sits behind a description toggle wired to the given id", () => {
    render(RarityLegend, { props: { id: "trials-rarity-legend" } });
    const toggle = screen.getByRole("button", { name: /toggle description/i });
    expect(toggle).toHaveAttribute("aria-controls", "trials-rarity-legend");
    expect(document.getElementById("trials-rarity-legend")).not.toBeNull();
  });
});
