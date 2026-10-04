/**
 * Typed WebSocket client wrapper — the shared client transport for solo and
 * multiplayer.
 *
 * It owns the parts every WebSocket consumer would otherwise re-implement:
 * socket construction (SSR-safe), JSON framing on send/receive, lifecycle
 * callbacks, and an optional backoff reconnect loop. Consumers keep their
 * protocol semantics — what to send on open (auth / start / resume), what to do
 * on a terminal failure — in the callbacks, so the same client serves solo
 * today and multiplayer next.
 *
 * Unlike a value-mirror store, inbound frames are delivered parsed to
 * `onMessage` for discriminated-union dispatch (`switch (msg.type)`), never
 * collapsed into a single "last message" value.
 *
 * The socket is the platform's global `WebSocket`. `WsSocketLike` below
 * declares only the surface this class touches — the browser's `WebSocket`
 * and React Native's global `WebSocket` both satisfy it structurally.
 */

interface WsSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event?: { code?: number; reason?: string }) => void) | null;
}

interface WsSocketConstructor {
  new (url: string): WsSocketLike;
  readonly CONNECTING: number;
  readonly OPEN: number;
  readonly CLOSING: number;
  readonly CLOSED: number;
}

declare const WebSocket: WsSocketConstructor | undefined;

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}

export type WsStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed";

export interface WsClientOptions<Out extends { type: string } = WsMessage> {
  /** Dispatch target for every parsed inbound frame. */
  onMessage: (message: WsMessage) => void;
  /**
   * Fired once the socket opens, with a typed `send`. Do the auth / start /
   * resume handshake here — it runs on every (re)connect, so it's the single
   * place to re-establish protocol state after a drop.
   */
  onOpen?: (send: (message: Out) => void) => void;
  /**
   * Fired when the socket closes. `intentional` is true only for a
   * {@link WsClient.disconnect} call, letting consumers distinguish a deliberate
   * teardown from a dropped connection.
   */
  onClose?: (info: { intentional: boolean }) => void;
  onError?: (error: unknown) => void;
  /** Fired on every status transition — drives a single reconnecting affordance. */
  onStatus?: (status: WsStatus) => void;
  /**
   * Reopen with backoff after an unintentional close. Off by default: consumers
   * that own bespoke resume logic (like solo) keep control and wire their own
   * reconnect in `onClose`.
   */
  autoReconnect?: boolean;
  /**
   * Backoff schedule (ms); the last entry repeats. Shape borrowed from
   * svelte-websocket-store. Only consulted when `autoReconnect` is set.
   */
  reopenDelays?: number[];
  /**
   * Terminal failure — fired instead of reconnecting when the server closes
   * with a fatal code (see `fatalCloseCodes`) or `maxReopenAttempts` is
   * exhausted. Lets a consumer surface a dead-end (e.g. route back to /join)
   * instead of spinning on "Reconnecting…" forever.
   */
  onFatal?: (info: { code: number; reason: string }) => void;
  /**
   * Close codes treated as permanent: don't reconnect, fire `onFatal`. Default
   * `[1008]` — the server's policy-violation close (unknown player / auth
   * failed / lobby gone) which would otherwise loop reopen→reject→reopen.
   */
  fatalCloseCodes?: number[];
  /** Give up (fire `onFatal`) after this many failed reopen attempts. Default: unbounded. */
  maxReopenAttempts?: number;
  /**
   * Treat an open socket as dead after this many ms with no inbound frame:
   * drop it and run the reopen path. Catches a half-open socket that never
   * fires `onclose`. Set it above the server's ping interval. Default: off.
   */
  idleTimeoutMs?: number;
}

// Faster first retry than svelte-websocket-store's 2s, then a comparable climb.
const DEFAULT_REOPEN_DELAYS = [1000, 2000, 5000, 10000, 30000];

export class WsClient<Out extends { type: string } = WsMessage> {
  private resolveUrl: () => string;
  private ws: WsSocketLike | null = null;
  private reopenDelays: number[];
  private reopenCount = 0;
  private reopenTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;
  private _status: WsStatus = "idle";
  private fatalCloseCodes: number[];
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private options: WsClientOptions<Out>;

