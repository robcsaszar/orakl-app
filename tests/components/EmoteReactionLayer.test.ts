import { render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SELECTABLE_EMOTE_IDS } from "../../src/lib/emotes.js";
import EmoteReactionLayer from "../../src/routes/(game)/quiz/play/EmoteReactionLayer.svelte";

const EMOTE = SELECTABLE_EMOTE_IDS[0];

// jsdom has no matchMedia by default; EmoteReactionLayer reads
// prefers-reduced-motion via MediaQuery, so tests stub it before render.
function stubMatchMedia(matches: boolean | ((query: string) => boolean)) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: typeof matches === "function" ? matches(query) : matches,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom doesn't implement pointer capture — stub it so handlePointerDown's
  // setPointerCapture call doesn't throw (real browsers always have it).
  Element.prototype.setPointerCapture = vi.fn();
  stubMatchMedia(false);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeChildren() {
  return createRawSnippet(() => ({ render: () => "<div>question</div>" }));
}

async function openFan(container: HTMLElement) {
  const area = container.querySelector(".emote-area") as HTMLElement;
  // pointToFraction bails on a zero-size rect — the outer wrapper (areaEl)
  // is this element's parent.
  const wrapper = area.parentElement as HTMLElement;
  wrapper.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 100 }) as DOMRect;
  area.dispatchEvent(
    new PointerEvent("pointerdown", {
      clientX: 50,
      clientY: 50,
      pointerId: 1,
      bubbles: true,
    }),
  );
  vi.advanceTimersByTime(500); // LONG_PRESS_MS
  await tick();
  return area;
}

describe("EmoteReactionLayer — mobile hold-to-react dismiss", () => {
  it("opens the fan on a long press", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart"],
        activeEmotes: [],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    expect(
      container.querySelector('[aria-label="Dismiss emote menu"]'),
    ).toBeTruthy();
  });

  it("a right-click suppresses the native menu and does not open the fan", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart"],
        activeEmotes: [],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    const area = container.querySelector(".emote-area") as HTMLElement;
    const wrapper = area.parentElement as HTMLElement;
    wrapper.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 100 }) as DOMRect;
    const event = new MouseEvent("contextmenu", {
      clientX: 50,
      clientY: 50,
      button: 2,
      bubbles: true,
      cancelable: true,
    });
    area.dispatchEvent(event);
    await tick();
    expect(event.defaultPrevented).toBe(true);
    expect(
      container.querySelector('[aria-label="Dismiss emote menu"]'),
    ).toBeNull();
  });

  it("closes the fan on release even when the per-element pointerup never fires (window fallback)", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart"],
        activeEmotes: [],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    expect(
      container.querySelector('[aria-label="Dismiss emote menu"]'),
    ).toBeTruthy();

    // Dispatched on window directly (not on the captured element) — mirrors
    // a mobile browser that drops/reroutes the release away from the
    // element that opened the fan.
    window.dispatchEvent(new PointerEvent("pointerup"));
    await tick();

    expect(
      container.querySelector('[aria-label="Dismiss emote menu"]'),
    ).toBeNull();
  });

  it("closes the fan on a window-level pointercancel too", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart"],
        activeEmotes: [],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    window.dispatchEvent(new PointerEvent("pointercancel"));
    await tick();
    expect(
      container.querySelector('[aria-label="Dismiss emote menu"]'),
    ).toBeNull();
  });
});

