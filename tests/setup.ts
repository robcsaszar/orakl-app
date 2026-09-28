import "@testing-library/jest-dom/vitest";

// JSDOM lacks ResizeObserver; components that observe layout (CategorySelector)
// construct one on mount. Provide a real constructor globally so it holds under
// every worker schedule, not just files that stub it themselves.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// JSDOM lacks the Popover API. `ui/Input.svelte` calls `hidePopover()` on
// mount, so any page carrying an Input needs these to exist.
for (const name of ["showPopover", "hidePopover", "togglePopover"] as const) {
  if (typeof HTMLElement === "undefined") break;
  if (!(name in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      writable: true,
      value: () => {},
    });
  }
}

// JSDOM lacks matchMedia. svelte/motion imports MediaQuery(prefers-reduced-motion)
// at module load, so this must exist before any test file imports it — tests
// that care about the result override window.matchMedia themselves.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}

// JSDOM lacks Web Animations API; stub so Svelte transitions don't throw
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () =>
    ({
      finished: Promise.resolve(undefined as unknown as Animation),
      cancel: () => {},
      play: () => {},
      pause: () => {},
      reverse: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as Animation;
}
