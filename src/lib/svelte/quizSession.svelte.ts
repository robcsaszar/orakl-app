/**
 * Quiz session store (ADR 0004) — owns everything that must survive navigation
 * across the `/quiz/*` route tree: identity, lobby meta, players, role, the
 * live question UI, and the single WebSocket connection.
 *
 * Replaces JoinQuiz's client `view` enum with server-authoritative `membership`
 * + `phase`; the `(game)/quiz` layout reads `routeKey` and navigates. Pages are
 * dumb renderers that read this store from context.
 */

import {
  type CountdownTimer,
  compensateForLag,
  createCountdown,
  dispatchGameFrame,
  type GameFrameSink,
  selectMatchItem as selectMatchItemHelper,
  splitMatchPair,
} from "@orakl/client-core";
import type {
  CuratorStartMessage,
  GameAnswerRecord,
  GameErrorMessage,
  GameQuestionMessage,
  ServerMessage,
  StreakFlourish,
} from "@orakl/protocol";
import type {
  AvatarGroup,
  BadgeAward,
  BadgeRunParams,
  DbAvatar,
  Membership,
  ServerPhase,
} from "@orakl/shared";
import {
  buildAvatarGroups,
  DEFAULT_AVATAR_DESC,
  findPlayer,
  avatars as staticAvatars,
} from "@orakl/shared";
import { getContext, setContext } from "svelte";
import { type AdvanceMode, GAME } from "../../../data/game.settings.js";
import { MAX_NICKNAME_LENGTH } from "../constants/game.constants.js";
import { pickRandomEmotes } from "../emotes.js";
import {
  createPlayerSession,
  type PlayerSession,
  type PlayerSessionCallbacks,
  type PlayerSessionDeps,
  type WsStatus,
} from "../player-session.js";
import { storage } from "../storage.js";
import { toast } from "../toast.js";
import type { GameQuestion } from "../types/game.types.js";
import { releaseWakeLock, requestWakeLock } from "../wakeLock.js";

import type {
  FeedbackStatus,
  PlayerData,
  PlayerSessionView,
} from "./player-session-view.js";

// Back-compat re-export — canonical home is now player-session-view.ts (ADR 0010).
export type { FeedbackStatus, PlayerData } from "./player-session-view.js";

/** Copy for `game:error` codes the UI owns; anything else falls back to the
 *  server's message. Sentence case, spartan. */
const GAME_ERROR_COPY: Partial<Record<GameErrorMessage["code"], string>> = {
  game_in_progress: "A game is already underway.",
  no_questions:
    "No questions available for the chosen categories and difficulty.",
  no_categories: "Select at least one category to start.",
  already_answered: "You already answered this question.",
  observer_forbidden: "Observers can't do that.",
  no_active_game: "No question is open right now.",
  invalid_message: "That action couldn't be processed.",
  internal: "Something went wrong. Try again in a moment.",
};

/** Copy for the join page's error states — shared with the mimic join route
 *  (ADR 0010) so the preview shows production text. */
export const JOIN_ERROR_COPY = {
  device_in_lobby:
    "This device is already in the lobby. Open the game from your existing tab.",
  device_blocked: "You have been removed from this lobby and cannot rejoin.",
  lobby_full: "The lobby is full. You're watching as an observer.",
  failed: "Couldn't join the lobby. Check the code and try again.",
} as const;

export type PlayerSessionFactory = (
  callbacks: PlayerSessionCallbacks,
  deps?: PlayerSessionDeps,
) => PlayerSession;

export class QuizSession implements PlayerSessionView {
  private readonly _sessionFactory: PlayerSessionFactory;

  constructor(opts: { sessionFactory?: PlayerSessionFactory } = {}) {
    this._sessionFactory = opts.sessionFactory ?? createPlayerSession;
  }

  // ── Identity ──
  nickname = $state("");
  lobbyCode = $state("");
  selectedAvatarId = $state("");
  playerId = $state<string | null>(null);
  deviceId = $state("");
  isDisconnected = $state(false);
  wasRemoved = $state(false);
  /** The curator closed the lobby; the layout routes a player to /closed. */
  lobbyClosed = $state(false);
  /** `lobby:reset` arrived ("New quiz" or "Reset to setup") and the curator is
   *  editing the next quiz; cleared on `game:start`. The layout routes the
   *  curator's own client to /curator/create and tells players, who keep
   *  their seat and follow phase to the waiting room. */
  curatorEditing = $state(false);
  /** Terminal connection failure: socket gave up reconnecting; route to /join. */
  connectionLost = $state(false);
  isLoggedIn = $state(false);
  profileAvatarId = $state("");
  /** Curator's own row, one level up from a normal player (ADR 0019 route
   *  unification) — same journey, same routes, plus the curator toolbox. */
  isCurator = $state(false);

  // ── Server-authoritative routing axes (replace the old `view` enum) ──
  membership = $state<Membership>("none");
  phase = $state<ServerPhase | null>(null);
  /** Round result overlay sits on /quiz/play (phase stays "playing"). */
  showingResult = $state(false);

  // ── Quiz meta ──
  quizName = $state("");
  description = $state("");
  lobbyCategories = $state<string[]>([]);
  lobbyDifficulty = $state<string | null>(null);
  error = $state("");
  isJoining = $state(false);
  isReconnecting = $state(false);
  /** Curator pressed start; cleared by `game:start` or a `game:error`. */
  isStarting = $state(false);

  // ── Lobby access ──
  lobbyAccessMode = $state<"open" | "invite-only">("open");
  lobbyMaxPlayers = $state<number | null>(null);

  // ── Players ──
  players = $state<PlayerData[]>([]);
  sortedPlayers = $derived([...this.players].sort((a, b) => b.score - a.score));
  // Roster as it stood at game end (roles included); results renders this,
  // not `players`, so a role flip after the fact leaves the podium unchanged.
  finalRoster = $state<PlayerData[]>([]);

