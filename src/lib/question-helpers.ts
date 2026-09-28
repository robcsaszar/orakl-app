/**
 * DOM-drawing match-line helpers for image-matching questions. The pure
 * question rendering, validation, and styling helpers (`formatCorrectAnswer`,
 * `isAnswerCorrect`, `selectMatchItem`, `getAnswerButtonClass`,
 * `getMatchItemClass`, `getTrueFalseButtonClass`) live in
 * `@orakl/client-core`'s `question-helpers.ts` — this file holds only the
 * pieces that touch the DOM (`SVGSVGElement`, `HTMLElement`, `document`),
 * which can't move into that framework-neutral package.
 */

import { splitMatchPair } from "@orakl/client-core";

function makeMatchPath(
  svg: SVGSVGElement,
  svgRect: DOMRect,
  leftEl: HTMLElement,
  rightEl: HTMLElement,
  color: string,
  opts: { dashed?: boolean; opacity?: number; animate?: boolean } = {},
): void {
  const r1 = leftEl.getBoundingClientRect();
  const r2 = rightEl.getBoundingClientRect();
  const p1 = {
    x: r1.right - svgRect.left,
    y: r1.top + r1.height / 2 - svgRect.top,
  };
  const p2 = {
    x: r2.left - svgRect.left,
    y: r2.top + r2.height / 2 - svgRect.top,
  };
  const mid = (p1.x + p2.x) / 2;
  const d = `M${p1.x},${p1.y} C${mid},${p1.y} ${mid},${p2.y} ${p2.x},${p2.y}`;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", "2");
  path.setAttribute("fill", "none");
  if (opts.dashed) path.setAttribute("stroke-dasharray", "4 3");
  if (opts.opacity != null)
    path.setAttribute("stroke-opacity", String(opts.opacity));
  svg.appendChild(path);
  if (opts.animate) {
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.style.transition = "stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        path.style.strokeDashoffset = "0";
      }),
    );
  }
}

/** Draw animated bezier lines between correct (and wrong) match pairs.
 *  Colors must be resolved by the caller from CSS custom properties to avoid
 *  reading mid-transition computed styles off the buttons. */
export function drawMatchLines(
  container: HTMLElement,
  correctAnswerId: string,
  playerAnswerId: string | null,
  correctColor: string,
  wrongColor: string,
): void {
  const svg = container.querySelector(
    "[data-match-svg]",
  ) as SVGSVGElement | null;
  if (!svg || !correctAnswerId) return;
  svg.replaceChildren();

  const svgRect = container.getBoundingClientRect();
  const [correctLeft, correctRight] = splitMatchPair(correctAnswerId);

  // "" right half means the correct answer's pipe separator is missing
  // (see splitMatchPair's JSDoc) — no pair to draw.
  if (correctRight) {
    const b1c = container.querySelector(
      `[data-match-left="${correctLeft}"]`,
    ) as HTMLElement | null;
    const b2c = container.querySelector(
      `[data-match-right="${correctRight}"]`,
    ) as HTMLElement | null;
    if (b1c && b2c)
      makeMatchPath(svg, svgRect, b1c, b2c, correctColor, { animate: true });
  }

  if (playerAnswerId && playerAnswerId !== correctAnswerId) {
    const [playerLeft, playerRight] = splitMatchPair(playerAnswerId);
    if (playerRight) {
      const b1p = container.querySelector(
        `[data-match-left="${playerLeft}"]`,
      ) as HTMLElement | null;
      const b2p = container.querySelector(
        `[data-match-right="${playerRight}"]`,
      ) as HTMLElement | null;
      if (b1p && b2p)
        makeMatchPath(svg, svgRect, b1p, b2p, wrongColor, { dashed: true });
    }
  }
}

/** Draw a confirmed pending-selection bezier (both sides chosen, awaiting reveal). */
export function drawPendingLine(
  container: HTMLElement,
  leftItem: string,
  rightItem: string,
  color: string,
): void {
  const svg = container.querySelector(
    "[data-match-svg]",
  ) as SVGSVGElement | null;
  if (!svg) return;
  svg.replaceChildren();
  const svgRect = container.getBoundingClientRect();
  const b1 = container.querySelector(
    `[data-match-left="${leftItem}"]`,
  ) as HTMLElement | null;
  const b2 = container.querySelector(
    `[data-match-right="${rightItem}"]`,
  ) as HTMLElement | null;
  if (b1 && b2) makeMatchPath(svg, svgRect, b1, b2, color, {});
}

/** Draw a transient hover-preview line into a dedicated SVG overlay. */
export function drawHoverLine(
  container: HTMLElement,
  hoverSvg: SVGSVGElement,
  leftItem: string,
  rightItem: string,
  color: string,
): void {
  hoverSvg.replaceChildren();
  const svgRect = container.getBoundingClientRect();
  const b1 = container.querySelector(
    `[data-match-left="${leftItem}"]`,
  ) as HTMLElement | null;
  const b2 = container.querySelector(
    `[data-match-right="${rightItem}"]`,
  ) as HTMLElement | null;
  if (b1 && b2)
    makeMatchPath(hoverSvg, svgRect, b1, b2, color, {
      dashed: true,
      opacity: 0.4,
    });
}
