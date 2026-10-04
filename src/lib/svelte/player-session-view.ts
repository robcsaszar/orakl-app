import type {
  AvatarGroup,
  BadgeAward,
  BadgeRunParams,
  DbAvatar,
} from "@orakl/shared";
/**
 * PlayerSessionView (ADR 0010) — the exact surface the `(game)/quiz` route
 * tree, the mimic layout, and QuizAvatarDialog consume off a player session.
 * `QuizSession` (real, WebSocket-backed) and `MockQuizSession` (dev fixture) both
 * `implements PlayerSessionView`, so the compiler — not a runtime cast —
 * enforces that the mock can never drift from the real session's public
 * shape. Built from an audit of every `session.*` access in those consumers;
 * internals (deviceId, profileAvatarId, avatarSrcMap, private methods) are
 * deliberately excluded. `isLoggedIn` is the one exception — the question-
 * flagging FAB (quiz/play/+page.svelte) needs it to hide itself for
 * anonymous players (ADR 0020).
 */

import type {
  CuratorStartMessage,
  GameAnswerRecord,
  QuestionRating,
  StreakFlourish,
} from "@orakl/protocol";
import type { Membership, ServerPhase } from "@orakl/shared";
import type { AdvanceMode } from "../../../data/game.settings.js";
import type { RatingState } from "../question-rating-state.js";
import type { GameQuestion } from "../types/game.types.js";

export interface PlayerData {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  status: "pending" | "active" | "disconnected";
  role?: "player" | "observer";
  /** True only for the curator's own row (playing curator, ADR 0019). */
  isCurator?: true;
}

export type FeedbackStatus =
  | "none"
  | "pending"
  | "correct"
  | "incorrect"
  | "timeout";

export interface PlayerSessionView {
  // ── Identity ──
  nickname: string;
  lobbyCode: string;
  selectedAvatarId: string;
  playerId: string | null;
  isDisconnected: boolean;
  wasRemoved: boolean;
  /** The curator closed the lobby (`lobby:ended`). */
  lobbyClosed: boolean;
  /** `lobby:reset` arrived ("New quiz" or "Reset to setup"); the curator is
   *  editing the next quiz. Cleared on `game:start`. */
  curatorEditing: boolean;
  /** Terminal connection failure: socket gave up reconnecting; route to /join. */
  connectionLost: boolean;
  /** Curator's own row, one level up from a normal player (ADR 0019 route
   *  unification) — same journey, same routes, plus the curator toolbox. */
  isCurator: boolean;
  /** Non-anonymous account (any role above "anonymous") — gates the question-
   *  flag FAB (ADR 0020), which only a logged-in identity can submit under. */
  isLoggedIn: boolean;

  // ── Question rating ──
  /** Rating of the current question at the reveal; reset when a question arrives. */
  rating: RatingState;
  /** Signed-in players who played the round, and the curator, may rate at the reveal. */
  canRate: boolean;
  /** Rates the current question; one rating in flight, a later tap waits for its ack. */
  rate(rating: QuestionRating): void;

  // ── Server-authoritative routing axes ──
  membership: Membership;
  phase: ServerPhase | null;
  /** Round result overlay sits on /quiz/play (phase stays "playing"). */
  showingResult: boolean;

  // ── Quiz meta ──
  quizName: string;
  description: string;
  lobbyCategories: string[];
  lobbyDifficulty: string | null;
  error: string;
  isJoining: boolean;
  isReconnecting: boolean;
  /** Curator pressed start; cleared by `game:start` or a `game:error`. */
  isStarting: boolean;

  // ── Lobby access ──
  lobbyAccessMode: "open" | "invite-only";
  lobbyMaxPlayers: number | null;

  // ── Players ──
  players: PlayerData[];
  sortedPlayers: PlayerData[];
  playerById: Map<string, PlayerData>;
  /** Roster as it stood at game end (roles included); results renders this. */
  finalRoster: PlayerData[];

  // ── Badges (own honours only) ──
  myBadges: BadgeAward[];
  /** Completed questions and the planned count when the curator stopped the game; null otherwise. */
  stoppedAfter: { served: number; planned: number } | null;
  badgeRun: BadgeRunParams | null;
  /** Own per-question answer log, delivered the same way as badges; null
   *  until the final-scores frame arrives with it. */
  myBreakdown: GameAnswerRecord[] | null;
  /** Bumped when `game:results-ready` arrives, so a results page can
   *  invalidateAll to pick up row-dependent state once it exists. */
  resultsReadyCount: number;

  // ── Streak (own only; mirrors solo's StreakIndicator — see quizSession's
  //    showRoundResult) ──
  streak: number;
  streakFlourish: StreakFlourish | null;
  streakNonce: number;

