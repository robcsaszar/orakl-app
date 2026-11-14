import {
  effectiveThemeForPhase,
  LOGO_SCHEDULE,
  PHASE_CONFIG,
  SKY_PHASES,
  SKY_SCHEDULE,
  type SkyPhase,
  THEME_LABELS,
} from "@orakl/shared";
import { CLOUD_TINT, PHASE_STOPS } from "@/lib/constants/phase-stops.constants";
import { createHistory } from "@/lib/sky-history.svelte";

/** A sky picture's box, in its own units (32:35). */
export const SCENE_W = 64;
export const SCENE_H = 70;

/** The things a swatch can hold. */
export type SceneKind =
  | "sun"
  | "moon"
  | "sparkle"
  | "star"
  | "cloud"
  | "streak"
  | "birds";

/** One thing in a swatch. */
export interface SceneItem {
  kind: SceneKind;
  /** Its middle, in scene units; a y past `SCENE_H` leaves a sun half set. */
  x: number;
  y: number;
  /** Multiplier on its drawn size. */
  size: number;
  /** Degrees it is turned, clockwise. */
  turn: number;
  /** Shapes a cloud; other kinds ignore it. */
  seed: number;
}

/** What a swatch shows over its gradient: its items, the one at the back first. */
export type SkyScene = SceneItem[];

/** What each kind is called, and what can be changed about it beyond place and size. */
export const SCENE_KINDS: Record<
  SceneKind,
  { label: string; hint: string; turns: boolean; rolls: boolean }
> = {
  sun: {
    label: "Sun",
    hint: "A disc with a soft halo.",
    turns: false,
    rolls: false,
  },
  moon: {
    label: "Moon",
    hint: "A crescent. Turn it to tip the horns.",
    turns: true,
    rolls: false,
  },
  sparkle: {
    label: "Sparkle",
    hint: "A four-point star, for one bright star.",
    turns: true,
    rolls: false,
  },
  star: {
    label: "Star",
    hint: "A small round star.",
    turns: false,
    rolls: false,
  },
  cloud: {
    label: "Cloud",
    hint: "A small cloud. Roll again for another shape.",
    turns: false,
    rolls: true,
  },
  streak: {
    label: "Shooting star",
    hint: "A still streak of light. Turn it to aim it.",
    turns: true,
    rolls: false,
  },
  birds: { label: "Birds", hint: "Two far birds.", turns: true, rolls: false },
};

/** The most a swatch may hold: it is a thumbnail, and more than this reads as noise. */
export const SCENE_MAX = 12;

/** A swatch written the short way: its sun or moon, and round stars as [x, y, radius]. */
interface ShortScene {
  body: { kind: "sun" | "moon" | "none"; x: number; y: number };
  stars: [number, number, number][];
}

/** Radius of a round star at a size of 1, scene units. */
const STAR_RADIUS = 0.7;

/** A short scene as items: the stars at the back, the sun or moon in front. */
export function sceneItems(short: ShortScene): SkyScene {
  const items: SkyScene = short.stars.map(([x, y, r]) => ({
    kind: "star",
    x,
    y,
    size: +(r / STAR_RADIUS).toFixed(2),
    turn: 0,
    seed: 0,
  }));
  if (short.body.kind !== "none")
    items.push({
      kind: short.body.kind,
      x: short.body.x,
      y: short.body.y,
      size: 1,
      turn: 0,
      seed: 0,
    });
  return items;
}

/** The swatch of each phase. */
export const SKY_SCENES: Record<SkyPhase, SkyScene> = {
  night: sceneItems({
    body: { kind: "moon", x: 25, y: 29 },
    stars: [
      [11.5, 19, 0.7],
      [42, 13, 0.8],
      [55, 37, 0.7],
      [24, 45.5, 0.6],
    ],
  }),
  dawn: [
    { kind: "star", x: 13.8, y: 16, size: 0.86, turn: 0, seed: 0 },
    { kind: "sun", x: 32, y: 73.5, size: 1, turn: 0, seed: 0 },
    { kind: "star", x: 46.5, y: 30.9, size: 1, turn: 0, seed: 92876141 },
    { kind: "sparkle", x: 42.4, y: 9.4, size: 0.6, turn: 0, seed: 238405563 },
  ],
  morning: sceneItems({ body: { kind: "sun", x: 32, y: 54 }, stars: [] }),
  noon: sceneItems({ body: { kind: "sun", x: 32, y: 16 }, stars: [] }),
  evening: sceneItems({ body: { kind: "sun", x: 32, y: 45.5 }, stars: [] }),
  sunset: sceneItems({ body: { kind: "sun", x: 32, y: 73.5 }, stars: [] }),
  dusk: [
    { kind: "star", x: 45.8, y: 13.1, size: 1, turn: 0, seed: 0 },
    { kind: "star", x: 15, y: 27.7, size: 0.71, turn: 0, seed: 0 },
    { kind: "moon", x: 32, y: 35, size: 1, turn: 0, seed: 0 },
    { kind: "sun", x: 32, y: 78, size: 1, turn: 0, seed: 19057661 },
  ],
};

