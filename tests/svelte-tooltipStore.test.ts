import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import {
  createTooltipStore,
  hideTooltipState,
  resetTooltipStore,
  setTooltipPosition,
  setTooltipScrolling,
  showTooltipState,
  tooltipStore,
} from "../src/lib/svelte/tooltipStore.store.js";
import { Position } from "../src/lib/types/tooltip.types.js";

describe("createTooltipStore", () => {
  it("returns initial state", () => {
    const s = createTooltipStore();
    expect(s.isVisible).toBe(false);
    expect(s.isPositioned).toBe(false);
    expect(s.content).toBe("");
    expect(s.position).toBe(Position.BOTTOM);
    expect(s.showArrow).toBe(true);
    expect(s.top).toBe(0);
    expect(s.left).toBe(0);
    expect(s.arrowOffset).toBe(50);
    expect(s.isScrolling).toBe(false);
  });
});

describe("showTooltipState", () => {
  it("sets isVisible, resets isPositioned, and sets content", () => {
    const s = showTooltipState(
      createTooltipStore(),
      "hello",
      Position.TOP,
      true,
    );
    expect(s.isVisible).toBe(true);
    expect(s.isPositioned).toBe(false);
    expect(s.content).toBe("hello");
    expect(s.position).toBe(Position.TOP);
    expect(s.showArrow).toBe(true);
  });

  it("sets showArrow false", () => {
    const s = showTooltipState(createTooltipStore(), "x", Position.LEFT, false);
    expect(s.showArrow).toBe(false);
  });

  it("does not mutate original", () => {
    const orig = createTooltipStore();
    showTooltipState(orig, "x", Position.TOP, true);
    expect(orig.isVisible).toBe(false);
  });
});

describe("hideTooltipState", () => {
  it("clears isVisible and content", () => {
    const visible = showTooltipState(
      createTooltipStore(),
      "hello",
      Position.TOP,
      true,
    );
    const s = hideTooltipState(visible);
    expect(s.isVisible).toBe(false);
    expect(s.content).toBe("");
  });

  it("clears isScrolling", () => {
    const scrolling = setTooltipScrolling(createTooltipStore(), true);
    const s = hideTooltipState(scrolling);
    expect(s.isScrolling).toBe(false);
  });
});

describe("setTooltipPosition", () => {
  it("updates top, left, arrowOffset, position and sets isPositioned", () => {
    const s = setTooltipPosition(
      createTooltipStore(),
      120,
      80,
      30,
      Position.RIGHT,
    );
    expect(s.isPositioned).toBe(true);
    expect(s.top).toBe(120);
    expect(s.left).toBe(80);
    expect(s.arrowOffset).toBe(30);
    expect(s.position).toBe(Position.RIGHT);
  });
});

describe("setTooltipScrolling", () => {
  it("sets isScrolling true", () => {
    const s = setTooltipScrolling(createTooltipStore(), true);
    expect(s.isScrolling).toBe(true);
  });

  it("sets isScrolling false", () => {
    const scrolling = setTooltipScrolling(createTooltipStore(), true);
    const s = setTooltipScrolling(scrolling, false);
    expect(s.isScrolling).toBe(false);
  });
});

describe("resetTooltipStore", () => {
  it("returns fresh initial state", () => {
    const modified = showTooltipState(
      createTooltipStore(),
      "x",
      Position.LEFT,
      false,
    );
    const s = resetTooltipStore(modified);
    expect(s).toEqual(createTooltipStore());
  });
});

describe("tooltipStore singleton", () => {
  it("is a writable store with initial state", () => {
    const s = get(tooltipStore);
    expect(s.isVisible).toBe(false);
    expect(s.content).toBe("");
  });

  it("updates reactively", () => {
    tooltipStore.update((s) =>
      showTooltipState(s, "reactive", Position.BOTTOM, true),
    );
    expect(get(tooltipStore).content).toBe("reactive");
    tooltipStore.update((s) => hideTooltipState(s));
  });
});
