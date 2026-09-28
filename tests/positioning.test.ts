import { describe, expect, it } from "vitest";
import { computeAnchoredPosition } from "@/lib/positioning";

const viewport = { width: 1000, height: 800 };

describe("computeAnchoredPosition", () => {
  it("sits below the anchor and centres the panel on it when there is room", () => {
    const r = computeAnchoredPosition({
      anchor: { top: 100, bottom: 120, left: 200, right: 240 },
      panel: { width: 300, height: 150 },
      viewport,
      gap: 8,
    });
    expect(r.placement).toBe("bottom");
    expect(r.top).toBe(128); // anchor.bottom + gap
    expect(r.left).toBe(70); // anchorCenter(220) - panelWidth/2(150)
  });

  it("flips above when there is not enough room below", () => {
    const r = computeAnchoredPosition({
      anchor: { top: 700, bottom: 720, left: 100, right: 140 },
      panel: { width: 300, height: 200 },
      viewport,
      gap: 8,
    });
    expect(r.placement).toBe("top");
    expect(r.top).toBe(492); // anchor.top - gap - panelHeight = 700 - 8 - 200
  });

  it("stays below near the bottom when above is even tighter", () => {
    const r = computeAnchoredPosition({
      anchor: { top: 40, bottom: 780, left: 100, right: 140 },
      panel: { width: 100, height: 100 },
      viewport,
      gap: 8,
    });
    // spaceBelow (20) < needed (108) but spaceAbove (40) > spaceBelow (20) → flips top
    expect(r.placement).toBe("top");
  });

  it("clamps horizontally so the panel never leaves the viewport", () => {
    const r = computeAnchoredPosition({
      anchor: { top: 100, bottom: 120, left: 950, right: 990 },
      panel: { width: 300, height: 100 },
      viewport,
      safezone: 8,
    });
    expect(r.left).toBe(viewport.width - 300 - 8); // 692
  });

  it("clamps the top edge to the safezone", () => {
    const r = computeAnchoredPosition({
      anchor: { top: 5, bottom: 10, left: 10, right: 30 },
      panel: { width: 100, height: 100 },
      viewport,
      placement: "top",
      safezone: 8,
    });
    // placement flips to bottom (no room above), but top is clamped ≥ safezone regardless
    expect(r.top).toBeGreaterThanOrEqual(8);
  });
});
