import { selectMatchItem as selectMatchItemHelper } from "@orakl/client-core";
import type { GameAnswerRecord, StreakFlourish } from "@orakl/protocol";
import type {
  AvatarGroup,
  BadgeAward,
  BadgeRunParams,
  DbAvatar,
  Membership,
  ServerPhase,
} from "@orakl/shared";
import { findPlayer, avatars as staticAvatars } from "@orakl/shared";
import { type AdvanceMode, GAME } from "../../../data/game.settings.js";
import { MOCK_AVATAR_ID } from "../mock/fixtures.js";
import type { GameQuestion } from "../types/game.types.js";
import type {
  FeedbackStatus,
  PlayerData,
  PlayerSessionView,
} from "./player-session-view.js";

/** Dev-only mock session (ADR 0010). `implements PlayerSessionView` — the
 *  compiler, not a runtime cast, keeps this in lockstep with QuizSession's
 *  public surface. No SSE, no navigation. */
export class MockQuizSession implements PlayerSessionView {
  // ── Identity ──
  nickname = $state("Dev Player");
  lobbyCode = $state("dev");
  selectedAvatarId = $state(MOCK_AVATAR_ID);
  playerId = $state<string | null>("mock-player-1");
  isDisconnected = $state(false);
  wasRemoved = $state(false);
  lobbyClosed = $state(false);
  curatorEditing = $state(false);
  connectionLost = $state(false);
  isCurator = $state(false);
  // Demo default: logged-in, so the question-flag FAB is visible in mimic mode.
  isLoggedIn = $state(true);

  // ── Routing (no navigation effect in mock) ──
  membership = $state<Membership>("active");
  phase = $state<ServerPhase | null>("playing");
  showingResult = $state(false);

  // ── Quiz meta ──
  quizName = $state("Dev Fixture Quiz");
  description = $state("A mock session driven by URL params.");
  lobbyCategories = $state<string[]>(["science", "history"]);
  lobbyDifficulty = $state<string | null>(null);
  error = $state("");
  isJoining = $state(false);
  isReconnecting = $state(false);
  isStarting = $state(false);

  // ── Lobby access ──
  lobbyAccessMode = $state<"open" | "invite-only">("open");
  lobbyMaxPlayers = $state<number | null>(null);

  // ── Players ──
  players = $state<PlayerData[]>([]);
  sortedPlayers = $derived([...this.players].sort((a, b) => b.score - a.score));
  playerById = $derived(new Map(this.players.map((p) => [p.id, p])));
  finalRoster = $state<PlayerData[]>([]);

  // ── Badges (unused in mock; fields satisfy PlayerSessionView) ──
  myBadges = $state<BadgeAward[]>([]);
  stoppedAfter = $state<{ served: number; planned: number } | null>(null);
  badgeRun = $state<BadgeRunParams | null>(null);
  myBreakdown = $state<GameAnswerRecord[] | null>(null);
  resultsReadyCount = $state(0);

  // ── Streak (own only; mimic's quiz layout seeds these from URL params) ──
  streak = $state(0);
  streakFlourish = $state<StreakFlourish | null>(null);
  streakNonce = $state(0);

  // ── Role ──
  isObserver = $state(false);
  selectedRole = $state<"player" | "observer">("player");
  roleSelectionTimeRemaining = $state(20);
  roleSelectionLocked = $state(false);
  roleSubmitted = $state(false);

  // ── Avatars ──
  dbAvatars = $state<DbAvatar[]>([]);
  avatarGroups = $state<AvatarGroup[]>([]);

  // ── Avatar dialog ──
  avatarPickerOpen = $state(false);
  dialogAvatarId = $state("");
  dialogAvatarSrc = $state("");
  dialogAvatarTitle = $state("");
  dialogAvatarDesc = $state("");
  saveToProfile = $state(false);
  identityReady = $state(true);
  showSaveToProfileCheckbox = $state(false);

  // ── Question UI (currentQuestion/timeRemaining/correctAnswerId folded in
  //    from the retired gameStore — the mimic layout writes these directly) ──
  currentQuestion = $state<GameQuestion | null>(null);
  timeRemaining = $state(0);
  correctAnswerId = $state("");
  postAnswerNote = $state<string | undefined>(undefined);
  questionType = $state("text_choice");
  answers = $state<{ id: string; text: string }[]>([]);
  matchItems = $state<{ left: string[]; right: string[] } | null>(null);
  selectedLeftItem = $state<string | null>(null);
  selectedRightItem = $state<string | null>(null);
  timerDuration = $state(20);
  advanceMode = $state<AdvanceMode>("auto_5");
  answered = $state(false);
  selectedAnswerId = $state<string | null>(null);
  feedbackStatus = $state<FeedbackStatus>("none");
  nextQuestionCountdown = $state(0);
  nextQuestionCountdownTotal = $derived(
    this.advanceMode === "manual"
      ? 0
      : GAME.roundConfig.autoAdvanceMsMap[this.advanceMode] / 1000,
  );
  playerAnswers = $state<Record<string, string>>({});
  isIntermission = $state(false);
  answeredCount = $state(0);
  totalToAnswer = $state(0);
  answeredPlayerIds = $state<Set<string>>(new Set());
  lastPointsEarned = $state(0);