  // ── Badges (own honours only; server enriches game:final-scores per player) ──
  myBadges = $state<BadgeAward[]>([]);
  /** Set when the curator stopped the game early: completed questions and the planned count. */
  stoppedAfter = $state<{ served: number; planned: number } | null>(null);
  badgeRun = $state<BadgeRunParams | null>(null);
  // Own per-question breakdown, delivered the same way (null until the frame
  // arrives; the results page falls back to its page-load data otherwise).
  myBreakdown = $state<GameAnswerRecord[] | null>(null);
  // ── Streak (own only; server attaches `yourStreak` per connection on
  //    game:round-result — see game-connection-handler.ts) ──
  streak = $state(0);
  streakFlourish = $state<StreakFlourish | null>(null);
  streakNonce = $state(0);
  // Bumped on `game:results-ready` (game_results row persisted) so the
  // results page can invalidateAll to pick up canFlag/alreadyFlaggedIds.
  resultsReadyCount = $state(0);

  // ── Role ──
  isObserver = $state(false);
  selectedRole = $state<"player" | "observer">("player");
  roleSelectionTimeRemaining = $state(0);
  roleSelectionLocked = $state(false);
  roleSubmitted = $state(false);

  // ── Avatars ──
  dbAvatars = $state<DbAvatar[]>([]);
  avatarGroups = $state<AvatarGroup[]>([]);
  avatarSrcMap = $derived(
    new Map([
      ...staticAvatars.map((a) => [a.id, a.src] as const),
      ...this.dbAvatars.map((a) => [a.id, a.src] as const),
    ]),
  );
  playerById = $derived(new Map(this.players.map((p) => [p.id, p])));

  // ── Avatar dialog ──
  avatarPickerOpen = $state(false);
  dialogAvatarId = $state("");
  dialogAvatarSrc = $state("");
  dialogAvatarTitle = $state("");
  dialogAvatarDesc = $state("");
  saveToProfile = $state(false);
  /** `init()` has read the stored and profile avatar; the setup page's
   *  auto-rally waits on this so it never fires before the stored choice
   *  lands and then gets overwritten by it. */
  identityReady = $state(false);
  showSaveToProfileCheckbox = $derived(this.isLoggedIn);

  // ── Question UI ──
  /** Folded in from the retired gameStore.store.ts (ADR 0010) — one reactive
   *  home for the live question instead of a second store per page. */
  currentQuestion = $state<GameQuestion | null>(null);
  timeRemaining = $state(0);
  correctAnswerId = $state("");
  /** The curator's explanation, revealed alongside correctAnswerId at round
   *  end (map #912, decision 2). Cleared per question, never shown early. */
  postAnswerNote = $state<string | undefined>(undefined);
  questionType = $state("text_choice");
  answers = $state<{ id: string; text: string }[]>([]);
  matchItems = $state<{ left: string[]; right: string[] } | null>(null);
  selectedLeftItem = $state<string | null>(null);
  selectedRightItem = $state<string | null>(null);
  timerDuration = $state(30);
  advanceMode = $state<AdvanceMode>("auto_5");
  answered = $state(false);
  selectedAnswerId = $state<string | null>(null);
  feedbackStatus = $state<FeedbackStatus>("none");
  nextQuestionCountdown = $state(0);
  /** Seconds the between-question ring counts, from the lobby's advance mode; 0 when manual. */
  nextQuestionCountdownTotal = $derived(
    this.advanceMode === "manual"
      ? 0
      : GAME.roundConfig.autoAdvanceMsMap[this.advanceMode] / 1000,
  );
  playerAnswers = $state<Record<string, string>>({});
  isIntermission = $state(false);
  /** Live answer progress for the current question (server player:answered). */
  answeredCount = $state(0);
  totalToAnswer = $state(0);
  /** Per-player answered status for this question — only ever populated for a
   *  curator connection (player:answered is curator/display-only, ADR 0019
   *  toolbox roster). Empty set for a normal player. */
  answeredPlayerIds = $state<Set<string>>(new Set());
  /** Points earned on the last round (server score delta) — drives the "+N" cue. */
  lastPointsEarned = $state(0);

  // ── Emotes ──
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

  // ── Derived ──
  hasStoredData = $derived(!!this.nickname && !!this.playerId);
  /** Drives the layout's navigation effect; changes only on phase/membership. */
  routeKey = $derived(`${this.membership}:${this.phase ?? "none"}`);

  // ── Non-reactive internals ──
  private _session: PlayerSession | null = null;
  private _countdownTimer: CountdownTimer | null = null;
  /** Pre-join lobby poll (replaces the old pre-join status stream). */
  private _statusPollTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly _STATUS_POLL_MS = 4000;
  /** Self emotes rendered optimistically whose server echo we still expect and
   * must swallow to avoid a duplicate (one send → one `player:emote` echo). */
  private _pendingSelfEmotes = 0;

  getAvatarSrc(avatarId: string): string {
    return this.avatarSrcMap.get(avatarId) ?? "";
  }

  getMyScore(): number {
    return findPlayer(this.players, this.playerId)?.score ?? 0;
  }

  /**
   * Optimistically patch the self row in the roster (nickname/avatar) so the
   * lobby reflects the change before the `lobby:update` WS round-trip. Returns
   * a revert fn that restores the prior values (keyed by playerId, robust to a
   * WS refresh landing in between). No-op when the self row isn't present.
   */
  private patchSelfPlayer(
    fields: Partial<Pick<PlayerData, "nickname" | "avatar">>,
  ): () => void {
    // Capture the target id now so the revert matches the same row even if
    // playerId changes; only snapshot/restore the fields this call patched, so
    // an overlapping nickname/avatar save can't clobber the other's value.
    const selfId = this.playerId;
    const idx = this.players.findIndex((p) => p.id === selfId);
    if (idx === -1) return () => {};
    const before: Partial<Pick<PlayerData, "nickname" | "avatar">> = {};
    if ("nickname" in fields) before.nickname = this.players[idx].nickname;
    if ("avatar" in fields) before.avatar = this.players[idx].avatar;
    this.players[idx] = { ...this.players[idx], ...fields };
    return () => {
      const i = this.players.findIndex((p) => p.id === selfId);
      if (i !== -1) this.players[i] = { ...this.players[i], ...before };
    };
  }

