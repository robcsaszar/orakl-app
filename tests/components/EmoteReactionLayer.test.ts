import { render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmoteReactionLayer, {
  DOUBLE_TAP_MS,
  LONG_PRESS_MS,
  MAX_RAIL_EMOTES,
  RAIL_EMOTE_COARSE_PX,
  RAIL_EMOTE_PX,
  SELF_POP_MS,
} from "../../src/lib/components/quiz/EmoteReactionLayer.svelte";

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
  vi.advanceTimersByTime(LONG_PRESS_MS);
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

  it("a right-click suppresses the native menu and opens the fan", async () => {
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
    ).toBeTruthy();
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

  it("overlay: a click on a petal after a right-click sends it", async () => {
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
    const area = container.querySelector(".emote-area") as HTMLElement;
    const wrapper = area.parentElement as HTMLElement;
    wrapper.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 100 }) as DOMRect;
    const mouse = (el: Element, type: string, button: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button,
          pointerId: 1,
          pointerType: "mouse",
        }),
      );
    // macOS order: contextmenu on press, then the right button's release.
    area.dispatchEvent(
      new MouseEvent("contextmenu", {
        clientX: 50,
        clientY: 50,
        button: 2,
        bubbles: true,
        cancelable: true,
      }),
    );
    await tick();
    mouse(area, "pointerup", 2);
    await tick();
    const petal = container.querySelector(
      '[aria-label="Send emote_heart"]',
    ) as HTMLElement;
    expect(petal).toBeTruthy();
    // A click is pointerdown → pointerup (bubbles to window) → click.
    mouse(petal, "pointerdown", 0);
    mouse(petal, "pointerup", 0);
    await tick();
    petal.click();
    expect(onSend).toHaveBeenCalledWith("emote_heart", 50 / 300, 50 / 100);
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
    expect(petalWrapper.style.transform).toBe("translate(0px, -88px) scale(1)");

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

  it("desktop: 48 px petals and a 56 px sent emote", async () => {
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
    const sent = container.querySelector(
      '[style*="transform-origin"] img',
    ) as HTMLElement;
    expect(sent.getAttribute("width")).toBe(String(RAIL_EMOTE_PX));
  });

  it("coarse pointer: petals and the sent emote are larger", async () => {
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
    expect(petal.getAttribute("width")).toBe("64");
    const wrapper = container.querySelector(
      ".pointer-events-auto.absolute",
    ) as HTMLElement;
    expect(wrapper.style.left).toBe("-32px");
    const sent = container.querySelector(
      '[style*="transform-origin"] img',
    ) as HTMLElement;
    expect(sent.getAttribute("width")).toBe(String(RAIL_EMOTE_COARSE_PX));
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
        clientY: 50 - 88,
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

describe("EmoteReactionLayer — edge rails", () => {
  const emoteAt = (uid: string, offsetX: number, playerId = "p1") => ({
    uid,
    playerId,
    emoteId: uid,
    offsetX,
    offsetY: 0.5,
  });
  const renderLayer = (
    activeEmotes: ReturnType<typeof emoteAt>[],
    selfPlayerId: string | null = null,
  ) =>
    render(EmoteReactionLayer, {
      props: {
        pickedEmotes: [EMOTE],
        emoteSrc,
        activeEmotes,
        selfPlayerId,
        canEmote: false,
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
  const rails = (container: HTMLElement) => ({
    left: container.querySelector(".left-0.inset-y-0") as HTMLElement,
    right: container.querySelector(".right-0.inset-y-0") as HTMLElement,
  });
  const srcs = (el: HTMLElement) =>
    [...el.querySelectorAll("img")].map((i) => i.getAttribute("src"));

  it("routes by side of the tap point into rails as wide as an emote", () => {
    const { container } = renderLayer([emoteAt("a", 0.2), emoteAt("b", 0.8)]);
    const { left, right } = rails(container);
    expect(srcs(left)).toEqual(["/emotes/a.webp"]);
    expect(srcs(right)).toEqual(["/emotes/b.webp"]);
    expect(left.style.width).toBe(`${RAIL_EMOTE_PX}px`);
    expect(right.style.width).toBe(`${RAIL_EMOTE_PX}px`);
  });

  it("rails and emotes are wider on a coarse pointer", () => {
    stubMatchMedia((q) => q === "(pointer: coarse)");
    const { container } = renderLayer([emoteAt("a", 0.2)]);
    const { left } = rails(container);
    expect(left.style.width).toBe(`${RAIL_EMOTE_COARSE_PX}px`);
    expect(left.querySelector("img")?.getAttribute("width")).toBe(
      String(RAIL_EMOTE_COARSE_PX),
    );
  });

  it("overlay mode reserves gutters as wide as the rails; wrapper mode does not", () => {
    const { container } = renderLayer([emoteAt("a", 0.2)]);
    const area = rails(container).left.parentElement as HTMLElement;
    expect(area.style.paddingLeft).toBe(`${RAIL_EMOTE_PX}px`);
    expect(area.style.paddingRight).toBe(`${RAIL_EMOTE_PX}px`);
    const wrapped = render(EmoteReactionLayer, {
      props: {
        pickedEmotes: [EMOTE],
        emoteSrc,
        activeEmotes: [emoteAt("a", 0.2)],
        canEmote: false,
        mode: "wrapper",
        onSend: vi.fn(),
        children: makeChildren(),
      },
    });
    const wrappedArea = rails(wrapped.container).left
      .parentElement as HTMLElement;
    expect(wrappedArea.style.paddingLeft).toBe("");
  });

  it("a tap near the top keeps the emote whole: its top is clamped at the rail's edge", () => {
    const { container } = renderLayer([
      { ...emoteAt("t", 0.2), offsetY: 0.02 },
    ]);
    const slot = rails(container).left.firstElementChild as HTMLElement;
    expect(slot.getAttribute("style")).toContain("max(0px");
    expect(rails(container).left.getAttribute("style")).toContain("clip-path");
  });

  it("an emote at exactly the midline goes right", () => {
    const { container } = renderLayer([emoteAt("m", 0.5)]);
    expect(srcs(rails(container).right)).toEqual(["/emotes/m.webp"]);
    expect(srcs(rails(container).left)).toEqual([]);
  });

  it("a rail shows only the newest MAX_RAIL_EMOTES", () => {
    const all = Array.from({ length: MAX_RAIL_EMOTES + 2 }, (_, i) =>
      emoteAt(`e${i}`, 0.1),
    );
    const { container } = renderLayer(all);
    expect(srcs(rails(container).left)).toEqual(
      all.slice(2).map((e) => `/emotes/${e.uid}.webp`),
    );
  });

  it("the sender's own emote pops at the tap point for SELF_POP_MS, others do not", async () => {
    const { container } = renderLayer(
      [emoteAt("mine", 0.2, "me"), emoteAt("theirs", 0.8, "p2")],
      "me",
    );
    await tick();
    const imgs = () => [...container.querySelectorAll("img")].length;
    expect(imgs()).toBe(3);
    vi.advanceTimersByTime(SELF_POP_MS);
    await tick();
    expect(imgs()).toBe(2);
  });

  it("another player's emote renders once", async () => {
    const { container } = renderLayer([emoteAt("theirs", 0.2, "p2")], "me");
    await tick();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});

describe("EmoteReactionLayer — double tap (play page)", () => {
  function renderOverlay(onSend = vi.fn()) {
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
    const area = container.querySelector(".emote-area") as HTMLElement;
    (area.parentElement as HTMLElement).getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 300, height: 100 }) as DOMRect;
    return { container, area };
  }

  const touch = (el: HTMLElement, type: string, x = 50, y = 50) =>
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: "touch",
      }),
    );

  function tap(el: HTMLElement, x = 50, y = 50) {
    touch(el, "pointerdown", x, y);
    touch(el, "pointerup", x, y);
  }

  const fanOpen = (container: HTMLElement) =>
    container.querySelector('[aria-label="Send emote_heart"]') !== null;

  it("one tap opens nothing", async () => {
    const { container, area } = renderOverlay();
    tap(area);
    await tick();
    expect(fanOpen(container)).toBe(false);
  });

  it("a second tap close by opens the fan at it, and the fan stays open after the release", async () => {
    const { container, area } = renderOverlay();
    tap(area);
    vi.advanceTimersByTime(DOUBLE_TAP_MS - 1);
    touch(area, "pointerdown", 60, 40);
    await tick();
    touch(area, "pointerup", 60, 40);
    // The release's own click must not land on the fan's dismiss surface.
    area.parentElement?.click();
    await tick();
    expect(fanOpen(container)).toBe(true);
  });

  it("a petal tapped after a double tap sends from the double-tap point", async () => {
    const onSend = vi.fn();
    const { container, area } = renderOverlay(onSend);
    tap(area);
    tap(area, 60, 40);
    await tick();
    vi.advanceTimersByTime(1);
    const petal = container.querySelector(
      '[aria-label="Send emote_heart"]',
    ) as HTMLElement;
    touch(petal, "pointerdown");
    touch(petal, "pointerup");
    petal.click();
    expect(onSend).toHaveBeenCalledWith("emote_heart", 60 / 300, 40 / 100);
  });

  it("a second tap after the double-tap window opens nothing", async () => {
    const { container, area } = renderOverlay();
    tap(area);
    vi.advanceTimersByTime(DOUBLE_TAP_MS + 1);
    tap(area);
    await tick();
    expect(fanOpen(container)).toBe(false);
  });

  it("a second tap far from the first opens nothing", async () => {
    const { container, area } = renderOverlay();
    tap(area, 20, 20);
    tap(area, 250, 80);
    await tick();
    expect(fanOpen(container)).toBe(false);
  });

  it("a long press does not count as the first tap", async () => {
    const { container, area } = renderOverlay();
    touch(area, "pointerdown");
    vi.advanceTimersByTime(LONG_PRESS_MS);
    await tick();
    touch(area, "pointerup");
    await tick();
    expect(fanOpen(container)).toBe(false);
    tap(area);
    await tick();
    expect(fanOpen(container)).toBe(false);
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
    vi.advanceTimersByTime(LONG_PRESS_MS);
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
    vi.advanceTimersByTime(LONG_PRESS_MS);
    await tick();
    at(txt, "pointerup", 50, 50); // bubbles to window, as in a browser
    await tick();
    // One petal: straight up from the press point, 88 px on a fine pointer.
    const petal = container.querySelector(
      '[aria-label="Send heart"]',
    ) as HTMLElement;
    expect(petal).toBeTruthy();
    at(petal, "pointerdown", 50, -38);
    at(petal, "pointerup", 50, -38);
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
    vi.advanceTimersByTime(LONG_PRESS_MS);
    await tick();
    press(button, "pointercancel");
    vi.advanceTimersByTime(1);
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("opens nothing when the viewer cannot emote", async () => {
    const { container, button } = renderWrapper(vi.fn(), false);
    press(button, "pointerdown");
    vi.advanceTimersByTime(LONG_PRESS_MS);
    await tick();
    expect(container.querySelector('[aria-label="Send heart"]')).toBeNull();
  });
});
