/** Dev-only mock helpers (ADR 0010) for spreading bot-player answers across answer
 * slots in mimic mode, so overlay states (even split, overflow, landslide) can be
 * previewed via the `dist` URL param. */

export function parseDistParam(
  raw: string | null,
  slots: number,
): number[] | null {
  if (!raw) return null;
  const parts = raw.split(",").map((v) => Math.max(0, parseInt(v, 10) || 0));
  while (parts.length < slots) parts.push(0);
  return parts.slice(0, slots);
}

/** Mirrors the historical hardcoded split (60% slot 0, 40% slot 1) used before `dist` existed. */
export function defaultBotDistribution(
  slots: number,
  botCount: number,
): number[] {
  const counts = new Array(slots).fill(0);
  for (let i = 1; i <= botCount; i++) {
    if (i % 5 < 3) counts[0]++;
    else counts[1] = (counts[1] ?? 0) + 1;
  }
  return counts;
}

/** Resolves final per-slot bot counts, clamped so the total never exceeds botCount. */
export function resolveBotDistribution(
  raw: string | null,
  slots: number,
  botCount: number,
): number[] {
  const counts =
    parseDistParam(raw, slots) ?? defaultBotDistribution(slots, botCount);
  let remaining = botCount;
  return counts.map((c) => {
    const used = Math.min(c, remaining);
    remaining -= used;
    return used;
  });
}

/** Flattens per-slot counts into one answer-value-per-bot, in slot order. */
export function assignBotAnswers(
  counts: number[],
  answerValues: string[],
): string[] {
  const out: string[] = [];
  counts.forEach((c, slot) => {
    for (let k = 0; k < c; k++) out.push(answerValues[slot]);
  });
  return out;
}
