import type { Snippet } from "svelte";
import type { Change } from "@/lib/sky-history.svelte";

/** The hint for the setting in use, shown in the bar at the foot of the sky panel. */
export const skyHint = $state({ text: "" });

/** How long a finger rests on a setting before its hint shows, ms. */
const HOLD_MS = 350;
/** How far a finger may drift and still count as resting, px. */
const HOLD_SLOP = 8;

/**
 * Shows a setting's hint in the bar at the foot of the panel. With a mouse or
 * keyboard: while the pointer or focus is on it. On a touch screen: when a
 * finger rests on it, and that touch then changes nothing; a plain tap works
 * the setting as usual. The hint stays until another takes its place.
 */
export function hinted(node: HTMLElement, text: string) {
  const listeners = new AbortController();
  const { signal } = listeners;
  const touch = matchMedia("(pointer: coarse)").matches;
  // Deferred: a control removed while it has focus blurs in the middle of a render.
  const show = () => queueMicrotask(() => (skyHint.text = text));
  const hide = () =>
    queueMicrotask(() => {
      if (skyHint.text === text) skyHint.text = "";
    });
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (touch) {
    let held = false;
    let x = 0;
    let y = 0;
    const cancel = () => clearTimeout(timer);
    node.addEventListener(
      "pointerdown",
      (e) => {
        held = false;
        x = e.clientX;
        y = e.clientY;
        cancel();
        timer = setTimeout(() => {
          held = true;
          show();
        }, HOLD_MS);
      },
      { signal },
    );
    node.addEventListener(
      "pointermove",
      (e) => {
        if (Math.hypot(e.clientX - x, e.clientY - y) > HOLD_SLOP) cancel();
      },
      { signal },
    );
    node.addEventListener("pointerup", cancel, { signal });
    node.addEventListener("pointercancel", cancel, { signal });
    // The touch that asked for the hint does not also work the setting.
    node.addEventListener(
      "click",
      (e) => {
        if (!held) return;
        held = false;
        e.preventDefault();
        e.stopPropagation();
      },
      { signal, capture: true },
    );
    node.addEventListener("contextmenu", (e) => e.preventDefault(), { signal });
    node.style.setProperty("-webkit-touch-callout", "none");
    node.style.userSelect = "none";
  } else {
    node.addEventListener("pointerenter", show, { signal });
    node.addEventListener("focusin", show, { signal });
    node.addEventListener("pointerleave", hide, { signal });
    node.addEventListener("focusout", hide, { signal });
  }
  return {
    update: (next: string) => {
      if (skyHint.text === text) skyHint.text = next;
      text = next;
    },
    destroy: () => {
      clearTimeout(timer);
      hide();
      listeners.abort();
    },
  };
}

/**
 * Keeps a scroll from changing a slider on a touch screen. A finger that
 * lands on a slider moves it at once; when the touch turns out to be a
 * scroll, the browser takes the gesture over, and the slider goes back to
 * the value it had.
 */
export function steadySliders(node: HTMLElement) {
  const listeners = new AbortController();
  const { signal } = listeners;
  let touched: { input: HTMLInputElement; value: string } | null = null;
  const slider = (e: Event) =>
    e.target instanceof HTMLInputElement && e.target.type === "range"
      ? e.target
      : null;
  node.addEventListener(
    "pointerdown",
    (e) => {
      const input = e.pointerType === "touch" ? slider(e) : null;
      touched = input ? { input, value: input.value } : null;
    },
    { signal, capture: true },
  );
  node.addEventListener(
    "pointercancel",
    (e) => {
      const was = touched;
      touched = null;
      if (!was || slider(e) !== was.input || was.input.value === was.value)
        return;
      was.input.value = was.value;
      was.input.dispatchEvent(new Event("input", { bubbles: true }));
    },
    { signal, capture: true },
  );
  node.addEventListener("pointerup", () => (touched = null), {
    signal,
    capture: true,
  });
  return { destroy: () => listeners.abort() };
}

/** How long after the last change a part's settings are written to storage, ms. */
const KEEP_AFTER_MS = 300;
const waiting = new Map<string, { text: string; done: () => void }>();
let keeping: ReturnType<typeof setTimeout> | undefined;

/** Writes every waiting part to storage now. Call when the page or a part goes away. */
export function keepNow() {
  clearTimeout(keeping);
  for (const [store, { text, done }] of waiting) {
    try {
      localStorage.setItem(store, text);
      done();
    } catch {
      // storage full or blocked: the settings last for this visit
    }
  }
  waiting.clear();
}

/** Keeps a part's settings in storage once changes stop coming; `done` runs when they are written. */
export function keepSoon(store: string, text: string, done: () => void) {
  waiting.set(store, { text, done });
  clearTimeout(keeping);
  keeping = setTimeout(keepNow, KEEP_AFTER_MS);
}

