/**
 * Anchored-panel positioning (map #840 UI feedback): the flip-and-clamp maths
 * shared by the Tooltip host and the Popover panel. Pure — takes measured
 * rects, returns viewport coordinates — so it unit-tests without a DOM. A panel
 * prefers to sit below its anchor and flips above when there is not enough room
 * below; either way it is clamped inside the viewport.
 */

export type Placement = "top" | "bottom";

export interface AnchoredInput {
  /** The trigger's viewport rect (getBoundingClientRect shape). */
  anchor: { top: number; bottom: number; left: number; right: number };
  /** The panel's measured size. */
  panel: { width: number; height: number };
  viewport: { width: number; height: number };
  /** Preferred side; the panel flips to the other when it does not fit. */
  placement?: Placement;
  /** Gap between anchor edge and panel, px. */
  gap?: number;
  /** Minimum distance kept from every viewport edge, px. */
  safezone?: number;
}

export interface AnchoredResult {
  top: number;
  left: number;
  placement: Placement;
}

export function computeAnchoredPosition(input: AnchoredInput): AnchoredResult {
  const gap = input.gap ?? 8;
  const safezone = input.safezone ?? 8;
  const preferred = input.placement ?? "bottom";
  const { anchor, panel, viewport } = input;

  const needed = panel.height + gap;
  const spaceBelow = viewport.height - anchor.bottom;
  const spaceAbove = anchor.top;

  // Flip to the other side only when the preferred side cannot hold the panel
  // and the other side has more room (or enough of it).
  let placement = preferred;
  if (
    preferred === "bottom" &&
    spaceBelow < needed &&
    spaceAbove > spaceBelow
  ) {
    placement = "top";
  } else if (
    preferred === "top" &&
    spaceAbove < needed &&
    spaceBelow > spaceAbove
  ) {
    placement = "bottom";
  }

  let top =
    placement === "bottom"
      ? anchor.bottom + gap
      : anchor.top - gap - panel.height;

  // Centre the panel on the anchor (so the arrow lands over it), then clamp
  // both axes inside the viewport.
  const anchorCenter = (anchor.left + anchor.right) / 2;
  let left = anchorCenter - panel.width / 2;
  left = Math.max(
    safezone,
    Math.min(left, viewport.width - panel.width - safezone),
  );
  top = Math.max(
    safezone,
    Math.min(top, viewport.height - panel.height - safezone),
  );

  return { top, left, placement };
}
