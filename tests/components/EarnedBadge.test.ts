import type { BadgeId, Rarity } from "@orakl/shared";
import { BADGES, RARITY_LABELS } from "@orakl/shared";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

import EarnedBadge from "../../src/lib/components/results/EarnedBadge.svelte";

const id = Object.keys(BADGES)[0] as BadgeId;
const meta = BADGES[id];

const root = (container: HTMLElement) =>
  container.querySelector(".obol") as HTMLElement;

describe("EarnedBadge", () => {
  it("compact: name only, focusable, tooltip carries tier + description + detail, no title", () => {
    const { container } = render(EarnedBadge, {
      props: { id, rarity: "rare", detail: "9 of 10" },
    });
    expect(screen.getByText(meta.label)).toBeInTheDocument();
    expect(screen.queryByText(meta.description)).toBeNull();
    const el = root(container);
    expect(el).toHaveAttribute("tabindex", "0");
    expect(el).not.toHaveAttribute("title");
    const tip = el.getAttribute("data-tooltip") ?? "";
    expect(tip).toContain(RARITY_LABELS.rare);
    expect(tip).toContain(meta.description);
    expect(tip).toContain("9 of 10");
  });

  it("compact: role img named with tier + description", () => {
    render(EarnedBadge, { props: { id, rarity: "rare" } });
    const img = screen.getByRole("img", {
      name: new RegExp(RARITY_LABELS.rare),
    });
    expect(img.getAttribute("aria-label")).toContain(meta.description);
  });

  it("extended: count sits outside the aria-hidden emblem", () => {
    render(EarnedBadge, {
      props: { id, form: "extended", count: 3 },
    });
    expect(screen.getByText("×3").closest("[aria-hidden='true']")).toBeNull();
  });

  it("extended: tier, name, description, ×count when > 1", () => {
    const { container } = render(EarnedBadge, {
      props: { id, rarity: "legendary", form: "extended", count: 3 },
    });
    expect(screen.getByText(RARITY_LABELS.legendary)).toBeInTheDocument();
    expect(screen.getByText(meta.label)).toBeInTheDocument();
    expect(screen.getByText(meta.description)).toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(root(container)).not.toHaveAttribute("tabindex");
  });

  it("extended: no ×1", () => {
    render(EarnedBadge, {
      props: { id, form: "extended", count: 1 },
    });
    expect(screen.queryByText("×1")).toBeNull();
  });

  it.each([
    ["common", "metal-bronze"],
    ["rare", "metal-silver"],
    ["legendary", "metal-gold"],
    ["exotic", "metal-platinum"],
  ] as [Rarity, string][])("%s maps to %s", (rarity, metal) => {
    const { container } = render(EarnedBadge, { props: { id, rarity } });
    expect(root(container)).toHaveClass(metal);
  });

  it("exotic carries the sheen; common does not", () => {
    const exotic = render(EarnedBadge, { props: { id, rarity: "exotic" } });
    expect(exotic.container.querySelector(".sheen")).not.toBeNull();
    exotic.unmount();
    const common = render(EarnedBadge, { props: { id, rarity: "common" } });
    expect(common.container.querySelector(".sheen")).toBeNull();
  });
});