/** The panel's shared look: one set of sizes and gaps for every part. */
export const ui = {
  /** A small text button. */
  compact: "px-3 py-2 font-mono text-xs font-normal",
  /** A small button that asks before it acts. */
  confirm: "gap-1.5 rounded-lg px-3 py-2 font-mono text-xs font-normal",
  /** A line of explanation under a heading. */
  hint: "text-xs leading-relaxed text-foreground-darker",
  heading: "font-serif text-xl leading-none text-foreground",
  /** One section: a heading and its settings. */
  group: "flex flex-col gap-5",
  /** The sections of one tab, with a hairline between them. */
  sections:
    "flex flex-col gap-8 max-sm:gap-6 [&>section+section]:border-t [&>section+section]:border-secondary/10 [&>section+section]:pt-8 max-sm:[&>section+section]:pt-6",
  /**
   * A slider as one inspector row on a wide panel: name, track, value. On a
   * small screen the name and value sit over the track.
   */
  slider:
    "gap-2 [&_input]:h-2 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)_7rem] sm:items-center sm:gap-x-4 sm:[&>span:first-child]:contents sm:[&_input]:order-2 sm:[&>span:first-child>span:last-child]:order-3 sm:[&>span:first-child>span:last-child]:text-right",
};

/** The tab open in each part, by the part's key in the address: `sky`, `stars`, `clouds`, `birds`. The address is kept in step, so a refresh comes back to the same place. */
export const skyTabs = $state<Record<string, string>>({});

/** The tab a part opens on: the one the address names when the part has it, else its first. */
export function skyTab(
  part: string,
  tabs: readonly { key: string }[],
  first: string,
): string {
  const named = skyTabs[part];
  return named && tabs.some((t) => t.key === named) ? named : first;
}

/** Which view the panel shows: the open part's settings, the history, or the save page. One for all parts. */
export const skyView = $state<{ view: "settings" | "history" | "save" }>({
  view: "settings",
});

const OPEN_STORE = "orakl-sky-open";
/** The sections that are folded open, by `part/title`; every other one is shut. */
const skyOpen = $state<Record<string, boolean>>({});
try {
  Object.assign(skyOpen, JSON.parse(localStorage.getItem(OPEN_STORE) ?? "{}"));
} catch {
  // nothing kept, not readable, or no storage: every section starts shut
}

/**
 * A part's folding sections, read and set by title: `folded.Comet` is true
 * while that section is shut. A section starts shut; which ones are open is
 * kept in this browser.
 */
export function skyFolds(part: string): Record<string, boolean> {
  return new Proxy({} as Record<string, boolean>, {
    get: (_, title) => !skyOpen[`${part}/${String(title)}`],
    set: (_, title, shut) => {
      const key = `${part}/${String(title)}`;
      if (shut) delete skyOpen[key];
      else skyOpen[key] = true;
      try {
        localStorage.setItem(OPEN_STORE, JSON.stringify(skyOpen));
      } catch {
        // storage full or blocked: the folds last for this visit
      }
      return true;
    },
  });
}

/** One line of changes in a part: the stars have one, the clouds one for the whole sky and one per cloud. */
export interface SkyTimeline {
  /** What it is the history of, in words: "Stars", "Whole sky", "Cloud 3". */
  name: string;
  changes: readonly Change[];
  /** The change it stands on, -1 for its start. */
  at: number;
  goTo(index: number): void;
  forget(): void;
}

/** One part of the sky (the colours, the stars, the clouds, the birds): its data to save and read back, its history, and the way back to the code's own. */
export interface SkyPart {
  /** Its name on its tab: "Stars". */
  label: string;
  data(): object;
  /** Throws when the data is not this part's. */
  load(data: never): void;
  timelines(): SkyTimeline[];
  /** The start-over button's words, "Put the stars back", and what it does. */
  resetLabel: string;
  resetNote: string;
  reset(): void;
  /** More for the save page, under this part's start-over. */
  extra?: Snippet;
}

/** The parts in the order of their tabs. */
export const SKY_PART_ORDER = ["colours", "stars", "clouds", "birds"] as const;

/** The parts the mounted panels have put up for saving. */
export const skyParts = $state<{
  colours?: SkyPart;
  stars?: SkyPart;
  clouds?: SkyPart;
  birds?: SkyPart;
}>({});

/** Everything, as text: the clouds' own keys, the birds under `birds`, the sky colours under `colours`, the stars under `stars`. */
export function skyText(): string {
  return JSON.stringify(
    {
      ...skyParts.clouds?.data(),
      ...(skyParts.birds ? { birds: skyParts.birds.data() } : {}),
      ...(skyParts.colours ? { colours: skyParts.colours.data() } : {}),
      ...(skyParts.stars ? { stars: skyParts.stars.data() } : {}),
    },
    null,
    2,
  );
}

/** Reads text made by `skyText` back in, whichever parts it holds. Throws when it holds none. */
export function loadSkyText(text: string) {
  const { birds, colours, stars, ...clouds } = JSON.parse(text) as {
    birds?: object;
    colours?: object;
    stars?: object;
    clouds?: unknown;
  };
  const hasClouds = Array.isArray(clouds.clouds) && clouds.clouds.length > 0;
  if (!hasClouds && !birds && !colours && !stars)
    throw new Error("not a saved sky");
  if (hasClouds) skyParts.clouds?.load(clouds as never);
  if (birds) skyParts.birds?.load(birds as never);
  if (colours) skyParts.colours?.load(colours as never);
  if (stars) skyParts.stars?.load(stars as never);
}

/** How long ago, in words. */
export function ago(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
}
