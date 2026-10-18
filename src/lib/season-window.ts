/** A Season's calendar window; days are `MM-DD` when yearly, `YYYY-MM-DD` when dated. */
export interface SeasonWindow {
  repeats_yearly: boolean;
  window_start: string;
  window_end: string;
}

/** `now` as `YYYY-MM-DD` in UTC, the calendar the window reads. */
function isoDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Whether `now` falls in the window, read on the UTC day. Both ends are
 * inclusive. A yearly end before the start wraps the year (`12-20` → `01-06`
 * covers Christmas through Epiphany); a dated window never wraps.
 */
export function isInWindow(w: SeasonWindow, now: Date = new Date()): boolean {
  const { window_start: start, window_end: end } = w;
  if (!w.repeats_yearly) {
    const today = isoDay(now);
    return today >= start && today <= end;
  }
  const today = isoDay(now).slice(5);
  return start <= end
    ? today >= start && today <= end
    : today >= start || today <= end;
}

const isLeapYear = (y: number): boolean =>
  (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * The next `YYYY-MM-DD` the window opens, after `now`'s UTC day. A yearly
 * window opens again next year once its start has passed; a dated window
 * never reopens, so it gives `null` from its start day on. A yearly `02-29`
 * start opens on the next leap day.
 */
export function nextOpening(w: SeasonWindow, now: Date): string | null {
  const today = isoDay(now);
  if (!w.repeats_yearly) {
    return today < w.window_start ? w.window_start : null;
  }
  let year = Number(today.slice(0, 4));
  if (today.slice(5) >= w.window_start) year += 1;
  if (w.window_start === "02-29" && !isLeapYear(year)) {
    // No 29 February this year: the window opens on 1 March when it reaches
    // it, or waits for the next leap year when it is that day alone.
    if (w.window_end !== "02-29") return `${year}-03-01`;
    while (!isLeapYear(year)) year += 1;
  }
  return `${year}-${w.window_start}`;
}

/** The opening day of the yearly window in `year`; a `02-29` start opens on 1 March in a common year. */
function yearlyOpening(w: SeasonWindow, year: number): string {
  if (w.window_start === "02-29" && !isLeapYear(year)) return `${year}-03-01`;
  return `${year}-${w.window_start}`;
}

/**
 * The opening day (`YYYY-MM-DD`) of the window occurrence containing `at`, read
 * on the UTC day, or `null` when `at` is outside every occurrence. A wrapping
 * yearly window seen in its January tail belongs to last year's opening.
 */
export function occurrenceOf(w: SeasonWindow, at: Date): string | null {
  if (!isInWindow(w, at)) return null;
  if (!w.repeats_yearly) return w.window_start;
  const year = at.getUTCFullYear();
  const wrapped = w.window_start > w.window_end;
  const inTail = wrapped && isoDay(at).slice(5) <= w.window_end;
  return yearlyOpening(w, inTail ? year - 1 : year);
}

/** Millisecond epoch bounds of the occurrence opening on `opening`: its first instant to its last day's last millisecond (UTC). */
export function occurrenceBounds(
  w: SeasonWindow,
  opening: string,
): { start: number; end: number } {
  const start = Date.parse(`${opening}T00:00:00.000Z`);
  if (!w.repeats_yearly) {
    return { start, end: Date.parse(`${w.window_end}T23:59:59.999Z`) };
  }
  const year =
    Number(opening.slice(0, 4)) + (w.window_end < w.window_start ? 1 : 0);
  const [month, day] = w.window_end.split("-").map(Number);
  // A 02-29 end closes on 02-28 in a common year, matching `isInWindow`.
  if (w.window_end === "02-29" && !isLeapYear(year)) {
    return { start, end: Date.UTC(year, 2, 1) - 1 };
  }
  return { start, end: Date.UTC(year, month - 1, day + 1) - 1 };
}
