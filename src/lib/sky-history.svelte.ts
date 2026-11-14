/** One change, and the thing as it stood after it. */
export interface Change {
  label: string;
  /** When, in ms since the epoch. */
  at: number;
  state: string;
}

/** A thing's changes in order, from the state it started in. `at` points at the change it stands on, -1 for the start. */
interface Timeline {
  base: string;
  changes: Change[];
  at: number;
}

const HISTORY_CAP = 60;
/** Changes with the same label this close together are one change: a slider dragged, not forty steps. */
const MERGE_MS = 1500;
/** How long after the last change the history is written to storage, ms. */
const WRITE_AFTER_MS = 400;

/**
 * Undo history for things known by a numeric id, kept in localStorage under
 * `store`. `snapshot` gives a thing as text to compare and restore; `restore`
 * puts that text back.
 */
export function createHistory(
  store: string,
  snapshot: (id: number) => string,
  restore: (id: number, state: string) => void,
) {
  const timelines = new Map<number, Timeline>();
  const version = $state({ n: 0 });

  let pending: ReturnType<typeof setTimeout> | undefined;

  /** Writes the history out now, if a write is waiting. */
  function flush() {
    if (pending === undefined) return;
    clearTimeout(pending);
    pending = undefined;
    try {
      localStorage.setItem(store, JSON.stringify([...timelines]));
    } catch {
      // storage full or blocked: the history lasts for this visit
    }
  }

  // A dragged slider logs many times a second, and the history is large: it is written once the hand rests.
  function persist() {
    version.n++;
    clearTimeout(pending);
    pending = setTimeout(flush, WRITE_AFTER_MS);
  }

  /** Moves a thing to the state after change `index`, or to its start for -1. */
  function goTo(id: number, index: number) {
    const t = timelines.get(id);
    if (!t || index < -1 || index >= t.changes.length) return;
    t.at = index;
    restore(id, index < 0 ? t.base : (t.changes[index] as Change).state);
    persist();
  }

  return {
    snapshot,
    goTo,
    flush,
    /** Reads the kept history back in; call once the things themselves are loaded. */
    load() {
      flush();
      timelines.clear();
      try {
        for (const [id, timeline] of JSON.parse(
          localStorage.getItem(store) ?? "[]",
        ) as [number, Timeline][]) {
          // A timeline only holds if the thing still stands where it says.
          const now =
            timeline.at < 0
              ? timeline.base
              : timeline.changes[timeline.at]?.state;
          if (now === snapshot(id)) timelines.set(id, timeline);
        }
      } catch {
        // nothing kept, or not readable
      }
      version.n++;
    },
    /**
     * Records a change that has just been made: `before` is the snapshot from
     * before it. Changes that were undone past are dropped, as in any undo
     * history.
     */
    log(id: number, label: string, before: string) {
      const state = snapshot(id);
      if (state === before) return;
      const t = timelines.get(id) ?? { base: before, changes: [], at: -1 };
      timelines.set(id, t);
      t.changes.length = t.at + 1;
      const last = t.changes[t.at];
      const now = Date.now();
      if (last && last.label === label && now - last.at < MERGE_MS) {
        last.state = state;
        last.at = now;
        // A change taken straight back (a slider dragged out and home again) is no change.
        const prior = t.at > 0 ? (t.changes[t.at - 1] as Change).state : t.base;
        if (state === prior) {
          t.changes.pop();
          t.at--;
        }
      } else {
        t.changes.push({ label, at: now, state });
        if (t.changes.length > HISTORY_CAP)
          t.base = (t.changes.shift() as Change).state;
        t.at = t.changes.length - 1;
      }
      persist();
    },
    undo: (id: number) => goTo(id, (timelines.get(id)?.at ?? -1) - 1),
    redo: (id: number) => goTo(id, (timelines.get(id)?.at ?? -1) + 1),
    /** Forgets one thing's changes; the thing stays as it is. */
    clear(id: number) {
      timelines.delete(id);
      persist();
    },
    /** Forgets every change. */
    clearAll() {
      timelines.clear();
      persist();
    },
    /** The ids of the things that have changes. */
    ids(): number[] {
      void version.n;
      return [...timelines.keys()];
    },
    /** A thing's changes, and which one it stands on (-1 for its start). */
    of(id: number): { changes: readonly Change[]; at: number } {
      void version.n;
      const t = timelines.get(id);
      return { changes: t?.changes ?? [], at: t?.at ?? -1 };
    },
  };
}
