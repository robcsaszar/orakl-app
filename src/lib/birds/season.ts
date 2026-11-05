import type { EventKind } from "./event";
import type { ModifierId } from "./modifiers";

/** Month multipliers (January first) on how often a kind is picked. */
const KIND: Record<EventKind, number[]> = {
  // Geese move in spring and autumn; summer skies are nearly empty of them.
  skein: [1.2, 1.2, 1.8, 1.8, 1.0, 0.5, 0.4, 0.6, 1.6, 2.0, 2.0, 1.4],
  // Murmurations are a winter sight.
  murmuration: [2.0, 1.8, 1.2, 0.7, 0.4, 0.3, 0.3, 0.4, 0.8, 1.4, 2.0, 2.0],
  soar: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  // Raptors soar all year, most in the late-summer thermals.
  raptor: [0.7, 0.7, 0.9, 1.0, 1.1, 1.2, 1.3, 1.5, 1.5, 1.1, 0.8, 0.7],
};

/** Month multipliers on a modifier's weight; unlisted modifiers are 1 all year. */
const MOD: Partial<Record<ModifierId, number[]>> = {
  // Kettles form on migration in late summer and early autumn.
  kettle: [0.2, 0.2, 0.5, 0.6, 0.6, 0.8, 1.2, 3.0, 3.0, 1.2, 0.3, 0.2],
  giant: [1.6, 1.4, 1.0, 0.6, 0.4, 0.3, 0.3, 0.4, 0.8, 1.2, 1.6, 1.8],
  funnel: [1.5, 1.4, 1.0, 0.8, 0.6, 0.5, 0.5, 0.6, 1.0, 1.3, 1.5, 1.6],
  landing: [1.0, 1.0, 1.5, 1.5, 1.0, 0.7, 0.7, 0.8, 1.4, 1.6, 1.6, 1.2],
};

/** Season multiplier on an event kind's pick weight for a month (0 = January). */
export function kindSeason(kind: EventKind, month: number): number {
  return KIND[kind][((month % 12) + 12) % 12];
}

/** Season multiplier on a modifier's weight for a month (0 = January). */
export function modSeason(mod: ModifierId, month: number): number {
  return MOD[mod]?.[((month % 12) + 12) % 12] ?? 1;
}
