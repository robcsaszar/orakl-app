import {
  CLOUD_SETTINGS,
  type CloudMotion,
  type CloudPainter,
  type CloudSettings,
  type SkyCloud,
} from "@/lib/sky-clouds";
import { type Change, createHistory } from "@/lib/sky-history.svelte";

/**
 * What the cloud controls (`?clouds`) hold over the sky. The sky reads it only
 * while `active`, so a visitor without the panel gets the day's clouds.
 */
export const cloudLab = $state({
  /** True while the panel is mounted. */
  active: false,
  paused: false,
  /** Id of the one cloud being changed, or -1 for all of them. */
  editing: -1,
  /** Draws the cloud being changed without its paint. */
  bare: false,
  /** Shows each cloud's name under it in the sky. */
  tags: false,
  /** Wind along x in metres per second, or null for the day's. */
  wind: null as number | null,
  /** The day's seed, or null for today's. */
  daySeed: null as number | null,
  /** How many times faster than real the slow reshaping runs, to preview it. */
  rate: 1,
  /** The share of the view's height the clouds are kept in, from the top: 1, or less while the panel takes the bottom of a small screen. */
  skyShare: 1,
  settings: structuredClone(CLOUD_SETTINGS) as CloudSettings,
});

/** The sky's live parts, published by `Background` for the panel to read and steer. */
export const cloudStage = {
  /** The clouds as drawn. */
  clouds: [] as SkyCloud[],
  motion: null as CloudMotion | null,
  /** Ids of the clouds that can be seen now. */
  live: new Set<number>(),
  /** Each cloud's drifting element, by id. */
  els: new Map<number, HTMLElement>(),
  painters: new Map<number, CloudPainter>(),
  /** Paints one cloud now, or all of them. */
  repaint: (_id?: number) => {},
  /** The reshaping clock, in milliseconds of unpaused time. */
  clock: 0,
  /** Each runs after every paint, with the painted cloud's id. */
  painted: new Set<(id: number) => void>(),
};

/** Seconds one crossing takes for a cloud right now. */
const crossing = (c: SkyCloud) => c.dur / (cloudStage.motion?.pace ?? 1);

/** Where a cloud is along its crossing, 0 at entry and 1 at exit. */
export function cloudProgress(id: number): number {
  const c = cloudStage.clouds.find((x) => x.id === id);
  const t = cloudStage.els.get(id)?.getAnimations()[0]?.currentTime;
  if (!c || typeof t !== "number") return 0;
  const dur = crossing(c);
  return ((((t / 1000 - c.delay) % dur) + dur) % dur) / dur;
}

/** Puts a cloud at a fraction of its crossing; its pace and direction stay. */
export function setCloudProgress(id: number, p: number) {
  const c = cloudStage.clouds.find((x) => x.id === id);
  const anim = cloudStage.els.get(id)?.getAnimations()[0];
  if (!c || !anim) return;
  const dur = crossing(c);
  let t = c.delay + (((p % 1) + 1) % 1) * dur;
  while (t < 0) t += dur;
  anim.currentTime = t * 1000;
}

/**
 * The crossing fraction that puts a cloud's centre at viewport x. A crossing
 * runs from 110% of the cloud's own width off one side to 110% of the view
 * off the other.
 */
export function progressForCentre(id: number, x: number): number {
  const el = cloudStage.els.get(id);
  if (!el) return 0;
  const W = window.innerWidth;
  const w = el.offsetWidth;
  const travel = 1.1 * (W + w);
  const left = x - w / 2;
  return (cloudStage.motion?.dir ?? 1) > 0
    ? (left + 1.1 * w) / travel
    : (1.1 * W - left) / travel;
}

/** Centres a cloud on screen. */
export function showCloud(id: number) {
  setCloudProgress(id, progressForCentre(id, window.innerWidth / 2));
}

/** The edit record for a cloud, made on first use. */
export function cloudEdit(id: number) {
  const edits = cloudLab.settings.edits;
  if (!edits[id]) edits[id] = {};
  return edits[id];
}

/** The id the changes to every cloud's shared settings are kept under. */
export const ALL_CLOUDS = -1;

/** A cloud's edit, or the shared model for `ALL_CLOUDS`, as text to compare and restore. */
export function cloudSnapshot(id: number): string {
  return JSON.stringify(
    id === ALL_CLOUDS
      ? cloudLab.settings.model
      : (cloudLab.settings.edits[id] ?? {}),
  );
}

const history = createHistory(
  "orakl-cloud-lab-history",
  cloudSnapshot,
  (id, state) => {
    const value = JSON.parse(state);
    if (id === ALL_CLOUDS) cloudLab.settings.model = value;
    else if (Object.keys(value).length) cloudLab.settings.edits[id] = value;
    else delete cloudLab.settings.edits[id];
  },
);

export type CloudChange = Change;
/** Reads the kept history back in; call once the settings are loaded. */
export const loadCloudHistory = history.load;
/** Records a change just made to a cloud; `before` is its snapshot from before it. */
export const logCloudChange = history.log;
/** Moves a cloud to the state after change `index`, or to its start for -1. */
export const goToCloudChange = history.goTo;
export const undoCloud = history.undo;
export const redoCloud = history.redo;
/** Forgets a cloud's changes; the cloud stays as it is. */
export const clearCloudHistory = history.clear;
/** Forgets every cloud's changes. */
export const clearAllCloudHistory = history.clearAll;
/** The ids of the clouds that have changes; `ALL_CLOUDS` stands for the shared model. */
export const cloudHistoryIds = history.ids;
/** A cloud's changes, and which one it stands on (-1 for its start). */
export const cloudHistory = history.of;
