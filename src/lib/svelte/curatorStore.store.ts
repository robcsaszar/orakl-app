import { compensateForLag } from "@orakl/client-core";
import { writable } from "svelte/store";
import type { CuratorPlayer, CuratorQuestion } from "../types/game.types.js";

export type { CuratorPlayer, CuratorQuestion };

export type CuratorView =
  | "lobby"
  | "question"
  | "round-results"
  | "final-results";

export type CuratorStore = {
  players: CuratorPlayer[];
  answeredPlayerIds: Set<string>;
  currentView: CuratorView;
  currentQuestion: CuratorQuestion | null;
  timeRemaining: number;
  timerDuration: number;
  correctAnswerId: string;
  playerAnswerMap: Record<string, string>;
};

// Non-reactive ref for PresentationConnection (non-serialisable browser object)
let _castConnection: PresentationConnection | null = null;

export function getCastConnection(): PresentationConnection | null {
  return _castConnection;
}

export function setCastConnection(
  connection: PresentationConnection | null,
): void {
  _castConnection = connection;
}

export function sendToDisplay(message: Record<string, unknown>): void {
  if (_castConnection && _castConnection.state === "connected") {
    try {
      _castConnection.send(JSON.stringify(message));
    } catch {
      // silently fail — display may have disconnected
    }
  }
}

// Pure TS factory — no Svelte-reactive deps, safe to import in Vitest
export function createCuratorStore(): CuratorStore {
  return {
    players: [],
    answeredPlayerIds: new Set<string>(),
    currentView: "lobby",
    currentQuestion: null,
    timeRemaining: 0,
    timerDuration: 30,
    correctAnswerId: "",
    playerAnswerMap: {},
  };
}

// Named action functions — pure, return new state

export function setPlayers(
  s: CuratorStore,
  players: CuratorPlayer[],
): CuratorStore {
  return {
    ...s,
    players: players.map((p) => ({
      ...p,
      hasAnswered: p.hasAnswered || false,
      score: p.score || 0,
    })),
  };
}

export function setQuestion(
  s: CuratorStore,
  question: CuratorQuestion,
  timerDuration: number,
): CuratorStore {
  return {
    ...s,
    currentQuestion: question,
    timeRemaining: timerDuration,
    timerDuration,
    correctAnswerId: "",
    playerAnswerMap: {},
    answeredPlayerIds: new Set<string>(),
    players: s.players.map((p) => ({ ...p, hasAnswered: false })),
  };
}

export function updateTimer(
  s: CuratorStore,
  time: number,
  serverTs?: number,
): CuratorStore {
  if (serverTs !== undefined) {
    return {
      ...s,
      timeRemaining: compensateForLag(time, serverTs),
    };
  }
  return { ...s, timeRemaining: time };
}

export function setRoundResult(
  s: CuratorStore,
  correctAnswerId: string,
  playerAnswers: Record<string, string>,
  players: CuratorPlayer[],
): CuratorStore {
  const next = setPlayers(s, players);
  return { ...next, correctAnswerId, playerAnswerMap: playerAnswers };
}

export function markPlayerAnswered(
  s: CuratorStore,
  playerId: string,
): CuratorStore {
  const answeredPlayerIds = new Set(s.answeredPlayerIds);
  answeredPlayerIds.add(playerId);
  return {
    ...s,
    answeredPlayerIds,
    players: s.players.map((p) =>
      p.id === playerId ? { ...p, hasAnswered: true } : p,
    ),
  };
}

export function updatePlayerScores(
  s: CuratorStore,
  scores: Array<{ playerId: string; score: number }>,
): CuratorStore {
  const scoreMap = new Map(
    scores.map(({ playerId, score }) => [playerId, score]),
  );
  return {
    ...s,
    players: s.players.map((p) =>
      scoreMap.has(p.id) ? { ...p, score: scoreMap.get(p.id) ?? p.score } : p,
    ),
  };
}

export function setView(s: CuratorStore, view: CuratorView): CuratorStore {
  return { ...s, currentView: view };
}

export function resetAnswers(s: CuratorStore): CuratorStore {
  return {
    ...s,
    answeredPlayerIds: new Set<string>(),
    players: s.players.map((p) => ({ ...p, hasAnswered: false })),
  };
}

// Svelte writable singleton — shared across islands on the same page
export const curatorStore = writable(createCuratorStore());