describe("EmoteReactionLayer — spring-driven fan and sent emote", () => {
  it("opens the fan with one petal wrapper per picked emote, each with an inline transform", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart", "emote_laugh"],
        activeEmotes: [],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    const wrappers = container.querySelectorAll(
      ".pointer-events-auto.absolute",
    );
    expect(wrappers).toHaveLength(2);
    for (const wrapper of wrappers) {
      expect((wrapper as HTMLElement).style.transform).toMatch(
        /translate\(.*\) scale\(.*\)/,
      );
    }
  });

  it("petals start at the tap point at scale(0) before any frame runs", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart", "emote_laugh"],
        activeEmotes: [],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    // jsdom drives no animation frames, so the spring never advances here;
    // the stagger itself (20 ms per index) is asserted on the timer spy below.
    const wrappers = container.querySelectorAll(
      ".pointer-events-auto.absolute",
    );
    for (const wrapper of wrappers) {
      expect((wrapper as HTMLElement).style.transform).toBe(
        "translate(0px, 0px) scale(0)",
      );
    }
  });

  it("staggers each petal's spring target by index * 20 ms", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart", "emote_laugh", "emote_clap"],
        activeEmotes: [],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    // Each petal names its own stagger delay via data-stagger-ms — the
    // timer that fires it reads the same value.
    const petals = container.querySelectorAll<HTMLElement>("[data-stagger-ms]");
    const delays = Array.from(petals).map((petal) =>
      Number(petal.dataset.staggerMs),
    );
    expect(delays).toEqual([0, 20, 40]);
  });

  it("picking a petal still calls onSend(emoteId, x, y)", async () => {
    const onSend = vi.fn();
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart"],
        activeEmotes: [],
        canEmote: true,
        onSend,
        children: makeChildren(),
      },
    });
    const area = await openFan(container);
    const btn = container.querySelector(
      '[aria-label="Send emote_heart"]',
    ) as HTMLElement;
    btn.click();
    expect(onSend).toHaveBeenCalledWith("emote_heart", 50 / 300, 50 / 100);
    void area;
  });

  it("renders a SentEmote wrapper for each activeEmotes entry with transform-origin at the tail tip", () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart"],
        activeEmotes: [
          {
            uid: "u1",
            playerId: "p1",
            emoteId: "emote_heart",
            offsetX: 0.5,
            offsetY: 0.5,
          },
        ],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    const wrapper = container.querySelector(
      '[style*="transform-origin"]',
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.transformOrigin).toBe("50% 97%");
  });

  it("with reduced motion, petals appear in place and the sent emote appears at rest", async () => {
    stubMatchMedia((q) => q.includes("reduced-motion"));
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: ["emote_heart"],
        activeEmotes: [
          {
            uid: "u1",
            playerId: "p1",
            emoteId: "emote_heart",
            offsetX: 0.5,
            offsetY: 0.5,
          },
        ],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    const petalWrapper = container.querySelector(
      ".pointer-events-auto.absolute",
    ) as HTMLElement;
    expect(petalWrapper.style.transform).toBe("translate(0px, -64px) scale(1)");

    const sentWrapper = container.querySelector(
      '[style*="transform-origin"]',
    ) as HTMLElement;
    expect(sentWrapper.style.transform).toBe("scale(1) rotate(0deg)");
  });

  it("desktop: 32 px petals and a 48 px sent emote", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: [EMOTE],
        activeEmotes: [
          {
            uid: "u1",
            playerId: "p1",
            emoteId: EMOTE,
            offsetX: 0.5,
            offsetY: 0.5,
          },
        ],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    const petal = container.querySelector(
      `[aria-label="Send ${EMOTE}"] div`,
    ) as HTMLElement;
    expect(petal.style.width).toBe("32px");
    const sent = container.querySelector(
      '[style*="transform-origin"] div',
    ) as HTMLElement;
    expect(sent.style.width).toBe("48px");
  });

  it("coarse pointer: petals and the sent emote are half again as large", async () => {
    stubMatchMedia((q) => q === "(pointer: coarse)");
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: [EMOTE],
        activeEmotes: [
          {
            uid: "u1",
            playerId: "p1",
            emoteId: EMOTE,
            offsetX: 0.5,
            offsetY: 0.5,
          },
        ],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    await openFan(container);
    const petal = container.querySelector(
      `[aria-label="Send ${EMOTE}"] div`,
    ) as HTMLElement;
    expect(petal.style.width).toBe("48px");
    const wrapper = container.querySelector(
      ".pointer-events-auto.absolute",
    ) as HTMLElement;
    expect(wrapper.style.left).toBe("-24px");
    const sent = container.querySelector(
      '[style*="transform-origin"] div',
    ) as HTMLElement;
    expect(sent.style.width).toBe("72px");
  });

  it("the petal under a held pointer lifts and grows", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: [EMOTE],
        activeEmotes: [],
        canEmote: true,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    const area = await openFan(container);
    // One petal sits straight up from the tap point (50, 50) at the fan radius.
    area.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: 50,
        clientY: 50 - 64,
        bubbles: true,
      }),
    );
    await tick();
    const btn = container.querySelector(
      `[aria-label="Send ${EMOTE}"]`,
    ) as HTMLElement;
    expect(btn.classList.contains("scale-125")).toBe(true);
    expect(btn.classList.contains("-translate-y-1.5")).toBe(true);
    area.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: 50,
        clientY: 50,
        bubbles: true,
      }),
    );
    await tick();
    expect(btn.classList.contains("-translate-y-1.5")).toBe(false);
  });
});
