import type { SkyPhase } from "@orakl/shared";
import type { EventKind } from "./event";
import type { Rng } from "./rng";
import { modSeason } from "./season";

export type ModifierId =
  | "echelon"
  | "low-pass"
  | "landing"
  | "pulse"
  | "ribbon"
  | "funnel"
  | "giant"
  | "probing"
  | "frenzy"
  | "loafing"
  | "squabble"
  | "commute"
  | "pair"
  | "mobbed"
  | "failed-stoop"
  | "kettle"
  | "ambush";

export interface Modifier {
  id: ModifierId;
  kind: EventKind;
  /** Short on-screen name. */
  label: string;
  /** What it does, as the end of "A skein of geese …". */
  phrase: string;
  /** Pick weight per phase; a phase not listed never rolls it. */
  weights: Partial<Record<SkyPhase, number>>;
  /** Cannot be combined with these. */
  excludes?: ModifierId[];
}

const DAY: Partial<Record<SkyPhase, number>> = {
  dawn: 1,
  morning: 1,
  noon: 1,
  evening: 1,
  sunset: 1,
  dusk: 1,
};

/** Small twists on a regular event, each with the phases it belongs to. */
export const MODIFIERS: Modifier[] = [
  // Skein
  {
    id: "echelon",
    kind: "skein",
    label: "echelon",
    phrase: "in one echelon line",
    weights: DAY,
  },
  {
    id: "low-pass",
    kind: "skein",
    label: "low pass",
    phrase: "passing low",
    weights: { dawn: 2, morning: 1, evening: 1, dusk: 2 },
  },
  {
    id: "landing",
    kind: "skein",
    label: "landing",
    phrase: "coming in to land",
    weights: { dusk: 3, sunset: 1 },
  },
  // Murmuration
  {
    id: "pulse",
    kind: "murmuration",
    label: "predator pulse",
    phrase: "pulsing under a predator",
    weights: { evening: 1, sunset: 2, dusk: 1 },
  },
  {
    id: "ribbon",
    kind: "murmuration",
    label: "ribbon",
    phrase: "drawn out into a ribbon",
    weights: { morning: 1, evening: 1, sunset: 1 },
  },
  {
    id: "funnel",
    kind: "murmuration",
    label: "roost funnel",
    phrase: "funnelling down to roost",
    weights: { dusk: 3 },
    excludes: ["ribbon"],
  },
  {
    id: "giant",
    kind: "murmuration",
    label: "giant",
    phrase: "twice the usual size",
    weights: { sunset: 2, dusk: 1 },
  },
  {
    id: "probing",
    kind: "murmuration",
    label: "raptor probing",
    phrase: "probed by a raptor",
    weights: { evening: 1, sunset: 2 },
  },
  // Gulls
  {
    id: "frenzy",
    kind: "soar",
    label: "frenzy",
    phrase: "in a feeding frenzy",
    weights: { morning: 2, noon: 1, evening: 1 },
    excludes: ["loafing"],
  },
  {
    id: "loafing",
    kind: "soar",
    label: "loafing",
    phrase: "loafing on the wind",
    weights: { noon: 3, evening: 1 },
    excludes: ["frenzy"],
  },
  {
    id: "squabble",
    kind: "soar",
    label: "squabble",
    phrase: "squabbling over the spot",
    weights: { morning: 1, noon: 1, evening: 1 },
  },
  {
    id: "commute",
    kind: "soar",
    label: "commute",
    phrase: "commuting across the sky",
    weights: { dawn: 3, evening: 2, sunset: 1 },
    excludes: ["frenzy", "loafing", "squabble"],
  },
  // Raptor
  {
    id: "pair",
    kind: "raptor",
    label: "pair",
    phrase: "hunting as a pair",
    weights: { morning: 1, noon: 2, evening: 1 },
    excludes: ["kettle"],
  },
  {
    id: "mobbed",
    kind: "raptor",
    label: "mobbed",
    phrase: "mobbed by crows",
    weights: { morning: 1, noon: 1, evening: 1 },
    excludes: ["kettle"],
  },
  {
    id: "failed-stoop",
    kind: "raptor",
    label: "failed stoop",
    phrase: "whose stoop will miss",
    weights: { morning: 1, noon: 1, evening: 1, dawn: 1, dusk: 1 },
    excludes: ["kettle"],
  },
  {
    id: "kettle",
    kind: "raptor",
    label: "kettle",
    phrase: "circling as a kettle",
    weights: { noon: 3 },
    excludes: ["pair", "mobbed", "failed-stoop", "ambush"],
  },
  {
    id: "ambush",
    kind: "raptor",
    label: "ambush",
    phrase: "ambushing a flock from above",
    weights: { morning: 0.5, evening: 0.6, sunset: 0.6 },
    excludes: ["pair", "mobbed", "failed-stoop", "kettle"],
  },
];

export const MODIFIER_BY_ID: Record<ModifierId, Modifier> = Object.fromEntries(
  MODIFIERS.map((m) => [m.id, m]),
) as Record<ModifierId, Modifier>;

/** Chance of one modifier, and of two; the rest of events are plain. */
export const ONE_CHANCE = 0.2;
export const TWO_CHANCE = 0.03;

/** Rolls the modifiers for one event: none most of the time, rarely two; the month shifts the odds. */
export function rollModifiers(
  kind: EventKind,
  phase: SkyPhase,
  rng: Rng,
  month = 0,
): ModifierId[] {
  const r = rng.next();
  const want = r < TWO_CHANCE ? 2 : r < TWO_CHANCE + ONE_CHANCE ? 1 : 0;
  const picked: ModifierId[] = [];
  for (let k = 0; k < want; k++) {
    const pool = MODIFIERS.filter(
      (m) =>
        m.kind === kind &&
        (m.weights[phase] ?? 0) > 0 &&
        !picked.includes(m.id) &&
        !m.excludes?.some((x) => picked.includes(x)) &&
        !picked.some((p) => MODIFIER_BY_ID[p].excludes?.includes(m.id)),
    );
    if (pool.length === 0) break;
    const weight = (m: Modifier) =>
      (m.weights[phase] ?? 0) * modSeason(m.id, month);
    let total = 0;
    for (const m of pool) total += weight(m);
    let x = rng.range(0, total);
    for (const m of pool) {
      x -= weight(m);
      if (x <= 0) {
        picked.push(m.id);
        break;
      }
    }
  }
  return picked;
}

/** "Skein · echelon" for the stats line. */
export function eventLabel(
  kind: EventKind,
  mods: readonly ModifierId[],
): string {
  const name = {
    skein: "Skein",
    murmuration: "Murmuration",
    soar: "Gulls",
    raptor: "Raptor",
  }[kind];
  if (mods.length === 0) return name;
  return `${name} · ${mods.map((m) => MODIFIER_BY_ID[m].label).join(", ")}`;
}

const SUBJECT: Record<EventKind, string> = {
  skein: "A skein of geese",
  murmuration: "A murmuration of starlings",
  soar: "Gulls",
  raptor: "A raptor",
};
const PLAIN: Record<EventKind, string> = {
  skein: "crossing the sky",
  murmuration: "wheeling as one mass",
  soar: "gathering over a feeding spot",
  raptor: "hunting a flock",
};

/** "A skein of geese in one echelon line, passing low." for the panel's top-left line. */
export function eventSentence(
  kind: EventKind,
  mods: readonly ModifierId[],
): string {
  const tail =
    mods.length === 0
      ? PLAIN[kind]
      : mods.map((m) => MODIFIER_BY_ID[m].phrase).join(", ");
  return `${SUBJECT[kind]} ${tail}.`;
}