  // ── Emotes (seeded by the mimic/quiz layout via the `emotes` param) ──
  emotesEnabled = $state(false);
  pickedEmotes = $state<string[]>([]);
  activeEmotes = $state<
    {
      uid: string;
      playerId: string;
      emoteId: string;
      offsetX: number;
      offsetY: number;
    }[]
  >([]);

  /** Floats locally, no server round trip — mirrors QuizSession's optimistic add. */
  sendEmote(emoteId: string, offsetX: number, offsetY: number): void {
    if (!this.answered || !this.playerId) return;
    const uid = Math.random().toString(36).slice(2);
    this.activeEmotes = [
      ...this.activeEmotes,
      { uid, playerId: this.playerId, emoteId, offsetX, offsetY },
    ];
    setTimeout(() => {
      this.activeEmotes = this.activeEmotes.filter((e) => e.uid !== uid);
    }, 1600);
  }

  // ── Derived ──
  hasStoredData = $derived(!!this.nickname && !!this.playerId);
  routeKey = $derived(`${this.membership}:${this.phase ?? "none"}`);

  getAvatarSrc(avatarId: string): string {
    return staticAvatars.find((a) => a.id === avatarId)?.src ?? "";
  }

  getMyScore(): number {
    return findPlayer(this.players, this.playerId)?.score ?? 0;
  }

  selectAnswer(answerId: string) {
    if (this.answered || this.isObserver) return;
    this.answered = true;
    this.selectedAnswerId = answerId;
    this.feedbackStatus = "pending";
  }

  selectMatchItem(column: "left" | "right", item: string) {
    if (this.answered || this.isObserver) return;
    const result = selectMatchItemHelper(
      {
        selectedLeftItem: this.selectedLeftItem,
        selectedRightItem: this.selectedRightItem,
      },
      column,
      item,
    );
    this.selectedLeftItem = result.selectedLeftItem;
    this.selectedRightItem = result.selectedRightItem;
    if (result.answerId) this.selectAnswer(result.answerId);
  }

  async saveNickname(newNick: string): Promise<string | null> {
    this.nickname = newNick.trim();
    return null;
  }

  openAvatarSelector() {
    this.avatarPickerOpen = true;
  }

  closeAvatarSelector() {
    this.avatarPickerOpen = false;
  }

  previewAvatar(av: {
    id: string;
    title: string;
    description: string;
    src: string;
  }) {
    this.dialogAvatarId = av.id;
    this.dialogAvatarSrc = av.src;
    this.dialogAvatarTitle = av.title;
    this.dialogAvatarDesc = av.description;
  }

  async confirmAvatar(): Promise<void> {
    this.selectedAvatarId = this.dialogAvatarId;
    this.closeAvatarSelector();
  }

  async submitRoleChoice() {
    this.roleSubmitted = true;
  }

  validateNickname(nick: string): string | null {
    if (!nick) return "Nickname required";
    return null;
  }

  // ── Lifecycle / actions no-op in mock — URL params drive state instead ──

  async validateCode(): Promise<boolean> {
    return true;
  }

  clearStoredData(): void {}

  async connect(_nicknameArg: string): Promise<void> {}

  async init(_opts: {
    isLoggedIn: boolean;
    profileAvatarId: string;
    playerId?: string | null;
    isCurator?: boolean;
    curatorNickname?: string;
    curatorAvatarId?: string;
  }): Promise<void> {}

  async initCodeEntry(): Promise<void> {}

  destroy(): void {}

  seedLobbyRoster(_data: {
    playerId?: string | null;
    players?: PlayerData[];
    accessMode?: "open" | "invite-only";
    maxPlayers?: number | null;
  }): void {}

  applyStateMessages(_msgs: ReadonlyArray<Record<string, unknown>>): void {}

  connectStatusStream(): void {}

  // ── Curator-only actions — no-op in mock; the mimic harness drives
  //    `state` directly from URL params instead (mirrors the retired
  //    curatorPlaySession's `mock` flag). ──
  startGame(): void {}
  advanceToNextQuestion(): void {}
  pauseGame(): void {
    this.isIntermission = true;
  }
  resumeGame(): void {
    this.isIntermission = false;
  }
  approvePlayer(): void {}
  rejectPendingPlayer(): void {}
  removePlayer(): void {}
  removePlayerAndBlock(): void {}
  startRoleSelection(): void {}
  stopPlaying(): void {
    this.isObserver = true;
    this.selectedRole = "observer";
  }
  stopGame(): void {}
  resetToSetup(): void {}
  async closeLobby(): Promise<void> {}
}
