import { render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import Tooltip from "../../src/lib/components/ui/Tooltip.svelte";
import {
  showTooltipState,
  tooltipStore,
} from "../../src/lib/svelte/tooltipStore.store.js";
import { Position } from "../../src/lib/types/tooltip.types.js";

// jsdom has no IntersectionObserver; the host uses it to hide on scroll-out
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver =
  globalThis.IntersectionObserver ??
  (IntersectionObserverStub as unknown as typeof IntersectionObserver);

const nextFrame = () =>
  new Promise((r) => requestAnimationFrame(() => r(undefined)));

describe("Tooltip", () => {
  afterEach(() => {
    tooltipStore.update((s) => ({ ...s, isVisible: false, content: "" }));
    document.body.innerHTML = "";
  });

  it("does not render tooltip when store is hidden", () => {
    tooltipStore.update((s) => ({ ...s, isVisible: false }));
    render(Tooltip);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders with role=tooltip when store becomes visible", async () => {
    render(Tooltip);
    tooltipStore.update((s) =>
      showTooltipState(s, "Helpful tip", Position.BOTTOM, false),
    );
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });

  it("renders tooltip content text", async () => {
    render(Tooltip);
    tooltipStore.update((s) =>
      showTooltipState(s, "Click me for info", Position.BOTTOM, false),
    );
    expect(await screen.findByText("Click me for info")).toBeInTheDocument();
  });

  it("aria-label matches tooltip content", async () => {
    render(Tooltip);
    tooltipStore.update((s) =>
      showTooltipState(s, "Aria label text", Position.BOTTOM, false),
    );
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.getAttribute("aria-label")).toBe("Aria label text");
  });

  it("shows a tooltip when an element with data-tooltip is hovered", async () => {
    render(Tooltip);
    await nextFrame(); // host attaches its MutationObserver one frame after mount

    const target = document.createElement("button");
    target.setAttribute("data-tooltip", "Cast to display");
    document.body.appendChild(target);
    await Promise.resolve(); // MutationObserver callback

    target.dispatchEvent(new MouseEvent("mouseenter"));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Cast to display");
    expect(target.getAttribute("aria-describedby")).toBe("orakl-tooltip");
  });

  it("shows a tooltip when an element with data-tooltip receives focus", async () => {
    render(Tooltip);
    await nextFrame();

    const target = document.createElement("button");
    target.setAttribute("data-tooltip", "Seal the vault");
    document.body.appendChild(target);
    await Promise.resolve();

    target.dispatchEvent(new FocusEvent("focus"));

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Seal the vault",
    );
  });
});
