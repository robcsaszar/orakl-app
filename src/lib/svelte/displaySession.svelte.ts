/**
 * Deep, socket-free controller behind DisplayReceiver.svelte — mirrors
 * curatorPlaySession.svelte.ts's shape: owns the WS session lifecycle and the
 * `ServerMessage` routing table for the projector/display actor. The
 * component reads `state`; every side effect (socket, fetch) is injected so
 * this is testable with a fake session and no DOM.
 */

import {
  applyQuestionDisplay,
  compensateForLag,
  dispatchGameFrame,
  type GameFrameSink,
  sortPlayersByScore,
} from "@orakl/client-core";
import type {
  GameFinalScoresMessage,
  GameQuestionMessage,
  GameRoundResultMessage,
  Player,
  QuestionType,
  ServerMessage,
} from "@orakl/protocol";
import {
  createPlayerSession,
  type PlayerSession,
} from "@/lib/player-session.js";

export type DisplayView =
  | "waiting"
  | "loading"
  | "question"
  | "round-results"
  | "final";

export interface DisplaySessionOptions {
  /** Mock (dev fixture) mode — the socket is never opened; DisplayReceiver.svelte
   *  feeds curatorStore + URL params through {@link DisplaySession.applyMockState}. */
  mock: boolean;
  displayToken: string;
  /** Test seam: socket factory (defaults to the real WS-backed session). */
  createSession?: typeof createPlayerSession;
  fetchImpl?: typeof fetch;
}

/** Snapshot DisplayReceiver derives from curatorStore + URL params in mock mode. */
export interface MockDisplayState {
  view: DisplayView;
  question: GameQuestionMessage | null;
  timerDuration: number;
  answerRevealed: boolean;
  correctAnswerId: string;
  playerAnswerMap: Record<string, string>;
  answeredPlayerIds: Set<string>;
  players: Player[];
  postAnswerNote?: string;
  lobbyCode?: string;
}

export interface DisplaySession {
  readonly state: {
    currentView: DisplayView;
    questionType: QuestionType;
    currentQuestion: GameQuestionMessage | null;
    answers: { id: string; text: string }[];
    matchItems: { left: string[]; right: string[] } | null;
    timeRemaining: number;
    timerDuration: number;
    totalQuestions: number;
    currentQuestionIndex: number;
    correctAnswerId: string;
    playerAnswerMap: Record<string, string>;
    answerRevealed: boolean;
    /** The curator's explanation, withheld until the round-result message (map #912). */
    postAnswerNote?: string;
    players: Player[];
    answeredPlayerIds: Set<string>;
    sortedPlayers: Player[];
    roleSelectionActive: boolean;
    roleSelectionTimeRemaining: number;
    quizName: string;
    description: string;
    initError: string | null;
    isIntermission: boolean;
    lobbyEnded: boolean;
    lobbyCode: string | null;
  };
  /** Apply mock-mode state snapshot (curatorStore + URL params). No-op when not mock. */
  applyMockState(mock: MockDisplayState): void;
  /** Load current game state and open the socket. No-op in mock mode. */
  connect(): Promise<void>;
  destroy(): void;
}

/** Unverified read of `lobbyCode` from a signed token's payload segment. */
function lobbyCodeFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[0] ?? "";
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(b64)) as { lobbyCode?: unknown };
    return typeof parsed.lobbyCode === "string" ? parsed.lobbyCode : null;
  } catch {
    return null;
  }
}

