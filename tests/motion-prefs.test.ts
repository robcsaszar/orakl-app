// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "../src/lib/motion-prefs.js";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns false when window has no matchMedia", () => {
    vi.stubGlobal("window", {});
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when matchMedia reports a match", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns false when matchMedia reports no match", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
    });
    expect(prefersReducedMotion()).toBe(false);
  });
});