  private applyLobbyMeta(meta: {
    quizName?: string | null;
    description?: string | null;
    categories?: string[] | null;
    difficulty?: string | null;
  }) {
    this.quizName = meta.quizName ?? "";
    this.description = meta.description ?? "";
    this.lobbyCategories = Array.isArray(meta.categories)
      ? meta.categories
      : [];
    this.lobbyDifficulty = meta.difficulty ?? null;
  }

  /** Single seam for every phase write (sink callbacks, connect, connection
   *  lifecycle, code-entry init) — `routeKey` traces back to just this + membership. */
  private setPhase(next: ServerPhase | null) {
    this.phase = next;
  }

  /**
   * Seed the SSR lobby roster + access config before the first WS frame
   * (LOBBY-1). Only controls first paint — the first `lobby:update` replaces
   * players wholesale. The cookie-derived `playerId` is seeded so the roster
   * splits "me" vs others correctly; init() re-resolves identity from storage.
   */
  seedLobbyRoster(data: {
    playerId?: string | null;
    players?: PlayerData[];
    accessMode?: "open" | "invite-only";
    maxPlayers?: number | null;
  }) {
    if (data.playerId) this.playerId = data.playerId;
    if (data.accessMode) this.lobbyAccessMode = data.accessMode;
    if (data.maxPlayers !== undefined) this.lobbyMaxPlayers = data.maxPlayers;
    if (data.players?.length) this.players = data.players;
  }

  // ── Streams ──

  private getSession(): PlayerSession {
    if (!this._session) {
      this._session = this._sessionFactory(
        {
          onMessage: (msg) => this.handleMessage(msg),
          onStatus: (status) => this.onConnectionStatus(status),
          onFatal: () => this.onConnectionFatal(),
        },
        // Owner routing (ADR 0024): the upgrade URL carries the lobby code so a
        // non-owner machine can fly-replay the socket before the handshake.
        { lobbyCode: () => this.lobbyCode || null },
      );
    }
    return this._session;
  }

  /**
   * Reconnect affordance, driven by the socket. WsClient auto-reconnects with
   * backoff; on reopen the server re-activates us and replays the snapshot, so
   * the UI re-syncs without a POST rejoin. We only flag the transient state.
   */
  private onConnectionStatus(status: WsStatus) {
    if (!this.playerId) return;
    if (status === "reconnecting") {
      this.isReconnecting = true;
      this.isDisconnected = true;
      releaseWakeLock();
    } else if (status === "open") {
      this.isReconnecting = false;
      this.isDisconnected = false;
    }
  }

  /**
   * Terminal socket failure — the server keeps rejecting the upgrade (policy
   * close: lobby gone / unknown player / expired token) or retries are
   * exhausted. Stop the "Reconnecting…" spinner, tear down stored identity and
   * flag `connectionLost` so the layout can route the player back to /join
   * instead of pinning them on an overlay forever.
   */
  private onConnectionFatal() {
    this.isReconnecting = false;
    this.isDisconnected = false;
    releaseWakeLock();
    this._session?.destroy();
    this._session = null;
    storage.removePlayerId();
    storage.removeLobbyCode();
    this.playerId = null;
    this.lobbyCode = "";
    this.membership = "none";
    this.setPhase(null);
    this.connectionLost = true;
  }

  /**
   * Pre-join lobby watch — polls /api/lobby so quiz meta stays live while a
   * visitor sits on /join or /setup before joining (no socket identity yet, so
   * no WS). Stopped on join (connect) and destroy.
   */
  connectStatusStream() {
    if (this._statusPollTimer !== null) return;
    // Snapshot once — poll by the code the visitor already arrived with (URL
    // deep link), not whatever they're actively typing into the code-entry
    // field. Re-reading `this.lobbyCode` live on every tick effectively
    // auto-submits each keystroke to the server; explicit entry goes through
    // validateCode() (the Next button / Enter key) instead.
    const code = this.lobbyCode.trim().toLowerCase();
    const poll = async () => {
      try {
        // An anonymous visitor has no cookie, so a code-less /api/lobby
        // returns active:false and would wrongly wipe the lobby they're
        // trying to join.
        const res = await fetch(
          code ? `/api/lobby?code=${encodeURIComponent(code)}` : "/api/lobby",
        );
        const data = await res.json();
        if (res.ok && data.active) {
          if (!this.lobbyCode && data.code) {
            this.lobbyCode = data.code as string;
            storage.setLobbyCode(this.lobbyCode);
          }
          this.applyLobbyMeta(data);
          if (this.membership === "none" && this.phase === null) {
            this.setPhase("lobby");
          }
        } else {
          this.applyLobbyMeta({});
          // Only fall back to code-entry when there's no code to anchor on —
          // never wipe a code the visitor explicitly entered, or a transient
          // poll miss bounces them off /quiz/setup back to /join.
          if (this.membership === "none" && !this.lobbyCode) {
            this.setPhase(null);
          }
        }
        this.error = "";
      } catch {
        /* transient — next tick retries */
      }
    };
    void poll();
    this._statusPollTimer = setInterval(
      () => void poll(),
      QuizSession._STATUS_POLL_MS,
    );
  }

  private stopStatusPolling() {
    if (this._statusPollTimer !== null) {
      clearInterval(this._statusPollTimer);
      this._statusPollTimer = null;
    }
  }

  private connectToStreams() {
    this.getSession().connect();
  }

  /**
   * Replay server state messages captured at SSR (the /quiz/play load) through
   * the normal handler so the live question paints at mount without waiting for
   * the /api/game/state round-trip. Idempotent — the reconnect path's
   * restoreState() replays the same messages and reconciles to identical state.
   */
  applyStateMessages(msgs: ReadonlyArray<Record<string, unknown>>) {
    for (const msg of msgs) this.handleMessage(msg);
  }

  // ── Actions ──

