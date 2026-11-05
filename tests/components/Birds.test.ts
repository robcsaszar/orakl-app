import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Birds from "$lib/components/Birds.svelte";

describe("Birds", () => {
  it("renders a hidden, non-interactive canvas and survives a canvas-less DOM", () => {
    // jsdom has no 2D context; the component must bail without throwing.
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(null);
    const { container, unmount } = render(Birds, { timeOfDay: "morning" });
    const canvas = container.querySelector("canvas#birds");
    expect(canvas).not.toBeNull();
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.className).toContain("pointer-events-none");
    expect(() => unmount()).not.toThrow();
    spy.mockRestore();
  });
});
