/** Integer hash mix for combining seeds (xorshift-multiply, 32-bit). */
export function mix(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h ^= (p | 0) + 0x7f4a7c15;
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The day's seed: the same for everyone on the same local date, so a lobby's
 * players share one sky.
 */
export function daySeed(date: Date): number {
  return mix(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
