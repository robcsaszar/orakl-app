import {
  formatCorrectAnswer,
  getAnswerButtonClass as getAnswerButtonClassHelper,
  isTrueAnswerText,
  selectMatchItem as selectMatchItemHelper,
  type TimerState,
  WsClient,
} from "@orakl/client-core";
import type {
  MediaType,
  QuestionSource,
  QuizQuestion,
  SoloClientMessage,
  SoloFinalMessage,
  SoloRoundResultMessage,
} from "@orakl/protocol";
import type {
  DifficultyFilter,
  QuestionsPerRound,
  TimerDuration,
} from "../../data/game.settings.js";
import { isFalseAnswerText } from "./answer-variants.js";
import { drawMatchLines as drawMatchLinesHelper } from "./question-helpers.js";
import {
  calculateMaxGameTime,
  calculateTotalQuestionPool,
  validateQuizSetup,
} from "./quiz-setup.js";
import { storage } from "./storage.js";
import { buildWsUrl as buildWsUrlBase } from "./ws-url.js";

interface QuestionResult {
  /** Question id (question-flagging follow-up needs this to key the staging
   *  store / flag submission — absent would silently no-op that feature). */
  questionId: string;
  text: string;
  correct: boolean;
  selectedAnswer: string | null;
  correctAnswer: string;
  difficulty: string;
  /** Results-only extras (map #912) — filled in from `solo:final`, never
   *  present before the run ends. */
  mediaUrl?: string;
  mediaType?: MediaType;
  source?: QuestionSource;
  postAnswerNote?: string;
  /** Whether this account already has a flag on this question — hides the
   *  results screen's flag control. Filled in from `solo:final`, absent
   *  (falsy) before the run ends. */
  alreadyFlagged?: boolean;
}

function buildWsUrl(): string {
  return buildWsUrlBase("/api/solo/ws");
}

// Survives a full page refresh so an in-flight game resumes seamlessly (review
// list included) and a finished game keeps its results screen. Cleared when a
// new game starts or the run is left.

interface PersistedSolo {
  phase: "playing" | "result";
  sessionId: string | null;
  /** Resume secret for the in-flight session; required to resume after a refresh. */
  resumeToken?: string;
  claimId: string | null;
  isGuest: boolean;
  ownerId: string;
  finalData: SoloFinalMessage | null;
  results: QuestionResult[];
}

function readStoredState(): PersistedSolo | null {
  if (typeof window === "undefined") return null;
  const raw = storage.getSoloState();
  try {
    return raw ? (JSON.parse(raw) as PersistedSolo) : null;
  } catch {
    return null;
  }
}

function writeStoredState(state: PersistedSolo | null): void {
  if (typeof window === "undefined") return;
  if (state) storage.setSoloState(JSON.stringify(state));
  else storage.removeSoloState();
}