  constructor(url: string | (() => string), options: WsClientOptions<Out>) {
    this.options = options;
    this.resolveUrl = typeof url === "function" ? url : () => url;
    this.reopenDelays = options.reopenDelays ?? DEFAULT_REOPEN_DELAYS;
    this.fatalCloseCodes = options.fatalCloseCodes ?? [1008];
  }

  private setStatus(status: WsStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.options.onStatus?.(status);
  }

  get status(): WsStatus {
    return this._status;
  }

  isConnected(): boolean {
    return (
      typeof WebSocket !== "undefined" && this.ws?.readyState === WebSocket.OPEN
    );
  }

  /** Send a typed message. No-op unless the socket is open (mirrors the raw guard). */
  send(message: Out): void {
    if (
      typeof WebSocket !== "undefined" &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /** Open the socket. Idempotent while connecting/open. SSR-safe (no-op). */
  connect(): void {
    if (typeof WebSocket === "undefined") return; // SSR / non-browser
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }
    if (this.reopenTimer) {
      clearTimeout(this.reopenTimer);
      this.reopenTimer = null;
    }
    this.intentionallyClosed = false;

    const url = this.resolveUrl();
    if (!url) return;

    this.setStatus(this._status === "closed" ? "reconnecting" : "connecting");

    let socket: WsSocketLike;
    try {
      socket = new WebSocket(url);
    } catch {
      this.setStatus("closed");
      this.options.onError?.({ type: "error" });
      this.scheduleReopen();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.reopenCount = 0;
      this.armIdleTimer(socket);
      this.setStatus("open");
      this.options.onOpen?.((m) => this.send(m));
    };

    socket.onmessage = (event: { data: unknown }) => {
      this.armIdleTimer(socket);
      let parsed: WsMessage;
      try {
        parsed = JSON.parse(event.data as string) as WsMessage;
      } catch {
        return; // ignore malformed frames
      }
      this.options.onMessage(parsed);
    };

    socket.onerror = (error: unknown) => {
      this.options.onError?.(error);
    };

    socket.onclose = (event?: { code?: number; reason?: string }) => {
      this.clearIdleTimer();
      this.ws = null;
      const intentional = this.intentionallyClosed;
      this.setStatus("closed");
      this.options.onClose?.({ intentional });
      if (intentional) return;
      const code = event?.code ?? 0;
      // A policy close (1008: unknown player / auth failed / lobby gone) is
      // permanent — reconnecting just loops reopen→reject. Surface it instead.
      if (this.options.autoReconnect && this.fatalCloseCodes.includes(code)) {
        this.options.onFatal?.({ code, reason: event?.reason ?? "" });
        return;
      }
      this.scheduleReopen();
    };
  }

  /** Close the socket and suppress auto-reconnect. */
  disconnect(): void {
    this.intentionallyClosed = true;
    this.clearIdleTimer();
    if (this.reopenTimer) {
      clearTimeout(this.reopenTimer);
      this.reopenTimer = null;
    }
    const socket = this.ws;
    this.ws = null;
    if (socket) socket.close();
    this.setStatus("closed");
  }

  private scheduleReopen(): void {
    if (!this.options.autoReconnect) return;
    if (this.intentionallyClosed) return;
    if (
      this.options.maxReopenAttempts !== undefined &&
      this.reopenCount >= this.options.maxReopenAttempts
    ) {
      this.options.onFatal?.({ code: 0, reason: "max reconnect attempts" });
      return;
    }
    const delay =
      this.reopenDelays[
        Math.min(this.reopenCount, this.reopenDelays.length - 1)
      ];
    this.reopenCount++;
    this.setStatus("reconnecting");
    this.reopenTimer = setTimeout(() => {
      this.reopenTimer = null;
      if (!this.intentionallyClosed) this.connect();
    }, delay);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /** (Re)start the idle watchdog for `socket`; no-op unless `idleTimeoutMs` is set. */
  private armIdleTimer(socket: WsSocketLike): void {
    const ms = this.options.idleTimeoutMs;
    if (ms === undefined) return;
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      if (this.ws !== socket) return;
      // A half-open socket may not fire onclose for minutes; detach it so a
      // late close event cannot schedule a second reopen.
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      this.ws = null;
      socket.close();
      this.setStatus("closed");
      this.options.onClose?.({ intentional: false });
      this.scheduleReopen();
    }, ms);
  }
}
