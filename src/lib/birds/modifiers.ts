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
  | "wave"
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
  /** What is seen, in a full sentence, for the controls. */
  about: string;
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
    about: "The geese fly in one slanted line, not a V.",
    weights: DAY,
  },
  {
    id: "low-pass",
    kind: "skein",
    label: "low pass",
    phrase: "passing low",
    about: "The line of geese crosses low and near, so each bird is large.",
    weights: { dawn: 2, morning: 1, evening: 1, dusk: 2 },
  },
  {
    id: "landing",
    kind: "skein",
    label: "landing",
    phrase: "coming in to land",
    about:
      "The line sinks as it goes and drops below the view before the far side, as geese do coming in to land.",
    weights: { dusk: 3, sunset: 1 },
  },
  // Murmuration
  {
    id: "pulse",
    kind: "murmuration",
    label: "predator pulse",
    phrase: "pulsing under a predator",
    about:
      "Every few seconds the cloud of starlings snaps tight and lets go again, as it does under a predator.",
    weights: { evening: 1, sunset: 2, dusk: 1 },
  },
  {
    id: "ribbon",
    kind: "murmuration",
    label: "ribbon",
    phrase: "drawn out into a ribbon",
    about: "The cloud is drawn out long and thin along its path.",
    weights: { morning: 1, evening: 1, sunset: 1 },
  },
  {
    id: "funnel",
    kind: "murmuration",
    label: "roost funnel",
    phrase: "funnelling down to roost",
    about:
      "Halfway across, the cloud pours down out of the view, as starlings do going to roost.",
    weights: { dusk: 3 },
    excludes: ["ribbon"],
  },
  {
    id: "giant",
    kind: "murmuration",
    label: "giant",
    phrase: "twice the usual size",
    about: "The cloud holds twice as many birds.",
    weights: { sunset: 2, dusk: 1 },
  },
  {
    id: "probing",
    kind: "murmuration",
    label: "raptor probing",
    phrase: "probed by a raptor",
    about:
      "A hawk circles above the cloud and never dives; the cloud stays tight and wary under it.",
    weights: { evening: 1, sunset: 2 },
  },
  {
    id: "wave",
    kind: "murmuration",
    label: "alarm wave",
    phrase: "rippling with waves of alarm",
    about:
      "One bird takes fright and the fright runs from bird to bird, so a dark band of turning birds rolls through the cloud.",
    weights: { evening: 1, sunset: 2, dusk: 2 },
  },
  // Gulls
  {
    id: "frenzy",
    kind: "soar",
    label: "frenzy",
    phrase: "in a feeding frenzy",
    about: "More gulls, in a tighter ring, with busy wings, as over food.",
    weights: { morning: 2, noon: 1, evening: 1 },
    excludes: ["loafing"],
  },
  {
    id: "loafing",
    kind: "soar",
    label: "loafing",
    phrase: "loafing on the wind",
    about: "The gulls ride a wide, lazy ring and hardly beat a wing.",
    weights: { noon: 3, evening: 1 },
    excludes: ["frenzy"],
  },
  {
    id: "squabble",
    kind: "soar",
    label: "squabble",
    phrase: "squabbling over the spot",
    about: "One gull chases another through the ring.",
    weights: { morning: 1, noon: 1, evening: 1 },
  },
  {
    id: "commute",
    kind: "soar",
    label: "commute",
    phrase: "commuting across the sky",
    about:
      "No ring: the gulls cross the sky in a loose line, on their way to or from the roost.",
    weights: { dawn: 3, evening: 2, sunset: 1 },
    excludes: ["frenzy", "loafing", "squabble"],
  },
  // Raptor
  {
    id: "pair",
    kind: "raptor",
    label: "pair",
    phrase: "hunting as a pair",
    about: "Two hawks share the same circle.",
    weights: { morning: 1, noon: 2, evening: 1 },
    excludes: ["kettle"],
  },
  {
    id: "mobbed",
    kind: "raptor",
    label: "mobbed",
    phrase: "mobbed by crows",
    about: "Crows harass the hawk until it leaves early.",
    weights: { morning: 1, noon: 1, evening: 1 },
    excludes: ["kettle"],
  },
  {
    id: "failed-stoop",
    kind: "raptor",
    label: "failed stoop",
    phrase: "whose stoop will miss",
    about:
      "The hawk dives at the flock, breaks off early, and the flock is unharmed.",
    weights: { morning: 1, noon: 1, evening: 1, dawn: 1, dusk: 1 },
    excludes: ["kettle"],
  },
  {
    id: "kettle",
    kind: "raptor",
    label: "kettle",
    phrase: "circling as a kettle",
    about: "Five or six hawks circle together and do not hunt.",
    weights: { noon: 3 },
    excludes: ["pair", "mobbed", "failed-stoop", "ambush"],
  },
  {
    id: "ambush",
    kind: "raptor",
    label: "ambush",
    phrase: "ambushing a flock from above",
    about:
      "The hawk does not circle first: it drops in from above the top of the screen, already in its dive.",
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
/** The odds of twists: the chance of one and of two, and a multiplier on each twist's own weight. */
export interface TwistOdds {
  one: number;
  two: number;
  weights: Partial<Record<ModifierId, number>>;
}

export function rollModifiers(
  kind: EventKind,
  phase: SkyPhase,
  rng: Rng,
  month = 0,
  odds: TwistOdds = { one: ONE_CHANCE, two: TWO_CHANCE, weights: {} },
): ModifierId[] {
  const r = rng.next();
  const want = r < odds.two ? 2 : r < odds.two + odds.one ? 1 : 0;
  const own = (m: Modifier) =>
    (m.weights[phase] ?? 0) * (odds.weights[m.id] ?? 1);
  const picked: ModifierId[] = [];
  for (let k = 0; k < want; k++) {
    const pool = MODIFIERS.filter(
      (m) =>
        m.kind === kind &&
        own(m) > 0 &&
        !picked.includes(m.id) &&
        !m.excludes?.some((x) => picked.includes(x)) &&
        !picked.some((p) => MODIFIER_BY_ID[p].excludes?.includes(m.id)),
    );
    if (pool.length === 0) break;
    const weight = (m: Modifier) => own(m) * modSeason(m.id, month);
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