/** Coarse device class for cross-device stats (STATS-11). SSR-safe. */
function detectDevice(): "mobile" | "tablet" | "desktop" | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function createSoloModeStore(
  topicDataJson: string,
  profileAvatarSrc: string,
  isGuest = false,
  // Identity that owns persisted state ("anon" for guests, else the user id).
  // Restored state belonging to a different identity is discarded.
  ownerId = "anon",
  // Native (Capacitor) bearer-token source. Null on web/guest → cookie-on-
  // upgrade auth. When it yields a token, the socket authenticates first
  // (US #26 / ADR 0014). Injectable for tests.
  getAuthToken: () => string | null = () => null,
) {
  let _ws: WsClient<SoloClientMessage> | null = null;
  let _pingTimeout: ReturnType<typeof setTimeout> | null = null;
  let _authToken: string | null = null;
  // Current question's anti-replay nonce, echoed on solo:answer (CHEAT-7).
  let _questionNonce: string | undefined;
  // Secret from solo:ready; echoed on solo:resume to reclaim the session (CHEAT-1).
  let _resumeToken: string | undefined;

  const store = {
    // Setup state
    phase: "setup" as "setup" | "playing" | "result",
    categories: JSON.parse(topicDataJson) as {
      id: string;
      name: string;
      icon: string;
      count: number;
    }[],
    selectedCategories: [] as string[],
    timer: 30 as TimerDuration,
    questionCount: 10 as QuestionsPerRound,
    mode: "normal" as "normal" | "endless",
    difficulty: "all" as DifficultyFilter,
    errors: [] as string[],
    // Set when a guest hits an entitlement wall on submit — US #16/#29. The
    // page toasts `reason` and folds `upgradeHint` into the guest CTA's subline.
    guestLimit: null as { reason: string; upgradeHint: string } | null,
    avatarSrc: profileAvatarSrc,
    isGuest,

    // Playing state (mirrors server)
    questions: [] as QuizQuestion[],
    currentIndex: 0,
    totalAnswered: 0,
    strikes: 0,
    timeRemaining: 0,
    answered: false,
    selectedAnswerId: null as string | null,
    correctAnswerId: "",
    displayMediaUrl: "" as string,
    score: 0,
    /** Points earned on the last round (server score delta) — drives the
     *  IdentityPill "+N" fly-up cue, same as multiplayer's QuizSession field. */
    lastPointsEarned: 0,
    showingAnswer: false,
    // How the last answer was submitted — drives whether the continue button
    // takes focus on reveal (#1099). Reset when a new question arrives.
    lastAnswerInput: null as "keyboard" | "pointer" | null,
    timerTransition: false,
    streak: 0,
    // Streak flourish (gain/loss/near-miss/best/life-spent) — `streakNonce`
    // bumps on every event so the UI replays it even when the same one recurs.
    streakFlourish: null as {
      kind: "gain" | "loss" | "near-miss" | "best" | "life-spent";
      value: number;
    } | null,
    streakNonce: 0,
    // "% of players you beat on time" for the last correct answer (US #11); null
    // when not applicable.
    fasterThanPercent: null as number | null,
    // The curator's explanation, revealed alongside the round result (map
    // #912, decision 2) — undefined while playing and cleared per question.
    postAnswerNote: undefined as string | undefined,

    totalQuestions: null as number | null,
    sessionId: null as string | null,
    // Claimable persisted session id for a finished guest run (link on signup).
    claimId: null as string | null,
    // True while attempting to resume a server session after a refresh/drop.
    reconnecting: false,

    // Image matching state
    matchItems: null as { left: string[]; right: string[] } | null,
    selectedLeftItem: null as string | null,
    selectedRightItem: null as string | null,

    // Result state
    results: [] as QuestionResult[],
    finalData: null as SoloFinalMessage | null,

    // Computed getters
    get currentQuestion(): QuizQuestion | null {
      return this.questions[this.currentIndex] ?? null;
    },

    get questionCounter(): string | undefined {
      if (this.mode === "endless") return undefined;
      const total = this.totalQuestions ?? this.questions.length;
      return `${this.currentIndex + 1} of ${total}`;
    },

    get progressPercent(): number {
      const total = this.totalQuestions ?? this.questions.length;
      if (total === 0) return 0;
      return ((this.currentIndex + 1) / total) * 100;
    },

    get answerTimeText(): string {
      return `${this.timer} seconds`;
    },

    get categoryCountText(): string {
      const count = this.selectedCategories.length;
      return `${count} ${count === 1 ? "category" : "categories"}`;
    },

    get totalQuestionPool(): string {
      return calculateTotalQuestionPool(
        this.selectedCategories,
        this.categories,
      );
    },

    get questionsPerRound(): number | string {
      if (this.mode === "endless") return "∞";
      return this.questionCount;
    },

    get maxGameTime(): string {
      if (this.selectedCategories.length === 0) return "—";
      if (this.mode === "endless") return "∞";
      return calculateMaxGameTime(this.questionCount, this.timer);
    },

    get poolWarning(): string | null {
      if (this.mode === "endless") return null;
      if (this.selectedCategories.length === 0) return null;
      const pool = this.categories
        .filter((c) => this.selectedCategories.includes(c.id))
        .reduce((sum, c) => sum + c.count, 0);
      if (pool < this.questionCount)
        return `Only ${pool} ${pool === 1 ? "question" : "questions"} available — game will use all of them`;
      return null;
    },

    get isFormValid() {
      return (
        this.selectedCategories.length > 0 &&
        this.timer > 0 &&
        (this.mode === "endless" || this.questionCount > 0)
      );
    },

    get isObserver(): boolean {
      return false;
    },

    get questionType(): string {
      return this.currentQuestion?.type ?? "text_choice";
    },

    get answers(): { id: string; text: string }[] {
      return this.currentQuestion?.answers ?? [];
    },

    // ─── Internal WS helpers ────────────────────────────────────────────────

    _createWs(handlers: {
      onOpen: () => void;
      onClose?: () => void;
      onError?: () => void;
    }) {
      const url = buildWsUrl();
      if (!url) return;
      _ws = new WsClient<SoloClientMessage>(url, {
        onMessage: (msg) => this._dispatch(msg),
        onOpen: handlers.onOpen,
        onClose: handlers.onClose ?? (() => {}),
        onError:
          handlers.onError ??
          (() => {
            this.errors = ["Connection error — check your connection"];
          }),
      });
      _ws.connect();
    },

    _sendResume() {
      const sid = this.sessionId;
      if (sid)
        this._wsSend({
          type: "solo:resume",
          sessionId: sid,
          resumeToken: _resumeToken,
        });
    },

    _wsConnect(token?: string) {
      if (_ws && (_ws.isConnected() || _ws.status === "connecting")) return;
      _authToken = token ?? null;
      this._createWs({
        onOpen: () => {
          if (_authToken) {
            this._wsSend({ type: "auth", token: _authToken });
          } else {
            this._sendStart();
          }
        },
        onClose: () => {
          if (this.phase === "playing" || this.showingAnswer) {
            this.errors = ["Connection lost — reconnecting…"];
            setTimeout(() => {
              if (this.phase === "playing" || this.showingAnswer) {
                this._wsReconnect();
              }
            }, 1000);
          }
        },
      });
    },

    _wsDisconnect() {
      if (_pingTimeout) clearTimeout(_pingTimeout);
      _pingTimeout = null;
      _ws?.disconnect();
      _ws = null;
    },

    _wsSend(msg: SoloClientMessage) {
      _ws?.send(msg);
    },

    _wsReconnect() {
      if (_ws && (_ws.isConnected() || _ws.status === "connecting")) return;
      // Default no-op onClose: don't recurse-reconnect after second failure.
      this._createWs({ onOpen: () => this._sendResume() });
    },

    /**
     * Parse-and-dispatch entry retained for the test seam (it feeds raw JSON
     * strings). The live socket path delivers already-parsed frames straight to
     * {@link _dispatch} via WsClient.
     */
    _handleServerMessage(raw: string) {
      let msg: { type: string } & Record<string, unknown>;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      this._dispatch(msg);
    },

    _dispatch(msg: { type: string } & Record<string, unknown>) {
      switch (msg.type) {
        case "solo:ready":
          this.isGuest = (msg.isGuest as boolean) ?? true;
          this.sessionId = (msg.sessionId as string) ?? null;
          _resumeToken = msg.resumeToken as string | undefined;
          // Authed (token) flow sends start in response to ready. The cookie/guest
          // flow already sent start on open, so don't re-send here.
          if (_authToken) this._sendStart();
          break;

        case "solo:question": {
          const q = msg.question as QuizQuestion;
          const idx = msg.questionIndex as number;
          _questionNonce = msg.nonce as string | undefined;
          this.questions =
            this.questions.length === 0 || idx === 0
              ? [q]
              : [...this.questions.slice(0, idx), q];
          this.currentIndex = idx;
          this.totalQuestions = (msg.totalQuestions as number | null) ?? null;
          this.answered = false;
          this.selectedAnswerId = null;
          this.correctAnswerId = "";
          this.lastAnswerInput = null;
          this.fasterThanPercent = null;
          this.postAnswerNote = undefined;
          this.showingAnswer = false;
          this.lastPointsEarned = 0;
          this.timeRemaining = msg.timeRemaining as number;
          this.displayMediaUrl = q.mediaUrl ?? "";
          this.matchItems =
            q.type === "image_matching" ? (q.matchItems ?? null) : null;
          this.selectedLeftItem = null;
          this.selectedRightItem = null;
          this.timerTransition = false;
          requestAnimationFrame(() => {
            this.timerTransition = true;
          });
          this.phase = "playing";
          this.reconnecting = false;
          this.errors = [];
          this._persist();
          break;
        }

        case "solo:tick":
          this.timeRemaining = msg.timeRemaining as number;
          break;

        case "solo:round-result": {
          const res = msg as unknown as SoloRoundResultMessage;
          this.correctAnswerId = res.correctAnswerId;
          this.score = res.totalScore;
          this.lastPointsEarned = res.score;
          this.streak = res.streak;
          this.strikes = res.strikes;
          this.fasterThanPercent = res.fasterThanPercent;
          this.postAnswerNote = res.postAnswerNote;
          this.showingAnswer = true;
          this.answered = true;
          this.reconnecting = false;
          // On a resume the question message cleared our selection; restore it
          // from the server so the reveal highlights the player's own answer.
          if (res.selectedAnswerId && !this.selectedAnswerId) {
            this.selectedAnswerId = res.selectedAnswerId;
          }
          const q = this.currentQuestion;
          // Skip if this question is already recorded (resume re-emits the result).
          if (q && this.results.length <= this.currentIndex) {
            const qType = q.type;
            this.results.push({
              questionId: q.id,
              text: q.text,
              correct: res.isCorrect,
              selectedAnswer: this.selectedAnswerId
                ? formatCorrectAnswer(
                    this.selectedAnswerId,
                    qType,
                    q.answers as {
                      id: string;
                      text: string;
                      isCorrect?: boolean;
                    }[],
                  )
                : null,
              correctAnswer: formatCorrectAnswer(
                res.correctAnswerId,
                qType,
                q.answers as {
                  id: string;
                  text: string;
                  isCorrect?: boolean;
                }[],
              ),
              difficulty: q.difficulty ?? "medium",
            });
          }
          this._persist();
          break;
        }

        case "solo:streak":
          this.streak = msg.streak as number;
          this.streakFlourish = {
            kind: "gain",
            value: msg.milestone as number,
          };
          this.streakNonce++;
          break;

        case "solo:streak-lost":
          this.streak = msg.streak as number;
          this.streakFlourish = {
            kind: "loss",
            value: msg.lostStreak as number,
          };
          this.streakNonce++;
          break;

        case "solo:streak-near-miss":
          this.streak = msg.streak as number;
          this.streakFlourish = {
            kind: "near-miss",
            value: msg.lostStreak as number,
          };
          this.streakNonce++;
          break;

        case "solo:streak-best":
          this.streak = msg.streak as number;
          this.streakFlourish = { kind: "best", value: msg.streak as number };
          this.streakNonce++;
          break;

        case "solo:life-spent":
          this.streak = msg.streak as number;
          this.streakFlourish = {
            kind: "life-spent",
            value: msg.livesRemaining as number,
          };
          this.streakNonce++;
          break;

        case "solo:final": {
          const fin = msg as unknown as SoloFinalMessage;
          this.finalData = fin;
          this.claimId = fin.claimId;
          // The image/source/note never rode the wire before now (map #912)
          // — fold them into the already-built review rows by question id.
          const extrasByQuestion = new Map(
            fin.results.map((r) => [r.questionId, r] as const),
          );
          this.results = this.results.map((r) => {
            const extras = extrasByQuestion.get(r.questionId);
            return extras
              ? {
                  ...r,
                  mediaUrl: extras.mediaUrl,
                  mediaType: extras.mediaType,
                  source: extras.source,
                  postAnswerNote: extras.postAnswerNote,
                  alreadyFlagged: extras.alreadyFlagged,
                }
              : r;
          });
          this.phase = "result";
          this.reconnecting = false;
          this._wsDisconnect();
          // Keep the results (stats + review + claim handle) for a seamless
          // refresh on the results/leaderboard screens.
          this._persist();
          break;
        }

        case "solo:ping":
          this._wsSend({ type: "solo:pong" });
          break;

        case "solo:error":
          // A failed resume (stale/expired session) drops us back to setup
          // rather than surfacing a scary error mid-reconnect.
          if (msg.code === "session_expired" && this.reconnecting) {
            this._failResume();
            break;
          }
          this.errors = [(msg.message as string) ?? "An error occurred"];
          break;

        case "solo:guest-limit":
          this.guestLimit = {
            reason: msg.reason as string,
            upgradeHint: msg.upgradeHint as string,
          };
          break;
      }
    },

    _sendStart() {
      this._wsSend({
        type: "solo:start",
        categoryIds: this.selectedCategories,
        timerDuration: this.timer,
        questionCount: this.questionCount,
        mode: this.mode,
        difficulty: this.difficulty,
        device: detectDevice(),
      });
    },

    // ─── Public interface ────────────────────────────────────────────────────

    init() {
      // Restore across a full refresh: a finished run keeps its results screen;
      // an in-flight run resumes its WebSocket session (review list included).
      const stored = readStoredState();
      if (!stored) return;

      // Saved state belongs to whoever was playing. If the current identity
      // differs — signed in, signed out, or switched accounts — it's stale and
      // must not resurrect the old results screen or the wrong guest/CTA state.
      if (stored.ownerId !== ownerId) {
        writeStoredState(null);
        return;
      }

      this.claimId = stored.claimId;
      this.results = stored.results ?? [];

      if (stored.phase === "result" && stored.finalData) {
        this.finalData = stored.finalData;
        this.score = stored.finalData.totalScore;
        this.phase = "result";
        return;
      }
      if (stored.phase === "playing" && stored.sessionId) {
        this.sessionId = stored.sessionId;
        // Restore the resume secret before resuming — the server binds the
        // resume to it, so without it a guest/native session can't reconnect
        // after a full refresh.
        _resumeToken = stored.resumeToken;
        this.phase = "playing"; // hold on /solo/play while we resume
        this._attemptResume();
      }
    },

    _persist() {
      if (this.phase !== "playing" && this.phase !== "result") return;
      writeStoredState({
        phase: this.phase,
        sessionId: this.phase === "playing" ? this.sessionId : null,
        resumeToken: this.phase === "playing" ? _resumeToken : undefined,
        claimId: this.claimId,
        isGuest: this.isGuest,
        ownerId,
        finalData: this.phase === "result" ? this.finalData : null,
        results: [...this.results],
      });
    },

    clearPersisted() {
      writeStoredState(null);
    },

    _attemptResume() {
      if (!buildWsUrl()) return; // SSR guard before flipping reconnecting
      this.reconnecting = true;
      this._createWs({
        onOpen: () => this._sendResume(),
        onClose: () => {
          if (this.reconnecting) this._failResume();
        },
        onError: () => {
          if (this.reconnecting) this._failResume();
        },
      });

      // Safety net if the server never answers the resume.
      setTimeout(() => {
        if (this.reconnecting) this._failResume();
      }, 6000);
    },

    _failResume() {
      this.reconnecting = false;
      this.sessionId = null;
      writeStoredState(null);
      this._wsDisconnect();
      this.phase = "setup";
    },

    reportErrors(messages: string[]) {
      this.errors = messages;
    },

    validate(): boolean {
      const errs = validateQuizSetup({
        selectedCategories: this.selectedCategories,
        timer: this.timer,
        ...(this.mode !== "endless"
          ? { questionsPerRound: this.questionCount }
          : {}),
        difficulty: this.difficulty,
      });
      this.reportErrors(errs);
      return errs.length === 0;
    },

    async startQuiz(e?: Event) {
      e?.preventDefault();
      if (!this.validate()) return;

      this.errors = [];
      this.guestLimit = null;
      this.results = [];
      this.score = 0;
      this.currentIndex = 0;
      this.totalAnswered = 0;
      this.strikes = 0;
      this.streak = 0;
      this.streakFlourish = null;
      this.streakNonce = 0;
      this.claimId = null;
      this.questions = [];
      writeStoredState(null);

      // Native: authenticate with a bearer token as the first message (cross-
      // origin, no cookie). Web/guest: token is null and the server resolves
      // identity from the session cookie on the upgrade (ADR 0014).
      const token = getAuthToken();
      this._wsConnect(token ?? undefined);
    },

    selectAnswer(answerId: string, input: "keyboard" | "pointer" = "pointer") {
      if (this.answered || this.showingAnswer) return;
      this.answered = true;
      this.selectedAnswerId = answerId;
      this.lastAnswerInput = input;
      this._wsSend({ type: "solo:answer", answerId, nonce: _questionNonce });
    },

    selectMatchItem(
      column: "left" | "right",
      item: string,
      input: "keyboard" | "pointer" = "pointer",
    ) {
      if (this.answered || this.showingAnswer) return;
      const result = selectMatchItemHelper(this, column, item);
      this.selectedLeftItem = result.selectedLeftItem;
      this.selectedRightItem = result.selectedRightItem;
      if (result.answerId) this.selectAnswer(result.answerId, input);
    },

    advance() {
      if (!this.showingAnswer) return;
      this.showingAnswer = false;
      this.totalAnswered++;
      this._wsSend({ type: "solo:next" });
    },

    endRound() {
      this._wsDisconnect();
      this.reconnecting = false;
      writeStoredState(null);
      this.phase = "result";
    },

    playAgain() {
      this._wsDisconnect();
      this.reconnecting = false;
      this.claimId = null;
      writeStoredState(null);
      this.phase = "setup";
      this.questions = [];
      this.results = [];
      this.score = 0;
      this.currentIndex = 0;
      this.totalAnswered = 0;
      this.strikes = 0;
      this.streak = 0;
      this.streakFlourish = null;
      this.streakNonce = 0;
      this.errors = [];
      this.finalData = null;
      this.totalQuestions = null;
      this.sessionId = null;
    },

    handleKeyDown(e: KeyboardEvent) {
      // During the answer reveal, Enter/Space advances to the next question.
      if (this.showingAnswer) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.advance();
        }
        return;
      }
      if (this.phase !== "playing" || this.answered) return;
      const key = e.key;
      const qType = this.currentQuestion?.type ?? "text_choice";
      if (qType === "image_matching") return;
      if (qType === "true_false") {
        if (key === "t" || key === "T") {
          const a = this.currentQuestion?.answers.find((a) =>
            isTrueAnswerText(a.text),
          );
          if (a) this.selectAnswer(a.id, "keyboard");
        } else if (key === "f" || key === "F") {
          const a = this.currentQuestion?.answers.find((a) =>
            isFalseAnswerText(a.text),
          );
          if (a) this.selectAnswer(a.id, "keyboard");
        }
        return;
      }
      if (key >= "1" && key <= "4") {
        const index = parseInt(key, 10) - 1;
        const answer = this.currentQuestion?.answers[index];
        if (answer) this.selectAnswer(answer.id, "keyboard");
      }
    },

    // Tab focus/blur tracking
    onTabBlur() {
      this._wsSend({ type: "solo:tab-blur" });
    },

    onTabFocus() {
      this._wsSend({ type: "solo:tab-focus" });
    },

    drawMatchLines(container?: HTMLElement | null) {
      const el =
        container ??
        (document.querySelector(
          "[data-match-container]",
        ) as HTMLElement | null);
      if (!el) return;
      const root = document.documentElement;
      const css = (v: string) =>
        getComputedStyle(root).getPropertyValue(v).trim();
      drawMatchLinesHelper(
        el,
        this.correctAnswerId,
        this.selectedAnswerId,
        css("--color-success"),
        css("--color-danger"),
      );
    },

    getCategoryBadge(): string {
      return this.currentQuestion?.categoryId.replace(/-/g, " ") ?? "";
    },

    getTimerRingOffset(): string {
      const circumference = 2 * Math.PI * 28;
      if (this.timerState() === "timeout") return `${circumference.toFixed(2)}`;
      const fraction = this.timeRemaining / this.timer;
      return `${(circumference * (1 - fraction)).toFixed(2)}`;
    },

    isTimerLow(): boolean {
      return this.timeRemaining <= 5;
    },

    timerState(): TimerState {
      if (this.showingAnswer) {
        if (!this.selectedAnswerId) return "timeout";
        return this.selectedAnswerId === this.correctAnswerId
          ? "correct"
          : "incorrect";
      }
      return this.isTimerLow() ? "low" : "counting";
    },

    timerRingColor(): string {
      const s = this.timerState();
      if (s === "correct") return "stroke-green-500";
      if (s === "incorrect" || s === "low") return "stroke-red-500";
      if (s === "timeout") return "stroke-amber-500";
      return "stroke-violet-500";
    },

    timerStrokeColor(): string {
      const s = this.timerState();
      if (s === "correct") return "stroke-green-500/25";
      if (s === "incorrect" || s === "low") return "stroke-red-500/25";
      if (s === "timeout") return "stroke-amber-500";
      return "stroke-violet-500/25";
    },

    timerTextColor(): string {
      const s = this.timerState();
      if (s === "correct") return "text-green-400";
      if (s === "incorrect" || s === "low") return "text-red-400";
      if (s === "timeout") return "text-amber-300";
      return "text-gray-100";
    },

    getResultIcon(r: {
      correct: boolean;
      selectedAnswer: string | null;
    }): string {
      if (r.correct) return "✓";
      if (r.selectedAnswer === null) return "—";
      return "✗";
    },

    getResultClass(r: {
      correct: boolean;
      selectedAnswer: string | null;
    }): string {
      if (r.correct) return "text-green-400";
      if (r.selectedAnswer === null) return "text-yellow-400";
      return "text-red-400";
    },

    getAnswerClass(answerId: string): string {
      return getAnswerButtonClassHelper(answerId, this);
    },

    destroy() {
      this._wsDisconnect();
    },
  };

  return store;
}

export type SoloModeStore = ReturnType<typeof createSoloModeStore>;
