import { render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmoteReactionLayer from "../../src/lib/components/quiz/EmoteReactionLayer.svelte";

const EMOTE = "heart";
const emoteSrc = (id: string) => `/emotes/${id}.webp`;

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
        emoteSrc,
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
        emoteSrc,
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
        emoteSrc,
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
        emoteSrc,
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
        emoteSrc,
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
        emoteSrc,
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
        emoteSrc,
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
        emoteSrc,
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
        emoteSrc,
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
        emoteSrc,
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

  it.each([
    [true, "/emotes/emote_heart-still.webp"],
    [false, "/emotes/emote_heart.webp"],
  ])(
    "with reduced motion %s, petals and the sent emote draw %s",
    async (reduced, expected) => {
      stubMatchMedia((q) => reduced && q.includes("reduced-motion"));
      const { container } = render(EmoteReactionLayer, {
        props: {
          pickedEmotes: ["emote_heart"],
          emoteSrc,
          emoteStillSrc: (id: string) => `/emotes/${id}-still.webp`,
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
      const sources = [...container.querySelectorAll("img")].map((i) =>
        i.getAttribute("src"),
      );
      // One sent emote, one petal.
      expect(sources.filter((s) => s === expected)).toHaveLength(2);
    },
  );

  it("desktop: 32 px petals and a 48 px sent emote", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: [EMOTE],
        emoteSrc,
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
      `[aria-label="Send ${EMOTE}"] img`,
    ) as HTMLElement;
    expect(petal.getAttribute("width")).toBe("32");
    const sent = container.querySelector(
      '[style*="transform-origin"] img',
    ) as HTMLElement;
    expect(sent.getAttribute("width")).toBe("48");
  });

  it("coarse pointer: petals and the sent emote are half again as large", async () => {
    stubMatchMedia((q) => q === "(pointer: coarse)");
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: [EMOTE],
        emoteSrc,
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
      `[aria-label="Send ${EMOTE}"] img`,
    ) as HTMLElement;
    expect(petal.getAttribute("width")).toBe("48");
    const wrapper = container.querySelector(
      ".pointer-events-auto.absolute",
    ) as HTMLElement;
    expect(wrapper.style.left).toBe("-24px");
    const sent = container.querySelector(
      '[style*="transform-origin"] img',
    ) as HTMLElement;
    expect(sent.getAttribute("width")).toBe("72");
  });

  it("the petal under a held pointer lifts and grows", async () => {
    const { container } = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: [EMOTE],
        emoteSrc,
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

describe("EmoteReactionLayer — wrapper mode (results page)", () => {
  function renderWrapper(onContentClick: () => void, canEmote = true) {
    const children = createRawSnippet(() => ({
      render: () =>
        '<div><button type="button" id="content-btn">Subscribe</button></div>',
      setup: (node) => {
        node.querySelector("button")?.addEventListener("click", onContentClick);
      },
    }));
    const { container } = render(EmoteReactionLayer, {
      pickedEmotes: [EMOTE],
      emoteSrc,
      activeEmotes: [],
      canEmote,
      mode: "wrapper",
      onSend: vi.fn(),
      children,
    });
    const wrapper = container.querySelector(
      '[role="presentation"]',
    ) as HTMLElement;
    wrapper.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 100 }) as DOMRect;
    return {
      container,
      button: container.querySelector("#content-btn") as HTMLButtonElement,
    };
  }

  const press = (el: HTMLElement, type: string) =>
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        clientX: 50,
        clientY: 50,
        pointerId: 1,
        pointerType: "touch",
      }),
    );

  it("leaves the content clickable: no overlay, a short press clicks through", () => {
    const onClick = vi.fn();
    const { container, button } = renderWrapper(onClick);
    expect(container.querySelector(".emote-area")).toBeNull();
    press(button, "pointerdown");
    press(button, "pointerup");
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("a long press opens the fan and swallows the click that ends it", async () => {
    const onClick = vi.fn();
    const { container, button } = renderWrapper(onClick);
    press(button, "pointerdown");
    vi.advanceTimersByTime(500);
    await tick();
    press(button, "pointerup");
    button.click();
    await tick();
    expect(onClick).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Send heart"]')).toBeTruthy();
    // The swallow is one click only: the content works again afterwards.
    vi.advanceTimersByTime(1);
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("a touch tap on a petal after the opening release sends it", async () => {
    const onSend = vi.fn();
    const children = createRawSnippet(() => ({
      render: () => "<div><span id='txt'>Results</span></div>",
    }));
    const { container } = render(EmoteReactionLayer, {
      pickedEmotes: [EMOTE],
      emoteSrc,
      activeEmotes: [],
      canEmote: true,
      mode: "wrapper",
      onSend,
      children,
    });
    const wrapper = container.querySelector(
      '[role="presentation"]',
    ) as HTMLElement;
    wrapper.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 100 }) as DOMRect;
    const txt = container.querySelector("#txt") as HTMLElement;
    const at = (el: Element, type: string, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: "touch",
        }),
      );
    at(txt, "pointerdown", 50, 50);
    vi.advanceTimersByTime(500);
    await tick();
    at(txt, "pointerup", 50, 50); // bubbles to window, as in a browser
    await tick();
    // One petal: straight up from the press point, 64 px on a fine pointer.
    const petal = container.querySelector(
      '[aria-label="Send heart"]',
    ) as HTMLElement;
    expect(petal).toBeTruthy();
    at(petal, "pointerdown", 50, -14);
    at(petal, "pointerup", 50, -14);
    expect(onSend).toHaveBeenCalledWith(EMOTE, 50 / 300, 0.5);
  });

  it("a right-click on a link keeps the browser's own menu", () => {
    const children = createRawSnippet(() => ({
      render: () => "<div><a id='lnk' href='/x'>Subscribe</a></div>",
    }));
    const { container } = render(EmoteReactionLayer, {
      pickedEmotes: [EMOTE],
      emoteSrc,
      activeEmotes: [],
      canEmote: true,
      mode: "wrapper",
      onSend: vi.fn(),
      children,
    });
    const ev = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    (container.querySelector("#lnk") as HTMLElement).dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it("a press cancelled into a scroll after the fan opened leaves no click swallowed", async () => {
    const onClick = vi.fn();
    const { button } = renderWrapper(onClick);
    press(button, "pointerdown");
    vi.advanceTimersByTime(500);
    await tick();
    press(button, "pointercancel");
    vi.advanceTimersByTime(1);
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("opens nothing when the viewer cannot emote", async () => {
    const { container, button } = renderWrapper(vi.fn(), false);
    press(button, "pointerdown");
    vi.advanceTimersByTime(500);
    await tick();
    expect(container.querySelector('[aria-label="Send heart"]')).toBeNull();
  });
});
