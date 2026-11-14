import { SKY_PHASES, type SkyPhase } from "@orakl/shared";
import type { EventKind } from "@/lib/birds/event";
import { birdLab, setBirdValue } from "@/lib/birds/lab.svelte";
import { MODIFIERS } from "@/lib/birds/modifiers";
import { defaultBirdSettings } from "@/lib/birds/settings";
import { cloudFits, cloudRange, skyClouds } from "@/lib/sky-clouds";
import { cloudLab, cloudStage } from "@/lib/sky-clouds-lab.svelte";
import { skyStrength } from "@/lib/sky-colours-lab.svelte";
import { setStarValue, starLab } from "@/lib/sky-stars-lab.svelte";

/** What lives in the sky at one time of day: how many clouds, how often birds, how often star events. Each value is kept by its own part. */

const BIRDS = defaultBirdSettings();
const KIND: Record<EventKind, string> = {
  skein: "Geese",
  murmuration: "Starlings",
  soar: "Gulls",
  raptor: "Hawks",
};

/** Whether a time of day is one of the day's own; a time of day made in the panel has no life of its own yet. */
export const hasLife = (key: string): key is SkyPhase =>
  (SKY_PHASES as readonly string[]).includes(key);

/** The fewest and most clouds a time of day shows at once. */
export const lifeClouds = (phase: SkyPhase) =>
  cloudRange(phase, cloudLab.settings);

/** Sets one end of that range, and moves the other end along when they would cross. */
export function setLifeClouds(phase: SkyPhase, end: 0 | 1, value: number) {
  const pair = [...lifeClouds(phase)] as [number, number];
  pair[end] = value;
  if (pair[0] > pair[1]) pair[1 - end] = value;
  cloudLab.settings.inSky = { ...cloudLab.settings.inSky, [phase]: pair };
}

/** Lets a time of day show the pool's own number of clouds again. */
export function resetLifeClouds(phase: SkyPhase) {
  const { [phase]: _own, ...rest } = cloudLab.settings.inSky;
  cloudLab.settings.inSky = rest;
}

export const lifeBirds = (phase: SkyPhase) => birdLab.settings.scenarios[phase];
export const birdStart = (phase: SkyPhase) => BIRDS.scenarios[phase];

export function setLifeBirds(
  phase: SkyPhase,
  what: "perHour" | "days",
  label: string,
  value: number,
) {
  setBirdValue(["scenarios", phase, what], label, value);
}

export const lifeStars = (phase: SkyPhase) =>
  starLab.settings.eventRates?.[phase] ?? 1;

export function setLifeStars(phase: SkyPhase, label: string, value: number) {
  const { [phase]: _own, ...rest } = starLab.settings.eventRates ?? {};
  setStarValue(
    ["eventRates"],
    label,
    value === 1 ? rest : { ...rest, [phase]: value },
  );
}

/** Whether anything of a time of day's life is not as it starts. */
export function lifeChanged(phase: SkyPhase): boolean {
  const birds = lifeBirds(phase);
  const start = birdStart(phase);
  return (
    cloudLab.settings.inSky?.[phase] !== undefined ||
    birds.perHour !== start.perHour ||
    birds.days !== start.days ||
    lifeStars(phase) !== 1
  );
}

/** Puts a time of day's life back as it starts. */
export function resetLife(phase: SkyPhase, name: string) {
  resetLifeClouds(phase);
  const start = birdStart(phase);
  const birds = lifeBirds(phase);
  if (birds.perHour !== start.perHour)
    setLifeBirds(phase, "perHour", `${name}: reset all, life`, start.perHour);
  if (birds.days !== start.days)
    setLifeBirds(phase, "days", `${name}: reset all, life`, start.days);
  if (lifeStars(phase) !== 1)
    setLifeStars(phase, `${name}: reset all, life`, 1);
}

/** One line of the forecast: what, and about how many in an hour, in words. */
export interface Forecast {
  what: string;
  much: string;
  /** Lines under it: its kinds, designs or twists. */
  parts?: Forecast[];
}

const about = (n: number) =>
  n <= 0
    ? "none"
    : n < 0.95
      ? `one in ${Math.round(1 / n)} h`
      : n < 10
        ? `about ${Math.round(n * 2) / 2}`
        : `about ${Math.round(n)}`;
const share = (v: number) => `${Math.round(v * 100)}%`;