/** Everything about how one time of day looks and when it shows. */
export interface SkyLook {
  /** The gradient, top to horizon: six stops, each a place in percent and a colour. */
  stops: { offsets: number[]; colors: string[] };
  /** The clouds' colour, lit top then shaded underside. */
  tint: [string, string];
  /** Dark or light page colours while this time of day shows. */
  theme: "dark" | "light";
  /** The logo's colours: the light one for a dark sky, the dark one for a bright sky. */
  logo: "dark" | "light";
  /** What the big logo at the head of a page is: the full wordmark, or the mark alone. */
  logoShape: "wordmark" | "mark";
  /** How visible the stars are, 0 to 1. */
  starOpacity: number;
  /** How visible the birds are, 0 to 1. */
  birdOpacity: number;
  /** Multiplier on how visible the clouds are, 0 to 1. */
  cloudOpacity: number;
  /** The clock hours it shows from and until, or null when the clock never shows it. */
  hours: [number, number] | null;
  scene: SkyScene;
}

/** A time of day made in the controls, on top of the code's own. */
export interface CustomPhase {
  label: string;
  /** The phase it was copied from; its birds, wind and cloud count are that phase's. */
  base: SkyPhase;
  /** Whether people may pick it as a fixed theme. */
  inPicker: boolean;
}

/** The sky's looks, by phase or custom id. */
export interface SkyColours {
  looks: Record<string, SkyLook>;
  custom: Record<string, CustomPhase>;
}

/** One phase's look as the code's own tables have it. */
function codeLook(phase: SkyPhase): SkyLook {
  return structuredClone({
    stops: PHASE_STOPS[phase],
    tint: CLOUD_TINT[phase],
    theme: PHASE_CONFIG[phase].theme,
    logo: LOGO_SCHEDULE[phase],
    logoShape: "wordmark",
    starOpacity: PHASE_CONFIG[phase].starOpacity,
    birdOpacity: PHASE_CONFIG[phase].birdOpacity,
    cloudOpacity: 1,
    hours: SKY_SCHEDULE[phase],
    scene: SKY_SCENES[phase],
  }) as SkyLook;
}

/** The looks as the code's own tables have them. */
export function defaultSkyColours(): SkyColours {
  return {
    looks: Object.fromEntries(SKY_PHASES.map((p) => [p, codeLook(p)])),
    custom: {},
  };
}

/**
 * What the sky controls (`?sky`) hold over the sky. The sky reads it only
 * while `active`, so a visitor without the panel gets the code's own looks.
 */
export const skyLab = $state<{
  active: boolean;
  colours: SkyColours;
  /** Id of the custom time of day in the sky now, or null for the page's own phase. */
  showing: string | null;
  /** The big logo's shape for the time of day in the sky, or null for the page's own. */
  logoShape: "wordmark" | "mark" | null;
}>({
  active: false,
  colours: defaultSkyColours(),
  showing: null,
  logoShape: null,
});

const isPhase = (key: string): key is SkyPhase =>
  (SKY_PHASES as readonly string[]).includes(key);

/** The look kept under a phase or custom id, or null outside the controls. */
export function skyLookOf(key: string): SkyLook | null {
  return skyLab.active ? (skyLab.colours.looks[key] ?? null) : null;
}

/** The look in the sky for the page's phase: a custom one while it is showing. */
function liveLook(phase: SkyPhase): SkyLook | null {
  return skyLookOf(skyLab.showing ?? phase) ?? skyLookOf(phase);
}

/** A phase's gradient stops: the controls' while they are open, else the code's. */
export const skyStops = (phase: SkyPhase) =>
  liveLook(phase)?.stops ?? PHASE_STOPS[phase];

/** A phase's cloud tint, lit top then shaded underside. */
export const skyTint = (phase: SkyPhase): readonly [string, string] =>
  liveLook(phase)?.tint ?? CLOUD_TINT[phase];