export function createDisplaySession(
  options: DisplaySessionOptions,
): DisplaySession {
  const {
    mock,
    displayToken,
    createSession = createPlayerSession,
    fetchImpl = fetch,
  } = options;

  const state = $state<DisplaySession["state"]>({
    currentView: "waiting",
    questionType: "text_choice",
    currentQuestion: null,
    answers: [],
    matchItems: null,
    timeRemaining: 0,
    timerDuration: 30,
    totalQuestions: 10,
    currentQuestionIndex: 0,
    correctAnswerId: "",
    playerAnswerMap: {},
    answerRevealed: false,
    postAnswerNote: undefined,
    players: [],
    answeredPlayerIds: new Set<string>(),
    sortedPlayers: [],
    roleSelectionActive: false,
    roleSelectionTimeRemaining: 0,
    quizName: "",
    description: "",
    initError: null,
    isIntermission: false,
    lobbyEnded: false,
    lobbyCode: mock ? null : lobbyCodeFromToken(displayToken),
  });

  let session: PlayerSession | null = null;

  function updateSortedPlayers() {
    state.sortedPlayers = sortPlayersByScore(state.players);
  }

  function showQuestion(msg: GameQuestionMessage) {
    state.currentView = "question";
    state.isIntermission = false;
    state.currentQuestion = msg;
    // applyQuestionDisplay mutates a context-like object; adapt it
    const ctx = {
      questionType: "text_choice" as QuestionType,
      answers: [] as { id: string; text: string }[],
      matchItems: null as { left: string[]; right: string[] } | null,
      currentQuestionIndex: 0,
      totalQuestions: 0,
    };
    applyQuestionDisplay(ctx, msg);
    state.questionType = ctx.questionType;
    state.answers = ctx.answers;
    state.matchItems = ctx.matchItems;
    state.currentQuestionIndex = ctx.currentQuestionIndex;
    state.answeredPlayerIds = new Set();
    state.timeRemaining = compensateForLag(msg.timeRemaining, msg.serverTs);
    state.answerRevealed = false;
    state.correctAnswerId = "";
    state.postAnswerNote = undefined;
  }

  function showRoundResult(msg: GameRoundResultMessage) {
    state.correctAnswerId = msg.correctAnswerId;
    state.playerAnswerMap = msg.playerAnswers || {};
    state.answerRevealed = true;
    state.postAnswerNote = msg.postAnswerNote;
    state.players = msg.players;
    updateSortedPlayers();
  }

  function showFinalScores(msg: GameFinalScoresMessage) {
    state.players = msg.players;
    updateSortedPlayers();
    state.currentView = "final";
  }

  const sink: GameFrameSink = {
    onGameStart(msg) {
      state.timerDuration = msg.timerDuration;
      state.totalQuestions = msg.totalQuestions;
    },
    onLobbyUpdate(msg) {
      state.players = [...(msg.players || [])];
      // Curator's live "Update quiz" edit — only carried when the server sent
      // meta, so a frame without it can't clobber the waiting view's title.
      if (msg.quizName !== undefined) {
        state.quizName = msg.quizName;
        // A cleared description arrives as an absent key.
        state.description = msg.description ?? "";
      }
    },
    onLobbyReset() {
      state.currentView = "waiting";
      state.currentQuestion = null;
    },
    onQuestion(msg) {
      showQuestion(msg);
    },
    onTick(msg) {
      // Ignore ticks while paused so the frozen timer doesn't keep counting.
      if (state.isIntermission) return;
      state.timeRemaining = compensateForLag(msg.timeRemaining, msg.serverTs);
    },
    onIntermission() {
      state.isIntermission = true;
    },
    onResume() {
      state.isIntermission = false;
    },
    onLobbyEnded() {
      // Terminal: tear down the socket so it stops reconnecting into a dead
      // lobby, and show an ended notice instead of a frozen last frame.
      state.lobbyEnded = true;
      session?.destroy();
      session = null;
    },
    onPlayerAnswered(msg) {
      state.answeredPlayerIds = new Set([
        ...state.answeredPlayerIds,
        msg.playerId,
      ]);
    },
    onRoundResult(msg) {
      showRoundResult(msg);
    },
    onFinalScores(msg) {
      showFinalScores(msg);
    },
    onRoleSelectionStart(msg) {
      state.roleSelectionActive = true;
      state.roleSelectionTimeRemaining = msg.timeRemaining;
      state.players = msg.players;
    },
    onRoleSelectionUpdate(msg) {
      state.roleSelectionTimeRemaining = msg.timeRemaining;
      state.players = msg.players;
    },
    onRoleSelectionLocked(msg) {
      state.roleSelectionActive = false;
      state.players = msg.players;
    },
    onPlayerRemoved(msg) {
      state.players = state.players.filter((p) => p.id !== msg.playerId);
      updateSortedPlayers();
    },
  };

  function handleMessage(msg: ServerMessage) {
    dispatchGameFrame(msg, sink);
  }

  function connectGameSocket(token: string) {
    session?.destroy();
    // The projector is cross-device with no cookie → first-frame token auth.
    // The lobby code rides the upgrade URL so a non-owner machine can
    // fly-replay the socket before the handshake (ADR 0024); the server still
    // verifies the token itself.
    session = createSession(
      { onMessage: (msg) => handleMessage(msg as ServerMessage) },
      { getAuthToken: () => token, lobbyCode: () => lobbyCodeFromToken(token) },
    );
    session.connect();
  }

  return {
    state,

    async connect() {
      if (mock) return; // layout seeds curatorStore; no API/SSE needed

      if (!displayToken) {
        state.initError = "No display token provided";
        return;
      }

      try {
        const res = await fetchImpl("/api/game", {
          headers: { Authorization: `Bearer ${displayToken}` },
        });
        if (!res.ok) {
          state.initError = "Unable to connect to the game";
          return;
        }
        const data = await res.json();

        if (data.active) {
          state.players = data.players || [];
          state.quizName = data.quizName || "";
          state.description = data.description || "";

          if (data.phase === "final_scores") {
            state.currentView = "final";
            updateSortedPlayers();
          } else {
            state.currentView = "loading";
          }
        }

        connectGameSocket(displayToken);
      } catch {
        state.initError = "Unable to connect to the game";
      }
    },

    applyMockState(mock: MockDisplayState) {
      state.currentView = mock.view;
      if (mock.question && mock.view === "question") {
        showQuestion(mock.question);
        state.timerDuration = mock.timerDuration;
      }
      state.answerRevealed = mock.answerRevealed;
      state.correctAnswerId = mock.correctAnswerId;
      state.postAnswerNote = mock.postAnswerNote;
      state.playerAnswerMap = mock.playerAnswerMap;
      state.answeredPlayerIds = mock.answeredPlayerIds;
      state.players = mock.players;
      if (mock.lobbyCode !== undefined) state.lobbyCode = mock.lobbyCode;
      updateSortedPlayers();
    },

    destroy() {
      session?.destroy();
      session = null;
    },
  };
}
