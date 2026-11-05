import type { SkyPhase } from "@orakl/shared";
import type { SkyCue, SkySnapshot } from "./engine";
import type { EventSpec } from "./event";
import type { SkyStats } from "./loop";
import type { ModifierId } from "./modifiers";

/**
 * What `Birds.svelte` and the `?birds` panel drive, whether the sky runs on
 * the page (`BirdRunner`) or in a worker (`WorkerRunner`).
 */
export interface SkyDriver {
  /** Latest numbers for the panel; a worker's are a quarter-second old. */
  readonly stats: SkyStats;
  speed: number;
  resize(width: number, height: number): void;
  setPhase(phase: SkyPhase): void;
  /** Runs if birds are up, else waits for the next event. */
  resume(): void;
  stop(): void;
  /** Draws the current state once (a still frame under reduced motion). */
  draw(): void;
  setPaused(paused: boolean): void;
  setAuto(on: boolean): void;
  spawn(spec: EventSpec, mods?: ModifierId[]): void;
  clear(): void;
  /** The sky's wind for the current phase. */
  setWind(x: number, z: number): void;
  /** A nudge from the quiz: a reveal, the lobby's head count. */
  cue(cue: SkyCue): void;
  /** Seed, phase and what is up, for reproducing a sighting. */
  snapshot(): Promise<SkySnapshot>;
  dispose(): void;
}

/** Messages from the page to the sky worker. */
export type ToWorker =
  | {
      type: "init";
      canvas: OffscreenCanvas;
      /** Birds beyond the cloud layer draw here, behind the clouds. */
      far: OffscreenCanvas | null;
      seed: number;
      wind: [number, number];
      width: number;
      height: number;
      dpr: number;
      phase: SkyPhase;
      small: boolean;
    }
  | { type: "resize"; width: number; height: number; dpr: number }
  | { type: "phase"; phase: SkyPhase }
  | { type: "allowed"; allowed: boolean }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "draw" }
  | { type: "paused"; paused: boolean }
  | { type: "auto"; on: boolean }
  | { type: "speed"; speed: number }
  | { type: "spawn"; spec: EventSpec; mods?: ModifierId[] }
  | { type: "clear" }
  | { type: "wind"; x: number; z: number }
  | { type: "cue"; cue: SkyCue }
  | { type: "snapshot"; id: number };

/** Messages from the sky worker to the page. */
export type FromWorker =
  | { type: "stats"; stats: SkyStats }
  | { type: "snapshot"; id: number; snapshot: SkySnapshot };