/** How visible stars, birds and clouds are in a phase. */
export function skyStrength(phase: SkyPhase) {
  const look = liveLook(phase);
  return {
    stars: look?.starOpacity ?? PHASE_CONFIG[phase].starOpacity,
    birds: look?.birdOpacity ?? PHASE_CONFIG[phase].birdOpacity,
    clouds: look?.cloudOpacity ?? 1,
  };
}

/** The gradient and picture of a small sky picture, by phase or custom id. */
export function skySwatch(key: string) {
  const look = skyLookOf(key);
  const phase = isPhase(key) ? key : "noon";
  return {
    stops: look?.stops ?? PHASE_STOPS[phase],
    scene: look?.scene ?? SKY_SCENES[phase],
  };
}

/** The name of a phase or a custom time of day. */
export const skyLabel = (key: string) =>
  skyLab.colours.custom[key]?.label ?? (isPhase(key) ? THEME_LABELS[key] : key);

/** Whether clock hours [start, end) hold an hour; start past end wraps midnight. */
const holds = ([start, end]: [number, number], hour: number) =>
  start > end ? hour >= start || hour < end : hour >= start && hour < end;

/**
 * The time of day the clock shows at an hour. Custom ones are asked first, so
 * one given hours takes them from the phase it overlaps. An hour nothing
 * holds is night.
 */
export function skyKeyAt(hour: number): string {
  if (skyLab.active) {
    const { looks, custom } = skyLab.colours;
    for (const key of [...Object.keys(custom), ...SKY_PHASES]) {
      const hours = looks[key]?.hours;
      if (hours && holds(hours, hour)) return key;
    }
    return "night";
  }
  for (const phase of SKY_PHASES)
    if (holds(SKY_SCHEDULE[phase], hour)) return phase;
  return "night";
}

/** Puts a phase or a custom time of day in the sky, with its page colours. */
export function showSky(key: string) {
  const custom = skyLab.colours.custom[key];
  const phase = custom ? custom.base : isPhase(key) ? key : "night";
  skyLab.showing = custom ? key : null;
  document.documentElement.dataset.skyPhase = phase;
  document.documentElement.dataset.effectiveTheme =
    skyLookOf(key)?.theme ?? effectiveThemeForPhase(phase);
}

/** The one id the sky looks' changes are kept under. */
export const SKY = 0;

/** Undo history of the sky looks as a whole. */
export const skyHistory = createHistory(
  "orakl-sky-lab-history",
  () => JSON.stringify(skyLab.colours),
  (_id, state) => {
    skyLab.colours = JSON.parse(state);
    if (skyLab.showing && !skyLab.colours.custom[skyLab.showing])
      skyLab.showing = null;
  },
);

/** Makes one change to the looks and records it under `label`. */
export function changeSky(label: string, apply: (c: SkyColours) => void) {
  const before = skyHistory.snapshot(SKY);
  apply(skyLab.colours);
  skyHistory.log(SKY, label, before);
}

/** Adds a time of day that starts as a copy of another, and gives its id. */
export function addSkyPhase(from: string, label: string): string {
  const { looks, custom } = skyLab.colours;
  let n = 1;
  while (`custom-${n}` in looks) n++;
  const id = `custom-${n}`;
  const base = custom[from]?.base ?? (isPhase(from) ? from : "noon");
  changeSky(`Added ${label}`, (c) => {
    c.looks[id] = {
      ...(structuredClone($state.snapshot(looks[from])) as SkyLook),
      hours: null,
    };
    c.custom[id] = { label, base, inPicker: false };
  });
  return id;
}

/** Reads saved looks in over the code's own; throws when the data holds none. */
export function loadSkyColours(data: Partial<SkyColours>) {
  if (!data.looks) throw new Error("not saved sky looks");
  const base = defaultSkyColours();
  const custom = data.custom ?? {};
  const looks = { ...base.looks };
  for (const [key, look] of Object.entries(data.looks)) {
    const from = isPhase(key) ? key : custom[key]?.base;
    if (!from) continue;
    looks[key] = { ...codeLook(from), ...look };
    // A swatch saved the short way (a sun or moon and stars) is read as items.
    const scene = look.scene as SkyScene | ShortScene | undefined;
    if (scene && !Array.isArray(scene))
      (looks[key] as SkyLook).scene = sceneItems(scene);
  }
  skyLab.colours = { looks, custom };
  if (skyLab.showing && !custom[skyLab.showing]) skyLab.showing = null;
}

/** "#rrggbb" as hue (0-360), saturation and lightness (0-100). */
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map(
    (i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255,
  ) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h =
      max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/** Hue (0-360), saturation and lightness (0-100) as "#rrggbb". */
export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return `#${[r, g, b]
    .map((v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