  // ── Role ──
  isObserver: boolean;
  selectedRole: "player" | "observer";
  roleSelectionTimeRemaining: number;
  roleSelectionLocked: boolean;
  roleSubmitted: boolean;

  // ── Avatars ──
  dbAvatars: DbAvatar[];
  avatarGroups: AvatarGroup[];

  // ── Avatar dialog ──
  avatarPickerOpen: boolean;
  dialogAvatarId: string;
  dialogAvatarSrc: string;
  dialogAvatarTitle: string;
  dialogAvatarDesc: string;
  saveToProfile: boolean;
  /** Stored and profile avatar have been read; auto-rally may run. */
  identityReady: boolean;
  showSaveToProfileCheckbox: boolean;

  // ── Question UI (currentQuestion/timeRemaining/correctAnswerId folded in
  //    from the retired gameStore — one reactive home per session) ──
  questionType: string;
  answers: { id: string; text: string }[];
  matchItems: { left: string[]; right: string[] } | null;
  selectedLeftItem: string | null;
  selectedRightItem: string | null;
  timerDuration: number;
  advanceMode: AdvanceMode;
  answered: boolean;
  selectedAnswerId: string | null;
  feedbackStatus: FeedbackStatus;
  nextQuestionCountdown: number;
  /** Seconds the between-question ring counts, from the advance mode; 0 when manual. */
  nextQuestionCountdownTotal: number;
  playerAnswers: Record<string, string>;
  isIntermission: boolean;
  answeredCount: number;
  totalToAnswer: number;
  /** Per-player answered status for this question — toolbox roster only
   *  (only ever populated for a curator connection). */
  answeredPlayerIds: Set<string>;
  lastPointsEarned: number;
  currentQuestion: GameQuestion | null;
  timeRemaining: number;
  correctAnswerId: string;
  postAnswerNote: string | undefined;

  // ── Emotes ──
  emotesEnabled: boolean;
  pickedEmotes: string[];
  activeEmotes: {
    uid: string;
    playerId: string;
    emoteId: string;
    offsetX: number;
    offsetY: number;
  }[];

  // ── Derived ──
  hasStoredData: boolean;
  /** Drives the layout's navigation effect; changes only on phase/membership. */
  routeKey: string;

  // ── Lifecycle ──
  init(opts: {
    isLoggedIn: boolean;
    profileAvatarId: string;
    playerId?: string | null;
    isCurator?: boolean;
    curatorNickname?: string;
    curatorAvatarId?: string;
  }): Promise<void>;
  /** Lightweight init for the standalone /join (code-entry) page. */
  initCodeEntry(): Promise<void>;
  destroy(): void;
  seedLobbyRoster(data: {
    playerId?: string | null;
    players?: PlayerData[];
    accessMode?: "open" | "invite-only";
    maxPlayers?: number | null;
  }): void;
  applyStateMessages(msgs: ReadonlyArray<Record<string, unknown>>): void;
  /** Pre-join lobby watch — polls /api/lobby so quiz meta stays live. */
  connectStatusStream(): void;

  // ── Actions ──
  validateCode(): Promise<boolean>;
  validateNickname(nick: string): string | null;
  clearStoredData(): void;
  /** Leave the lobby or running quiz; on success forget the seat and drop to code-entry. */
  leaveLobby(): Promise<void>;
  connect(nicknameArg: string): Promise<void>;
  selectAnswer(answerId: string): void;
  selectMatchItem(column: "left" | "right", item: string): void;
  sendEmote(emoteId: string, offsetX: number, offsetY: number): void;
  submitRoleChoice(): void;
  saveNickname(newNick: string): Promise<string | null>;
  getAvatarSrc(avatarId: string): string;
  getMyScore(): number;

  // ── Curator-only actions (ADR 0019 route unification) — only ever invoked
  //    by the curator toolbox, which only renders when isCurator is true. ──
  startGame(config: Omit<CuratorStartMessage, "type">): void;
  advanceToNextQuestion(): void;
  pauseGame(): void;
  resumeGame(): void;
  approvePlayer(playerId: string): void;
  rejectPendingPlayer(playerId: string): void;
  removePlayer(playerId: string): void;
  removePlayerAndBlock(playerId: string): void;
  startRoleSelection(): void;
  /** Toolbox "Stop playing" shortcut (final scores only). */
  stopPlaying(): void;
  stopGame(): void;
  /** Same server operation as "New quiz" with role selection off: game
   *  dropped, players keep their seat at score 0, lobby and code kept. */
  resetToSetup(): void;
  closeLobby(): Promise<void>;

  // ── Avatar dialog actions ──
  openAvatarSelector(): void;
  closeAvatarSelector(): void;
  previewAvatar(av: {
    id: string;
    title: string;
    description: string;
    src: string;
  }): void;
  confirmAvatar(): Promise<void>;
}
