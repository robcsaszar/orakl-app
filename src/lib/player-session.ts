/**
 * Player session transport — one bidirectional WebSocket to /api/game/ws,
 * multiplexing lobby + game + approval frames in and carrying player actions
 * out. Replaces the prior dual-SSE + POST model. Identity is bound at the
 * upgrade (game_token cookie on web; first-message bearer on native), so connect
 * takes no playerId. Snapshot replay + reconnect re-activation happen server-side
 * on (re)connect, so there is no separate state-restore round-trip.
 */
import { WsClient, type WsMessage, type WsStatus } from "@orakl/client-core";
import type { ClientMessage } from "@orakl/protocol";
import { releaseWakeLock as defaultReleaseWakeLock } from "./wakeLock.js";
import { buildWsUrl } from "./ws-url.js";

export type { WsMessage as SSEMessage, WsStatus };
export type GameMessage = WsMessage;

export interface PlayerSessionCallbacks {
  onMessage: (msg: GameMessage) => void;
  /** Connection status changes — drives the reconnecting affordance. */
  onStatus?: (status: WsStatus) => void;
  /** Terminal connection failure (policy close / attempts exhausted) — the
   *  socket has stopped retrying, so the consumer should surface a dead-end. */
  onFatal?: (info: { code: number; reason: string }) => void;
}

export interface PlayerSessionDeps {
  /** Native (Capacitor) bearer-token source; null on web/guest → cookie auth. */
  getAuthToken?: () => string | null;
  releaseWakeLock?: () => Promise<void>;
  /** Test seam: build the underlying client (defaults to a real WsClient). */
  createClient?: (
    url: string,
    opts: ConstructorParameters<typeof WsClient<ClientMessage>>[1],
  ) => WsClient<ClientMessage>;
  /** Test override for the socket URL. */
  url?: string;
  /**
   * Lobby code to put on the upgrade URL (`?code=`), read at connect time.
   * Cookie clients already carry it in game_token; native/display clients
   * authenticate on the first frame, so this is the only way the server can
   * owner-route their upgrade before the handshake (ADR 0024).
   */
  lobbyCode?: () => string | null;
}

export interface PlayerSession {
  /** Open the game socket (auto-reconnecting). Safe to call repeatedly. */
  connect(): void;
  /** Send a player/curator action frame. No-op until the socket is open. */
  send(msg: ClientMessage): void;
  isConnected(): boolean;
  /** Close the socket and stop reconnecting. */
  destroy(): void;
}

function buildGameWsUrl(lobbyCode: string | null): string {
  return buildWsUrl(
    "/api/game/ws",
    lobbyCode ? { code: lobbyCode } : undefined,
  );
}

export function createPlayerSession(
  callbacks: PlayerSessionCallbacks,
  deps?: PlayerSessionDeps,
): PlayerSession {
  const releaseWakeLockFn = deps?.releaseWakeLock ?? defaultReleaseWakeLock;
  const getAuthToken = deps?.getAuthToken ?? (() => null);
  let client: WsClient<ClientMessage> | null = null;

  function makeClient(): WsClient<ClientMessage> {
    const url = deps?.url ?? buildGameWsUrl(deps?.lobbyCode?.() ?? null);
    const opts = {
      onMessage: (m: WsMessage) => {
        // Keepalive: answer the server's game:ping with a pong so the round-trip
        // documented in ADR 0016 actually exists; swallow it from consumers.
        if (m.type === "game:ping") {
          client?.send({ type: "pong" });
          return;
        }
        callbacks.onMessage(m);
      },
      onOpen: (send: (m: ClientMessage) => void) => {
        // Native/cross-origin: authenticate first. Web rides the cookie on the
        // upgrade and sends nothing — the server replays the snapshot.
        const token = getAuthToken();
        if (token) send({ type: "auth", token });
      },
      onStatus: (s: WsStatus) => callbacks.onStatus?.(s),
      onError: () => {
        void releaseWakeLockFn();
      },
      onFatal: (info: { code: number; reason: string }) =>
        callbacks.onFatal?.(info),
      autoReconnect: true,
    };
    return deps?.createClient
      ? deps.createClient(url, opts)
      : new WsClient<ClientMessage>(url, opts);
  }

  return {
    connect() {
      if (!client) client = makeClient();
      client.connect();
    },
    send(msg: ClientMessage) {
      client?.send(msg);
    },
    isConnected() {
      return client?.isConnected() ?? false;
    },
    destroy() {
      client?.disconnect();
      client = null;
    },
  };
}
