import { GAME } from "data/game.settings.js";
import list from "data/nicknames.json";

/** Nicknames a player may draw on `/quiz/setup`, from `data/nicknames.json`. */
export const NICKNAMES: readonly string[] = list;

/**
 * Pick a random nickname from `pool`, skipping entries over the length limit
 * and, where another entry exists, the player's `current` nickname.
 */
export function randomNickname(
  pool: readonly string[] = NICKNAMES,
  current = "",
  rng: () => number = Math.random,
): string {
  const fits = pool.filter((n) => n.length <= GAME.player.maxNicknameLength);
  const fresh = fits.filter((n) => n !== current);
  const choices = fresh.length > 0 ? fresh : fits;
  return choices[Math.floor(rng() * choices.length)] ?? "";
}
