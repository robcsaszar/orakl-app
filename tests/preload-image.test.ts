import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadImage } from "../src/lib/preload-image.js";

afterEach(() => vi.unstubAllGlobals());

describe("preloadImage", () => {
  it("starts a fetch of the URL through an Image", () => {
    const made: Array<{ src: string }> = [];
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor() {
          made.push(this);
        }
      },
    );
    preloadImage("/media/questions/n.webp?exp=1&sig=s");
    expect(made.map((i) => i.src)).toEqual([
      "/media/questions/n.webp?exp=1&sig=s",
    ]);
  });

  it("does nothing without a URL or outside a browser", () => {
    const Image = vi.fn();
    vi.stubGlobal("Image", Image);
    preloadImage(undefined);
    expect(Image).not.toHaveBeenCalled();
    vi.stubGlobal("Image", undefined);
    expect(() => preloadImage("/media/x.webp")).not.toThrow();
  });
});