  /** Validate a typed code (called from /join). Returns true when a lobby is found. */
  async validateCode(): Promise<boolean> {
    if (!this.lobbyCode.trim()) return false;
    this.isJoining = true;
    this.error = "";
    try {
      const code = this.lobbyCode.trim().toLowerCase();
      const res = await fetch(`/api/lobby?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (res.ok && data.active) {
        this.applyLobbyMeta(data);
        return true;
      }
      const fallback = await fetch("/api/lobby");
      const fallbackData = await fallback.json();
      if (fallback.ok && fallbackData.active) {
        this.applyLobbyMeta(fallbackData);
        return true;
      }
      this.error =
        data.error ?? "No active lobby. Ask the curator to start one.";
      return false;
    } catch {
      this.error = "Could not reach the game server.";
      return false;
    } finally {
      this.isJoining = false;
    }
  }

  clearStoredData() {
    storage.removeNickname();
    storage.removeAvatar();
    storage.removePlayerId();
    storage.removeLobbyCode();
    this.nickname = "";
    this.lobbyCode = "";
    this.selectedAvatarId = "";
    this.playerId = null;
  }

  validateNickname(nick: string): string | null {
    if (!nick) return "Nickname is required";
    if (nick.length > MAX_NICKNAME_LENGTH)
      return `Nickname must be ${MAX_NICKNAME_LENGTH} characters or fewer`;
    return null;
  }

  async connect(nicknameArg: string) {
    this.stopStatusPolling();
    this.isJoining = true;
    this.error = "";
    this.connectionLost = false;

    try {
      const storedPlayerId = this.playerId;
      const joinData: Record<string, unknown> = {
        nickname: nicknameArg,
        avatarId: this.selectedAvatarId,
        role: this.selectedRole,
        code: this.lobbyCode || undefined,
        ...(this.deviceId ? { deviceId: this.deviceId } : {}),
      };
      if (storedPlayerId) joinData.playerId = storedPlayerId;

      const joinUrl = this.lobbyCode
        ? `/api/lobby/join?code=${encodeURIComponent(this.lobbyCode)}`
        : "/api/lobby/join";
      const res = await fetch(joinUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(joinData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.code === "device_in_lobby") {
          this.error = JOIN_ERROR_COPY.device_in_lobby;
          this.isJoining = false;
          return;
        }
        if (errorData.code === "device_blocked") {
          this.error = JOIN_ERROR_COPY.device_blocked;
          this.isJoining = false;
          return;
        }
        this.error = errorData.error || JOIN_ERROR_COPY.failed;
        this.isJoining = false;
        if (this.isReconnecting) {
          this.membership = "none";
          this.setPhase(null);
          this.isReconnecting = false;
          this.isDisconnected = false;
          storage.removePlayerId();
          storage.removeLobbyCode();
        }
        return;
      }

      const joinResult = await res.json();
      this.playerId = joinResult.playerId;
      if (joinResult.role) {
        this.isObserver = joinResult.role === "observer";
        this.selectedRole = joinResult.role;
      }
      // Asked for hero, seated as observer — say why (game-store `admit`).
      if (joinResult.coerced) {
        toast.info(
          joinResult.coerced === "late_join"
            ? "The game is already underway — you're watching as an observer."
            : JOIN_ERROR_COPY.lobby_full,
        );
      }
      if (this.playerId) storage.setPlayerId(this.playerId);
      if (this.lobbyCode) storage.setLobbyCode(this.lobbyCode);
      storage.setNickname(nicknameArg.trim());
      if (this.selectedAvatarId) storage.setAvatar(this.selectedAvatarId);

      if (joinResult.status === "pending") {
        this.membership = "pending";
        this.applyLobbyMeta(joinResult);
      }

      // Open the socket; the server replays the lobby/game snapshot on connect,
      // so there is no separate state-restore round-trip. A pending player keeps
      // membership "pending" until the curator approves (server pushes the rest).
      this.connectToStreams();

      this.isReconnecting = false;
      this.isDisconnected = false;
      if (joinResult.status !== "pending") {
        this.membership = "active";
        if (this.phase === null) this.setPhase("lobby");
        this.applyLobbyMeta(joinResult);
      }
      this.isJoining = false;
    } catch (err) {
      console.error("[QuizSession] connect error:", err);
      this.error = "Could not connect to the game server.";
      this.isJoining = false;
      if (this.isReconnecting) {
        this.membership = "none";
        this.setPhase(null);
        this.isReconnecting = false;
        this.isDisconnected = false;
        storage.removePlayerId();
        storage.removeLobbyCode();
      }
    }
  }

  /**
   * Curator's own row already exists (ADR 0019 — created at lobby creation,
   * Hero or Observer) and identity already rides the curator cookie — there is
   * no join to POST. `membership`/`phase`/`players` are already resolved
   * server-side (`+layout.server.ts`'s `resolveJourney` + `seedLobbyRoster`),
   * so this just opens the socket, which replays the lobby/game snapshot. A
   * lobby-less curator (`membership === "none"`) is caught by the layout's
   * phase-effect redirect to `/curator/create` before this matters.
   */
  private async connectAsCurator() {
    if (this.membership === "none") return;
    this.isReconnecting = true;
    this.connectToStreams();
    this.isReconnecting = false;
    this.isDisconnected = false;
  }

  /**
   * Routes every `ServerMessage` frame to a state write — one callback per
   * case (ADR 0010's shared `dispatchGameFrame`, same shape as curator/display).
   */
  private readonly _sink: GameFrameSink = {
    onLobbyUpdate: (msg) => {
      // LobbyUpdateMessage.players is `readonly Player[]` — spread strips the
      // readonly so it satisfies the mutable PlayerData[] field.
      this.players = [...msg.players];
      if (msg.accessMode !== undefined) this.lobbyAccessMode = msg.accessMode;
      if (msg.maxPlayers !== undefined) this.lobbyMaxPlayers = msg.maxPlayers;
      // Curator's live "Update quiz" edit — only carried when the server sent
      // meta (replay/live subscribe always do), so a frame without it can't
      // clobber the lobby's current title/description/categories/difficulty.
      if (msg.quizName !== undefined) {
        this.applyLobbyMeta({
          quizName: msg.quizName,
          description: msg.description,
          categories: msg.categories ? [...msg.categories] : undefined,
          difficulty: msg.difficulty,
        });
      }
      const myId = this.playerId;
      if (myId) {
        const me = findPlayer(msg.players, myId);
        if (me && me.nickname !== storage.getNickname()) {
          storage.setNickname(me.nickname);
          this.nickname = me.nickname;
        }
        // Resyncs a curator's own hero/observer flip from "Update quiz"
        // (untick "Play along") — this frame is the only signal for that,
        // there's no player:role round trip for it like role_selection has.
        if (me) this.isObserver = me.role === "observer";
      }
    },
    onLobbyEnded: () => {
      this.lobbyClosed = true;
      storage.removePlayerId();
      storage.removeLobbyCode();
      this.playerId = null;
      this.lobbyCode = "";
      this.membership = "none";
      this.setPhase(null);
      this.isReconnecting = false;
      this.isDisconnected = false;
      releaseWakeLock();
      this.isJoining = false;
      this._session?.destroy();
      this._session = null;
    },
    onLobbyReset: () => {
      // Curator is hosting the next quiz; the game was cleared. Players
      // return to the lobby waiting room until the new game starts (the role
      // chosen during role selection is preserved); the curator's client
      // goes to the create page to edit the quiz.
      this.showingResult = false;
      this.stoppedAfter = null;
      this.setPhase("lobby");
      this.curatorEditing = true;
    },
    onGameStart: (msg) => {
      this.isStarting = false;
      this.curatorEditing = false;
      // Fresh game, fresh honours — clear the previous run's badges.
      this.myBadges = [];
      this.stoppedAfter = null;
      this.badgeRun = null;
      this.myBreakdown = null;
      this.finalRoster = [];
      this.resultsReadyCount = 0;
      this.streak = 0;
      this.streakFlourish = null;
      this.streakNonce = 0;
      this.timerDuration = msg.timerDuration;
      if (msg.advanceMode) this.advanceMode = msg.advanceMode;
    },
    onIntermission: () => {
      this.isIntermission = true;
      // The reveal's countdown freezes with the game; resume restarts it.
      this._countdownTimer?.stop();
    },
    onResume: () => {
      this.isIntermission = false;
      if (this.showingResult) this.startNextQuestionCountdown();
    },
    onQuestion: (msg) => {
      this.isIntermission = false;
      this.showQuestion(msg);
    },
    onTick: (msg) => {
      this.timeRemaining = compensateForLag(msg.timeRemaining, msg.serverTs);
      // Players get the "N of M answered" tally on the tick (per-answer
      // player:answered is curator/display-only — see game-connection-handler).
      if ("answeredCount" in msg && msg.answeredCount !== undefined)
        this.answeredCount = msg.answeredCount;
      if ("answeredTotal" in msg && msg.answeredTotal !== undefined)
        this.totalToAnswer = msg.answeredTotal;
    },
    onPlayerAnswered: (msg) => {
      // Only ever arrives on a curator's connection (see field comment above).
      this.answeredPlayerIds = new Set(this.answeredPlayerIds).add(
        msg.playerId,
      );
    },
    onRoundResult: (msg) => {
      this.showRoundResult(msg);
    },
    onFinalScores: (msg) => {
      this.showFinalScores(msg);
    },
    onResultsReady: () => {
      this.resultsReadyCount++;
    },
    onRoleSelectionStart: (msg) => {
      this.setPhase("role_selection");
      this.players = msg.players;
      this.roleSelectionTimeRemaining = msg.timeRemaining;
      this.roleSelectionLocked = false;
      this.roleSubmitted = false;
      this.selectedRole = storage.getRole() ?? "player";
    },
    onRoleSelectionUpdate: (msg) => {
      this.players = msg.players;
      this.roleSelectionTimeRemaining = msg.timeRemaining;
    },
    onRoleSelectionLocked: (msg) => {
      this.players = msg.players;
      this.roleSelectionLocked = true;
      const me = findPlayer(msg.players, this.playerId);
      this.isObserver = me?.role === "observer";
      this.selectedRole = me?.role ?? "player";
      storage.setRole(this.selectedRole);
      this.setPhase("final_scores");
    },
    onPlayerEmote: (msg) => {
      // Our own emote was already rendered optimistically on send — swallow
      // the server's echo so it doesn't show twice.
      if (msg.playerId === this.playerId && this._pendingSelfEmotes > 0) {
        this._pendingSelfEmotes--;
        return;
      }
      this.addEmote(msg.playerId, msg.emoteId, msg.offsetX, msg.offsetY);
    },
    onPlayerRemoved: (msg) => {
      if (msg.playerId === this.playerId) {
        storage.removePlayerId();
        storage.removeLobbyCode();
        this.playerId = null;
        this.lobbyCode = "";
        this._session?.destroy();
        this._session = null;
        this.wasRemoved = true;
      }
    },
    onGameError: (msg) => {
      // Only ever arrives on the socket whose own action failed.
      this.isStarting = false;
      toast.error(GAME_ERROR_COPY[msg.code] ?? msg.message);
    },
  };

  /**
   * Player-approval frames — not part of `ServerMessage` (they're the
   * `PlayerEvent` union the server emits to a still-pending player; see
   * game-store.ts's `approvePlayer`/`rejectPlayer`). `GameFrameSink` has no
   * row for these, so they're handled here before everything else routes
   * through the shared dispatcher.
   */
  private handleMessage(rawMsg: Record<string, unknown>) {
    const msg = rawMsg as { type: string } & Record<string, unknown>;
    switch (msg.type) {
      case "lobby:approved": {
        const midGame = !!msg.midGame;
        this.membership = "active";
        this.setPhase("lobby"); // overridden by the snapshot the server replays on approval
        this.isDisconnected = false;
        this.isReconnecting = false;
        if (midGame) {
          // Approved mid-game → observer. The socket is already open; the server
          // subscribes us to the game stream and replays the snapshot on approval,
          // so no reconnect/restore is needed here.
          this.isObserver = true;
          this.selectedRole = "observer";
        }
        return;
      }
      case "lobby:rejected":
        this.error = "Your request to join was declined.";
        this._session?.destroy();
        this._session = null;
        storage.removePlayerId();
        this.playerId = null;
        this.membership = "none";
        return;
    }
    dispatchGameFrame(msg as unknown as ServerMessage, this._sink);
  }

  private showQuestion(msg: GameQuestionMessage) {
    this._countdownTimer?.stop();
    this.nextQuestionCountdown = 0;
    this.showingResult = false;
    this.setPhase("playing");
    requestWakeLock();
    this.currentQuestion = msg;
    this.correctAnswerId = "";
    this.postAnswerNote = undefined;
    this.timeRemaining = compensateForLag(msg.timeRemaining, msg.serverTs);
    this.questionType = msg.questionType ?? "text_choice";
    this.answers = msg.answers;
    this.matchItems = msg.matchItems ?? null;
    this.selectedLeftItem = null;
    this.selectedRightItem = null;
    this.answered = false;
    this.selectedAnswerId = null;
    this.playerAnswers = {};
    this.feedbackStatus = "none";
    this.activeEmotes = [];
    // Snapshot replay carries the live tally; a fresh question carries neither.
    this.answeredCount = msg.answeredCount ?? 0;
    this.totalToAnswer = msg.answeredTotal ?? 0;
    this.answeredPlayerIds = new Set();
    this.lastPointsEarned = 0;
    // Snapshot replay (mid-question reconnect): restore our own submitted answer
    // so the tiles stay locked/highlighted and we don't re-open a question the
    // server will reject. feedback resolves to correct/incorrect at round end.
    if (msg.yourAnswerId) {
      this.answered = true;
      this.selectedAnswerId = msg.yourAnswerId;
      this.feedbackStatus = "pending";
      // Image-matching answers encode `${left}|${right}`; restore the pair so
      // ImageMatchingGrid renders the locked selection (not just a flag).
      if (
        this.questionType === "image_matching" &&
        msg.yourAnswerId.includes("|")
      ) {
        const [left, right] = splitMatchPair(msg.yourAnswerId);
        this.selectedLeftItem = left ?? null;
        this.selectedRightItem = right ?? null;
      }
    }
    // Bound the self-echo counter to the current question: a dropped echo (e.g.
    // during reconnect) can't leak across questions and swallow a later emote.
    this._pendingSelfEmotes = 0;
    this.pickedEmotes = this.emotesEnabled ? pickRandomEmotes(5) : [];
  }

  selectAnswer(answerId: string) {
    if (this.answered || this.isObserver) return;
    // Without an identity the answer would post playerId:null (fails auth) yet
    // still flip `answered`, permanently locking the player out of this question.
    if (!this.playerId) return;
    if (this.timeRemaining <= 0) return;
    this.answered = true;
    this.selectedAnswerId = answerId;
    this.feedbackStatus = "pending";
    this.getSession().send({ type: "player:answer", answerId });
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

  /** Add a floating emote; auto-expires after the float animation. Returns its uid. */
  private addEmote(
    playerId: string,
    emoteId: string,
    offsetX: number,
    offsetY: number,
  ): string {
    const uid = Math.random().toString(36).slice(2);
    this.activeEmotes = [
      ...this.activeEmotes,
      { uid, playerId, emoteId, offsetX, offsetY },
    ];
    setTimeout(() => {
      this.activeEmotes = this.activeEmotes.filter((e) => e.uid !== uid);
    }, 1600);
    return uid;
  }

  /** offsetX/offsetY are fractions (0-1) of the answers container, from the
   *  long-press point that opened the emote fan. */
  sendEmote(emoteId: string, offsetX: number, offsetY: number) {
    if (!this.answered || !this.playerId) return;
    // Optimistic: float it immediately and swallow the server echo
    // (broadcastEmote echoes the sender) so it doesn't render twice.
    this.addEmote(this.playerId, emoteId, offsetX, offsetY);
    this._pendingSelfEmotes++;
    this.getSession().send({
      type: "player:emote",
      emoteId,
      offsetX,
      offsetY,
    });
  }

  private showRoundResult(msg: {
    correctAnswerId: string;
    players: PlayerData[];
    playerAnswers: Record<string, string>;
    postAnswerNote?: string;
    yourStreak?: { streak: number; flourish: StreakFlourish | null };
    countdownRemaining?: number;
  }) {
    this.showingResult = true;
    this.streak = msg.yourStreak?.streak ?? 0;
    this.streakFlourish = msg.yourStreak?.flourish ?? null;
    if (msg.yourStreak) this.streakNonce++;
    // Points earned this round = server-authoritative score delta (works for
    // both classic +1 and time-based; no client-side formula to drift).
    const prevScore = this.getMyScore();
    this.correctAnswerId = msg.correctAnswerId;
    this.postAnswerNote = msg.postAnswerNote;
    this.playerAnswers = msg.playerAnswers || {};
    if (this.isObserver) {
      this.feedbackStatus = "none";
    } else if (
      !this.answered ||
      !this.selectedAnswerId ||
      (this.playerId && !msg.playerAnswers[this.playerId])
    ) {
      this.feedbackStatus = "timeout";
    } else if (this.selectedAnswerId === msg.correctAnswerId) {
      this.feedbackStatus = "correct";
    } else {
      this.feedbackStatus = "incorrect";
    }
    this.players = msg.players;
    this.lastPointsEarned =
      this.feedbackStatus === "correct"
        ? Math.max(0, this.getMyScore() - prevScore)
        : 0;
    this.startNextQuestionCountdown(msg.countdownRemaining);
  }

  /** Ring to the next question: the whole configured delay, so it reaches
   *  zero as the server advances (decision 2 on map #1078). A reconnect
   *  replay passes the seconds the server's advance timer has left. */
  private startNextQuestionCountdown(from?: number) {
    const total = this.nextQuestionCountdownTotal;
    if (total === 0) return;
    const start = from ?? total;
    if (start <= 0) return;
    this.nextQuestionCountdown = start;
    this._countdownTimer?.stop();
    this._countdownTimer = createCountdown({
      onTick: (t) => {
        this.nextQuestionCountdown = t;
      },
      onExpire: () => {},
    });
    this._countdownTimer.start(start);
  }

  private showFinalScores(msg: {
    players: PlayerData[];
    yourBadges?: BadgeAward[];
    badgeRun?: BadgeRunParams;
    yourBreakdown?: GameAnswerRecord[];
    stopped?: { served: number; planned: number };
  }) {
    this.setPhase("final_scores");
    this.stoppedAfter = msg.stopped ?? null;
    this._countdownTimer?.stop();
    this.nextQuestionCountdown = 0;
    releaseWakeLock();
    this.players = msg.players;
    this.finalRoster = msg.players;
    if (msg.yourBadges) {
      this.myBadges = msg.yourBadges;
      this.badgeRun = msg.badgeRun ?? null;
    }
    if (msg.yourBreakdown) this.myBreakdown = msg.yourBreakdown;
    const me = findPlayer(msg.players, this.playerId);
    if (me?.role) {
      this.isObserver = me.role === "observer";
      this.selectedRole = me.role;
    }
  }

  submitRoleChoice() {
    // Don't optimistically lock onto a closed socket: send() would no-op and the
    // Confirm button is hidden once roleSubmitted, stranding the player on
    // "waiting" forever. Surface the failure and keep the choice editable.
    if (!this.getSession().isConnected()) {
      // Clear first so a repeat press re-fires the layout's error toast.
      this.error = "";
      this.error = "Not connected — your role wasn't submitted. Try again.";
      return;
    }
    this.error = "";
    // Optimistic lock; the server applies the role and echoes it via lobby:update
    // / role:selection-* frames over the socket.
    this.roleSubmitted = true;
    this.getSession().send({ type: "player:role", role: this.selectedRole });
  }

  // ── Curator-only actions (ADR 0019 route unification) ──
  // Only ever invoked by the curator toolbox, which only renders when
  // isCurator is true — server-side, every curator:* frame is gated by
  // connection role (game-connection-handler.ts) regardless, so these are
  // harmless no-ops if ever called by a non-curator session.

  /** Start the game from the lobby (curator toolbox / lobby page). Server
   *  draws questions and starts the game; game:start echoes back over the
   *  socket, at which point the phase-effect navigates to /quiz/play. */
  startGame(config: Omit<CuratorStartMessage, "type">) {
    this.isStarting = true;
    this.getSession().send({ type: "curator:start", ...config });
  }

  advanceToNextQuestion() {
    this.getSession().send({ type: "curator:advance" });
  }

  pauseGame() {
    this.isIntermission = true; // optimistic; game:intermission confirms
    this.getSession().send({ type: "curator:intermission", action: "start" });
  }

  resumeGame() {
    this.isIntermission = false; // optimistic; game:resume confirms
    this.getSession().send({ type: "curator:intermission", action: "end" });
  }

  approvePlayer(playerId: string) {
    this.getSession().send({
      type: "curator:player",
      playerId,
      action: "approve",
    });
  }

  rejectPendingPlayer(playerId: string) {
    this.getSession().send({
      type: "curator:player",
      playerId,
      action: "reject",
    });
  }

  removePlayer(playerId: string) {
    if (!confirm("Remove this player?")) return;
    this.getSession().send({
      type: "curator:player",
      playerId,
      action: "remove",
    });
  }

  removePlayerAndBlock(playerId: string) {
    if (!confirm("Remove and block this player from rejoining?")) return;
    this.getSession().send({
      type: "curator:player",
      playerId,
      action: "block",
    });
  }

  startRoleSelection() {
    this.getSession().send({ type: "curator:start-role-selection" });
  }

  /** Toolbox "Stop playing" shortcut (final scores only, same as any hero
   *  choosing Observer) — reuses the ordinary role frame instead of a
   *  bespoke row-delete; setPlayerRole is phase-agnostic server-side. */
  stopPlaying() {
    if (!this.playerId) return;
    this.isObserver = true;
    this.selectedRole = "observer";
    this.getSession().send({ type: "player:role", role: "observer" });
  }

  stopGame() {
    this.getSession().send({ type: "curator:stop" });
  }

  resetToSetup() {
    this.getSession().send({ type: "curator:reset" });
  }

  /** Toolbox "Close lobby": deletes the lobby and drops the stored quiz
   *  config, so the create page and home offer "Host quiz" again — the same
   *  end state as the home-page dismiss (home-actions.ts). */
  async closeLobby() {
    try {
      const res = await fetch("/api/lobby", { method: "DELETE" });
      if (!res.ok) this.error = "Failed to close lobby";
      else storage.removeQuizConfig();
    } catch {
      this.error = "Failed to close lobby";
    }
  }

  // ── Avatar dialog actions ──

  openAvatarSelector() {
    this.avatarPickerOpen = true;
  }

  closeAvatarSelector() {
    this.dialogAvatarId = "";
    this.avatarPickerOpen = false;
    // A ticked "save to profile" dies with the dialog; only a confirmed pick
    // writes to the profile.
    this.saveToProfile = false;
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
    this.dialogAvatarDesc = av.description || DEFAULT_AVATAR_DESC;
  }

  async confirmAvatar() {
    this.selectedAvatarId = this.dialogAvatarId;
    this.closeAvatarSelector();
    if (this.saveToProfile) {
      await this.saveAvatarToProfile();
      this.saveToProfile = false;
    }
    if (this.playerId && this.membership === "active") {
      await this.updateAvatarOnServer();
    }
  }

  async updateAvatarOnServer() {
    const aid = this.selectedAvatarId;
    const revert = this.patchSelfPlayer({ avatar: aid }); // optimistic roster
    try {
      const res = await fetch("/api/lobby/player", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: this.playerId, avatarId: aid }),
      });
      if (!res.ok) {
        revert();
        console.error("[QuizSession] avatar update error:", res.status);
        return;
      }
      if (aid) storage.setAvatar(aid);
    } catch (err) {
      revert();
      console.error("[QuizSession] avatar update error:", err);
    }
  }

  async saveAvatarToProfile() {
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: this.selectedAvatarId }),
      });
    } catch {
      /* silent */
    }
  }

  async saveNickname(newNick: string): Promise<string | null> {
    const trimmed = newNick.trim();
    const err = this.validateNickname(trimmed);
    if (err) return err;
    if (trimmed === this.nickname) return null;
    // Not in an active lobby (e.g. /join, pre-code-entry) — playerId may be a
    // stale id from a past, since-ended lobby. Nothing to sync server-side;
    // just update local state/storage, same guard confirmAvatar() already
    // uses for its own server round-trip.
    if (!this.playerId || this.membership !== "active") {
      this.nickname = trimmed;
      storage.setNickname(trimmed);
      return null;
    }
    const revert = this.patchSelfPlayer({ nickname: trimmed }); // optimistic roster
    try {
      const res = await fetch("/api/lobby/player", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: this.playerId, nickname: trimmed }),
      });
      if (!res.ok) {
        revert();
        const data = await res.json();
        return data.error || "Failed to update";
      }
      this.nickname = trimmed;
      storage.setNickname(trimmed);
      return null;
    } catch {
      revert();
      return "Connection error";
    }
  }

  // ── Lifecycle ──

  /** Load identity from storage + fetch avatars. Resolves once initial state is set. */
  async init(opts: {
    isLoggedIn: boolean;
    profileAvatarId: string;
    /** Cookie-derived player id (server load) — fallback when localStorage is cleared. */
    playerId?: string | null;
    isCurator?: boolean;
    /** Account-sourced identity for a curator (ADR 0019) — never device storage. */
    curatorNickname?: string;
    curatorAvatarId?: string;
  }) {
    this.lobbyClosed = false;
    this.curatorEditing = false;
    this.isCurator = !!opts.isCurator;
    this.isLoggedIn = opts.isLoggedIn;
    this.profileAvatarId = opts.profileAvatarId;

    if (this.isCurator) {
      this.nickname = opts.curatorNickname ?? "";
      this.selectedAvatarId = opts.curatorAvatarId ?? "";
      this.playerId = opts.playerId ?? null;
      await this.connectAsCurator();
      return;
    }

    this.nickname = storage.getNickname() ?? "";
    this.selectedAvatarId = storage.getAvatar() ?? "";
    // Page access is cookie-driven; a returning player may hold a valid cookie
    // but have lost localStorage. Fall back to the cookie id (and re-persist)
    // so answer/role requests still carry a playerId.
    const storedPlayerId = storage.getPlayerId();
    this.playerId = storedPlayerId ?? opts.playerId ?? null;
    if (!storedPlayerId && opts.playerId) storage.setPlayerId(opts.playerId);
    this.lobbyCode = storage.getLobbyCode() ?? this.lobbyCode;

    try {
      let stored = storage.getDeviceId();
      if (!stored) {
        stored = crypto.randomUUID();
        storage.setDeviceId(stored);
      }
      this.deviceId = stored;
    } catch {
      this.deviceId = crypto.randomUUID();
    }
    if (!this.selectedAvatarId && opts.profileAvatarId) {
      this.selectedAvatarId = opts.profileAvatarId;
    }
    this.identityReady = true;

    try {
      const res = await fetch("/api/avatars");
      if (res.ok) {
        this.dbAvatars = await res.json();
        this.avatarGroups = buildAvatarGroups(this.dbAvatars);
      }
    } catch {
      console.warn("[QuizSession] failed to fetch avatars");
    }

    // Reconnect path: stored identity → rejoin + open the socket directly.
    if (this.playerId && this.nickname) {
      this.isReconnecting = true;
      await this.connect(this.nickname);
      return;
    }

    // Pre-join (setup): watch the status stream so quiz meta stays live when the
    // curator edits the title/description/categories. connect() drops it on join.
    this.connectStatusStream();
  }

  /**
   * Lightweight init for the standalone /join (code-entry) page: load identity
   * for display, fetch avatars, detect an active lobby, and watch the status
   * stream. Does not reconnect — member redirection happens server-side.
   */
  async initCodeEntry() {
    this.lobbyClosed = false;
    this.curatorEditing = false;
    this.nickname = storage.getNickname() ?? "";
    this.selectedAvatarId = storage.getAvatar() ?? "";
    this.playerId = storage.getPlayerId();

    // Prefill code from ?code= query param (QR code links: /join?code=xxx)
    let codeFromUrl = false;
    try {
      const url = new URL(window.location.href);
      const codeParam = url.searchParams.get("code");
      if (codeParam) {
        this.lobbyCode = codeParam.trim().toLowerCase();
        codeFromUrl = true;
      }
    } catch {}

    try {
      const res = await fetch("/api/avatars");
      if (res.ok) {
        this.dbAvatars = await res.json();
        this.avatarGroups = buildAvatarGroups(this.dbAvatars);
      }
    } catch {
      console.warn("[QuizSession] failed to fetch avatars");
    }

    if (codeFromUrl && this.lobbyCode) {
      // Auto-validate code from URL; if found, advance directly to setup
      const found = await this.validateCode();
      if (found) {
        storage.setLobbyCode(this.lobbyCode);
        this.setPhase("lobby");
        return;
      }
      // Validation failed — error is visible; fall through to status stream
    } else {
      try {
        const res = await fetch("/api/lobby");
        const data = await res.json();
        if (res.ok && data.active) {
          this.applyLobbyMeta(data);
          this.setPhase("lobby");
          return;
        }
      } catch {
        /* no active lobby */
      }
    }

    this.connectStatusStream();
  }

  destroy() {
    this.stopStatusPolling();
    this._session?.destroy();
    this._session = null;
    this._countdownTimer?.stop();
    releaseWakeLock();
  }
}

const KEY = Symbol("quiz-session");

/** Typed to the interface (ADR 0010), not the concrete class, so QuizSession
 *  and MockQuizSession are interchangeable at this seam without a cast. */
export function setQuizSession(session: PlayerSessionView): PlayerSessionView {
  return setContext(KEY, session);
}

export function getQuizSession(): PlayerSessionView {
  const session = getContext<PlayerSessionView | undefined>(KEY);
  if (!session) {
    throw new Error("getQuizSession() called outside the (game)/quiz layout");
  }
  return session;
}
