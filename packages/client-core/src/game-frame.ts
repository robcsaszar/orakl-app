/**
 * One frame dispatcher for all three actors (player, curator, display).
 * Pure — no Svelte imports. Each actor's session module supplies a
 * `GameFrameSink` (the subset of callbacks it cares about) and calls
 * `dispatchGameFrame` from its socket's `onMessage`, instead of hand-rolling
 * an if/else chain over `msg.type` per actor.
 */

import type {
  GameErrorMessage,
  GameFinalScoresMessage,
  GameIntermissionMessage,
  GamePingMessage,
  GameQuestionMessage,
  GameResultsReadyMessage,
  GameResumeMessage,
  GameRoundResultMessage,
  GameStartMessage,
  GameTickMessage,
  JoinAcceptedMessage,
  JoinRejectedMessage,
  LobbyEndedMessage,
  LobbyResetMessage,
  LobbyUpdateMessage,
  PlayerAnsweredMessage,
  PlayerEmoteBroadcastMessage,
  PlayerNicknameChangedMessage,
  PlayerRateAckMessage,
  PlayerRemovedMessage,
  RoleSelectionLockedMessage,
  RoleSelectionStartMessage,
  RoleSelectionUpdateMessage,
  ServerMessage,
} from "@orakl/protocol";
/** One optional callback per `ServerMessage` variant. A consumer implements
 *  only the rows it needs — everything else silently no-ops. */
export interface GameFrameSink {
  onJoinAccepted?(msg: JoinAcceptedMessage): void;
  onJoinRejected?(msg: JoinRejectedMessage): void;
  onLobbyUpdate?(msg: LobbyUpdateMessage): void;
  onLobbyEnded?(msg: LobbyEndedMessage): void;
  onLobbyReset?(msg: LobbyResetMessage): void;
  onPlayerNicknameChanged?(msg: PlayerNicknameChangedMessage): void;
  onGameStart?(msg: GameStartMessage): void;
  onQuestion?(msg: GameQuestionMessage): void;
  onTick?(msg: GameTickMessage): void;
  onPlayerAnswered?(msg: PlayerAnsweredMessage): void;
  onRoundResult?(msg: GameRoundResultMessage): void;
  onFinalScores?(msg: GameFinalScoresMessage): void;
  onResultsReady?(msg: GameResultsReadyMessage): void;
  onRoleSelectionStart?(msg: RoleSelectionStartMessage): void;
  onRoleSelectionUpdate?(msg: RoleSelectionUpdateMessage): void;
  onRoleSelectionLocked?(msg: RoleSelectionLockedMessage): void;
  onPlayerRemoved?(msg: PlayerRemovedMessage): void;
  onIntermission?(msg: GameIntermissionMessage): void;
  onResume?(msg: GameResumeMessage): void;
  onPlayerEmote?(msg: PlayerEmoteBroadcastMessage): void;
  onGameError?(msg: GameErrorMessage): void;
  onPing?(msg: GamePingMessage): void;
  onRateAck?(msg: PlayerRateAckMessage): void;
}

/**
 * Single exhaustive switch on `msg.type`, routing to the matching optional
 * sink callback. Actor-specific behaviour lives in each actor's sink, not
 * here — the dispatcher stays actor-agnostic.
 */
export function dispatchGameFrame(
  msg: ServerMessage,
  sink: GameFrameSink,
): void {
  switch (msg.type) {
    case "join:accepted":
      sink.onJoinAccepted?.(msg);
      break;
    case "join:rejected":
      sink.onJoinRejected?.(msg);
      break;
    case "lobby:update":
      sink.onLobbyUpdate?.(msg);
      break;
    case "lobby:ended":
      sink.onLobbyEnded?.(msg);
      break;
    case "lobby:reset":
      sink.onLobbyReset?.(msg);
      break;
    case "player:nickname_changed":
      sink.onPlayerNicknameChanged?.(msg);
      break;
    case "game:start":
      sink.onGameStart?.(msg);
      break;
    case "game:question":
      sink.onQuestion?.(msg);
      break;
    case "game:tick":
      sink.onTick?.(msg);
      break;
    case "player:answered":
      sink.onPlayerAnswered?.(msg);
      break;
    case "game:round-result":
      sink.onRoundResult?.(msg);
      break;
    case "game:final-scores":
      sink.onFinalScores?.(msg);
      break;
    case "game:results-ready":
      sink.onResultsReady?.(msg);
      break;
    case "role:selection-start":
      sink.onRoleSelectionStart?.(msg);
      break;
    case "role:selection-update":
      sink.onRoleSelectionUpdate?.(msg);
      break;
    case "role:selection-locked":
      sink.onRoleSelectionLocked?.(msg);
      break;
    case "player:removed":
      sink.onPlayerRemoved?.(msg);
      break;
    case "game:intermission":
      sink.onIntermission?.(msg);
      break;
    case "game:resume":
      sink.onResume?.(msg);
      break;
    case "player:emote":
      sink.onPlayerEmote?.(msg);
      break;
    case "game:error":
      sink.onGameError?.(msg);
      break;
    case "game:ping":
      sink.onPing?.(msg);
      break;
    case "player:rate-ack":
      sink.onRateAck?.(msg);
      break;
    default: {
      const _exhaustive: never = msg;
      void _exhaustive;
    }
  }
}
