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

  it("sits behind a description toggle wired to the given id", () => {
    render(RarityLegend, { props: { id: "trials-rarity-legend" } });
    const toggle = screen.getByRole("button", { name: /toggle description/i });
    expect(toggle).toHaveAttribute("aria-controls", "trials-rarity-legend");
    expect(document.getElementById("trials-rarity-legend")).not.toBeNull();
  });
});