/**
 * An hour of the sky at a time of day, worked out from the settings as they
 * stand: the clouds that drift by and which designs, the flocks and their
 * kinds and twists, and the star events. Means, not a promise: the day's seed
 * decides each hour.
 */
export function forecast(
  phase: SkyPhase,
  month = new Date().getMonth(),
): Forecast[] {
  const out: Forecast[] = [];
  const strength = skyStrength(phase);

  // Clouds: how many at once, and how many cross in the hour.
  const cs = cloudLab.settings;
  const [few, most] = cloudRange(phase, cs);
  const pool = skyClouds(cloudLab.daySeed ?? 0, cs).filter((c) =>
    cloudFits(c, phase),
  );
  if (strength.clouds <= 0 || most <= 0 || pool.length === 0)
    out.push({ what: "Clouds", much: "none" });
  else {
    const pace = (cloudStage.motion?.pace ?? 1) || 1;
    const crossing =
      pool.reduce((sum, c) => sum + c.dur, 0) / pool.length / pace;
    const passing = (((few + most) / 2) * 3600) / crossing;
    const total = pool.reduce((sum, c) => sum + c.rarity, 0);
    out.push({
      what: "Clouds",
      much: `${few === most ? few : `${few} to ${most}`} in the sky, ${about(passing)} drift by`,
      parts: pool
        .map((c) => ({
          what: c.name || `Cloud ${c.id + 1}`,
          much: share(c.rarity / total),
          at: c.rarity,
        }))
        .sort((a, b) => b.at - a.at)
        .map(({ what, much }) => ({ what, much })),
    });
  }

  // Birds: flocks in the hour on a day with birds, by kind, and the twists among them.
  const bs = birdLab.settings;
  const sc = bs.scenarios[phase];
  if (
    strength.birds <= 0 ||
    sc.perHour <= 0 ||
    sc.days <= 0 ||
    !sc.events.length
  )
    out.push({ what: "Flocks", much: "none" });
  else {
    const weight = new Map<EventKind, number>();
    for (const e of sc.events)
      weight.set(
        e.kind,
        (weight.get(e.kind) ?? 0) +
          e.weight * (bs.seasons[e.kind]?.[month] ?? 1),
      );
    const total = [...weight.values()].reduce((a, b) => a + b, 0) || 1;
    out.push({
      what: "Flocks",
      much: `${about(sc.perHour)}${sc.days < 1 ? `, on ${share(sc.days)} of days` : ""}`,
      parts: [...weight]
        .sort((a, b) => b[1] - a[1])
        .map(([kind, w]) => {
          const flocks = (sc.perHour * w) / total;
          const twists = MODIFIERS.filter(
            (m) =>
              m.kind === kind &&
              (m.weights[phase] ?? 0) * (bs.twists[m.id] ?? 1) > 0,
          );
          return {
            what: KIND[kind],
            much: `${about(flocks)}${twists.length ? `, ${about(flocks * bs.twistShare[kind])} with a twist` : ""}`,
          };
        }),
    });
  }

  // Star events, where stars show.
  const ss = starLab.settings;
  const rate = lifeStars(phase);
  if (strength.stars <= 0)
    out.push({ what: "Star events", much: "none: no stars at this time" });
  else {
    const every = (ss.shooting.every[0] + ss.shooting.every[1]) / 2;
    const shooting = every > 0 ? (3600 / every) * rate : 0;
    out.push({
      what: "Star events",
      much: rate === 1 ? "as set in Stars" : `${rate}× the rates set in Stars`,
      parts: [
        {
          what: "Shooting stars",
          much: about(shooting * (1 - ss.shooting.fireball)),
        },
        { what: "Fireballs", much: about(shooting * ss.shooting.fireball) },
        { what: "Meteor showers", much: about(ss.shower.perHour * rate) },
        {
          what: "Satellites",
          much: about(ss.satellite.perHour * rate * (1 - ss.satellite.train)),
        },
        {
          what: "Satellite trains",
          much: about(ss.satellite.perHour * rate * ss.satellite.train),
        },
        { what: "Aurora", much: about(ss.aurora.perHour * rate) },
        {
          what: "Comets",
          much:
            ss.comet.chance <= 0
              ? "none"
              : `on ${share(ss.comet.chance)} of nights, about 60`,
        },
      ],
    });
  }
  return out;
}
