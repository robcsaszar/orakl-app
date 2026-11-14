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

  it("goes by itself after a short time, and gives long text longer", async () => {
    render(Tooltip);
    await nextFrame();
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    /** Shows a tooltip, and says whether it is still up after the wait. */
    const stillUpAfter = async (text: string, ms: number) => {
      const target = document.createElement("span");
      target.setAttribute("data-tooltip", text);
      document.body.appendChild(target);
      await Promise.resolve();
      target.dispatchEvent(new MouseEvent("mouseenter"));
      await screen.findByRole("tooltip");
      await wait(ms);
      const up = screen.queryByRole("tooltip") !== null;
      target.dispatchEvent(new MouseEvent("mouseleave"));
      await wait(300);
      target.remove();
      return up;
    };
    // The pointer never leaves, yet the short one is gone and the long one is not.
    expect(await stillUpAfter("Undo", 2400)).toBe(false);
    expect(
      await stillUpAfter(
        "Grabbing clouds: drag one to move it. Click to use the page instead.",
        2400,
      ),
    ).toBe(true);
  });

  it("on a touch screen shows no tooltip for a control a tap works, and still shows one for plain content", async () => {
    const real = globalThis.matchMedia;
    globalThis.matchMedia = ((query: string) => ({
      matches: query.includes("pointer: coarse"),
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof matchMedia;
    render(Tooltip);
    await nextFrame();

    const button = document.createElement("button");
    button.setAttribute("data-tooltip", "Seal the vault");
    const badge = document.createElement("span");
    badge.setAttribute("data-tooltip", "A relic");
    badge.tabIndex = 0;
    document.body.append(button, badge);
    await Promise.resolve();

    button.dispatchEvent(new FocusEvent("focus"));
    await nextFrame();
    expect(screen.queryByRole("tooltip")).toBeNull();

    badge.dispatchEvent(new FocusEvent("focus"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("A relic");
    globalThis.matchMedia = real;
  });
});
