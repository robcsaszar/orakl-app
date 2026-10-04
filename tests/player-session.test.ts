import type { WsClient } from "@orakl/client-core";
import type { ClientMessage } from "@orakl/protocol";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPlayerSession,
  type PlayerSessionCallbacks,
} from "../src/lib/player-session.js";

type Opts = ConstructorParameters<typeof WsClient<ClientMessage>>[1];

function makeFakeClient() {
  const connect = vi.fn();
  const send = vi.fn();
  const disconnect = vi.fn();
  let captured: Opts | undefined;
  const createClient = vi.fn((_url: string, opts: Opts) => {
    captured = opts;
    return {
      connect,
      send,
      disconnect,
      isConnected: () => true,
    } as unknown as WsClient<ClientMessage>;
  });
  return { createClient, connect, send, disconnect, opts: () => captured };
}

let callbacks: PlayerSessionCallbacks;

beforeEach(() => {
  callbacks = { onMessage: vi.fn(), onStatus: vi.fn() };
});

describe("connect()", () => {
  it("opens one socket at the given url", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x/api/game/ws",
    });
    session.connect();
    expect(c.createClient).toHaveBeenCalledWith(
      "ws://x/api/game/ws",
      expect.any(Object),
    );
    expect(c.connect).toHaveBeenCalledTimes(1);
  });

  it("arms the idle watchdog at 65 s", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
    });
    session.connect();
    expect(c.opts()?.idleTimeoutMs).toBe(65_000);
  });

  it("reuses the same client on a second connect()", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
    });
    session.connect();
    session.connect();
    expect(c.createClient).toHaveBeenCalledTimes(1);
    expect(c.connect).toHaveBeenCalledTimes(2);
  });

  it("routes inbound frames to onMessage", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
    });
    session.connect();
    c.opts()?.onMessage({ type: "lobby:update" });
    expect(callbacks.onMessage).toHaveBeenCalledWith({ type: "lobby:update" });
  });

  it("routes status changes to onStatus", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
    });
    session.connect();
    c.opts()?.onStatus?.("reconnecting");
    expect(callbacks.onStatus).toHaveBeenCalledWith("reconnecting");
  });
});

describe("auth handshake", () => {
  it("sends an auth frame on open when a native token is sourced", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
      getAuthToken: () => "native-token",
    });
    session.connect();
    const sent: ClientMessage[] = [];
    c.opts()?.onOpen?.((m) => sent.push(m));
    expect(sent).toEqual([{ type: "auth", token: "native-token" }]);
  });

  it("sends nothing on open for web (no token — cookie auth)", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
    });
    session.connect();
    const sent: ClientMessage[] = [];
    c.opts()?.onOpen?.((m) => sent.push(m));
    expect(sent).toEqual([]);
  });
});

describe("send()", () => {
  it("forwards an action frame to the client", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
    });
    session.connect();
    session.send({ type: "player:answer", answerId: "a" });
    expect(c.send).toHaveBeenCalledWith({
      type: "player:answer",
      answerId: "a",
    });
  });

  it("is a no-op before connect()", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
    });
    session.send({ type: "player:answer", answerId: "a" });
    expect(c.send).not.toHaveBeenCalled();
  });
});

describe("error / teardown", () => {
  it("releases the wake lock on socket error", () => {
    const c = makeFakeClient();
    const releaseWakeLock = vi.fn().mockResolvedValue(undefined);
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
      releaseWakeLock,
    });
    session.connect();
    c.opts()?.onError?.(new Event("error"));
    expect(releaseWakeLock).toHaveBeenCalledTimes(1);
  });

  it("disconnects the client on destroy()", () => {
    const c = makeFakeClient();
    const session = createPlayerSession(callbacks, {
      createClient: c.createClient,
      url: "ws://x",
    });
    session.connect();
    session.destroy();
    expect(c.disconnect).toHaveBeenCalledTimes(1);
  });
});
