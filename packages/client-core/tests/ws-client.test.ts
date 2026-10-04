import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WsClient, type WsMessage } from "../src/index.js";

// Minimal WebSocket mock — jsdom lacks it. Unlike the solo store's fake, this
// one does NOT auto-fire onopen, so tests drive lifecycle transitions exactly.
class FakeWS {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWS.OPEN;
  url: string;
  sent: string[] = [];
  onopen: ((e?: unknown) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e?: unknown) => void) | null = null;
  onerror: ((e?: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWS.instances.push(this);
    FakeWS.last = this;
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWS.CLOSED;
    this.onclose?.();
  }

  static instances: FakeWS[] = [];
  static last: FakeWS | null = null;
  static reset() {
    FakeWS.instances = [];
    FakeWS.last = null;
  }
}

function installFakeWs() {
  (global as unknown as { WebSocket: typeof FakeWS }).WebSocket = FakeWS;
  FakeWS.reset();
}

describe("WsClient", () => {
  beforeEach(() => {
    installFakeWs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("connect & url", () => {
    it("creates a WebSocket with the given url on connect", () => {
      const client = new WsClient("ws://host/api/x", { onMessage: vi.fn() });
      client.connect();
      expect(FakeWS.last?.url).toBe("ws://host/api/x");
    });

    it("accepts a url factory, resolved at connect time", () => {
      let target = "ws://host/a";
      const client = new WsClient(() => target, { onMessage: vi.fn() });
      target = "ws://host/b";
      client.connect();
      expect(FakeWS.last?.url).toBe("ws://host/b");
    });

    it("does not create a second socket while connecting/open", () => {
      const client = new WsClient("ws://host/x", { onMessage: vi.fn() });
      client.connect();
      client.connect();
      expect(FakeWS.instances).toHaveLength(1);
    });

    it("does not throw or connect in SSR (no WebSocket global)", () => {
      const original = (global as { WebSocket?: unknown }).WebSocket;
      try {
        // @ts-expect-error — simulate SSR
        delete global.WebSocket;
        const client = new WsClient("ws://host/x", { onMessage: vi.fn() });
        expect(() => client.connect()).not.toThrow();
        expect(client.isConnected()).toBe(false);
      } finally {
        (global as { WebSocket?: unknown }).WebSocket = original;
      }
    });
  });

  describe("send", () => {
    it("stringifies and sends when open", () => {
      const client = new WsClient("ws://host/x", { onMessage: vi.fn() });
      client.connect();
      FakeWS.last!.onopen?.();
      client.send({ type: "hello", n: 1 });
      expect(FakeWS.last!.sent).toEqual([
        JSON.stringify({ type: "hello", n: 1 }),
      ]);
    });

    it("is a no-op when the socket is not open", () => {
      const client = new WsClient("ws://host/x", { onMessage: vi.fn() });
      client.connect();
      FakeWS.last!.readyState = FakeWS.CONNECTING;
      client.send({ type: "hello" });
      expect(FakeWS.last!.sent).toHaveLength(0);
    });

    it("exposes a typed send to onOpen for the handshake", () => {
      const client = new WsClient<{ type: "auth"; token: string }>(
        "ws://host/x",
        {
          onMessage: vi.fn(),
          onOpen: (send) => send({ type: "auth", token: "t" }),
        },
      );
      client.connect();
      FakeWS.last!.onopen?.();
      expect(FakeWS.last!.sent).toEqual([
        JSON.stringify({ type: "auth", token: "t" }),
      ]);
    });
  });

  describe("message dispatch", () => {
    it("parses inbound frames and calls onMessage", () => {
      const onMessage = vi.fn();
      const client = new WsClient("ws://host/x", { onMessage });
      client.connect();
      const msg: WsMessage = { type: "tick", t: 5 };
      FakeWS.last!.onmessage?.({ data: JSON.stringify(msg) });
      expect(onMessage).toHaveBeenCalledWith(msg);
    });

    it("ignores malformed frames", () => {
      const onMessage = vi.fn();
      const client = new WsClient("ws://host/x", { onMessage });
      client.connect();
      FakeWS.last!.onmessage?.({ data: "not json" });
      expect(onMessage).not.toHaveBeenCalled();
    });
  });

  describe("close semantics", () => {
    it("fires onClose with intentional=false on an unexpected drop", () => {
      const onClose = vi.fn();
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        onClose,
      });
      client.connect();
      FakeWS.last!.onopen?.();
      FakeWS.last!.onclose?.();
      expect(onClose).toHaveBeenCalledWith({ intentional: false });
    });

    it("fires onClose with intentional=true on disconnect()", () => {
      const onClose = vi.fn();
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        onClose,
      });
      client.connect();
      FakeWS.last!.onopen?.();
      client.disconnect();
      expect(onClose).toHaveBeenCalledWith({ intentional: true });
    });

    it("forwards socket errors to onError", () => {
      const onError = vi.fn();
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        onError,
      });
      client.connect();
      FakeWS.last!.onerror?.(new Event("error"));
      expect(onError).toHaveBeenCalled();
    });
  });

  describe("auto-reconnect", () => {
    it("does NOT reopen by default after a drop", () => {
      const client = new WsClient("ws://host/x", { onMessage: vi.fn() });
      client.connect();
      FakeWS.last!.onopen?.();
      FakeWS.last!.onclose?.();
      expect(FakeWS.instances).toHaveLength(1);
    });

    it("reopens with the configured backoff when enabled", () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(global, "setTimeout");
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        autoReconnect: true,
        reopenDelays: [100, 200],
      });
      client.connect();
      FakeWS.last!.onopen?.();
      FakeWS.last!.onclose?.(); // drop → schedule reopen at 100ms

      const firstDelay = setTimeoutSpy.mock.calls.at(-1)?.[1];
      expect(firstDelay).toBe(100);

      vi.advanceTimersByTime(100);
      expect(FakeWS.instances).toHaveLength(2);
      vi.useRealTimers();
    });

    it("does not reopen after an intentional disconnect even when enabled", () => {
      vi.useFakeTimers();
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        autoReconnect: true,
        reopenDelays: [100],
      });
      client.connect();
      FakeWS.last!.onopen?.();
      client.disconnect();
      vi.advanceTimersByTime(1000);
      expect(FakeWS.instances).toHaveLength(1);
      vi.useRealTimers();
    });
  });

  describe("state", () => {
    it("notifies onStatus on each transition", () => {
      const seen: string[] = [];
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        onStatus: (s) => seen.push(s),
      });
      client.connect();
      FakeWS.last!.onopen?.();
      client.disconnect();
      expect(seen).toEqual(["connecting", "open", "closed"]);
    });

    it("tracks status across the lifecycle", () => {
      const client = new WsClient("ws://host/x", { onMessage: vi.fn() });
      expect(client.status).toBe("idle");
      client.connect();
      expect(client.status).toBe("connecting");
      FakeWS.last!.onopen?.();
      expect(client.status).toBe("open");
      FakeWS.last!.onclose?.();
      expect(client.status).toBe("closed");
    });

    it("reports isConnected() from readyState", () => {
      const client = new WsClient("ws://host/x", { onMessage: vi.fn() });
      expect(client.isConnected()).toBe(false);
      client.connect();
      FakeWS.last!.readyState = FakeWS.OPEN;
      expect(client.isConnected()).toBe(true);
      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });
  });

  describe("fatal close", () => {
    it("fires onFatal on a 1008 policy close and stops reconnecting", () => {
      vi.useFakeTimers();
      const onFatal = vi.fn();
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        autoReconnect: true,
        onFatal,
      });
      client.connect();
      FakeWS.last!.onopen?.();
      FakeWS.last!.onclose?.({ code: 1008, reason: "unknown player" });
      expect(onFatal).toHaveBeenCalledWith({
        code: 1008,
        reason: "unknown player",
      });
      vi.advanceTimersByTime(60000);
      expect(FakeWS.instances.length).toBe(1); // no reconnect attempted
      vi.useRealTimers();
    });

    it("a non-fatal close still reconnects", () => {
      vi.useFakeTimers();
      const onFatal = vi.fn();
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        autoReconnect: true,
        reopenDelays: [10],
        onFatal,
      });
      client.connect();
      FakeWS.last!.onopen?.();
      FakeWS.last!.onclose?.({ code: 1006, reason: "" });
      expect(onFatal).not.toHaveBeenCalled();
      vi.advanceTimersByTime(10);
      expect(FakeWS.instances.length).toBe(2); // reopened
      vi.useRealTimers();
    });

    it("fires onFatal after maxReopenAttempts failed reopens", () => {
      vi.useFakeTimers();
      const onFatal = vi.fn();
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        autoReconnect: true,
        maxReopenAttempts: 2,
        reopenDelays: [10],
        onFatal,
      });
      client.connect();
      // Never fire onopen → reopenCount accumulates across transient closes.
      FakeWS.last!.onclose?.({ code: 1006 }); // count 0<2 → schedule (count→1)
      vi.advanceTimersByTime(10);
      FakeWS.last!.onclose?.({ code: 1006 }); // count 1<2 → schedule (count→2)
      vi.advanceTimersByTime(10);
      FakeWS.last!.onclose?.({ code: 1006 }); // count 2>=2 → onFatal
      expect(onFatal).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe("idle watchdog", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function idleClient(extra: { idleTimeoutMs?: number } = {}) {
      const onStatus = vi.fn();
      const client = new WsClient("ws://host/x", {
        onMessage: vi.fn(),
        onStatus,
        autoReconnect: true,
        reopenDelays: [100],
        ...extra,
      });
      client.connect();
      FakeWS.last!.onopen?.();
      return { client, onStatus };
    }

    it("drops a silent open socket and reopens after the backoff", () => {
      const { client } = idleClient({ idleTimeoutMs: 1000 });
      vi.advanceTimersByTime(1000);
      expect(client.status).toBe("reconnecting");
      expect(FakeWS.instances).toHaveLength(1);
      vi.advanceTimersByTime(100);
      expect(FakeWS.instances).toHaveLength(2);
    });

    it("resets the timer on every inbound frame", () => {
      const { client } = idleClient({ idleTimeoutMs: 1000 });
      vi.advanceTimersByTime(900);
      FakeWS.last!.onmessage?.({ data: JSON.stringify({ type: "x" }) });
      vi.advanceTimersByTime(900);
      expect(client.status).toBe("open");
      expect(FakeWS.instances).toHaveLength(1);
      vi.advanceTimersByTime(100); // 1000 ms after the frame
      expect(client.status).toBe("reconnecting");
    });

    it("never times out without idleTimeoutMs", () => {
      const { client } = idleClient();
      vi.advanceTimersByTime(10 * 60 * 1000);
      expect(client.status).toBe("open");
      expect(FakeWS.instances).toHaveLength(1);
    });

    it("disconnect() clears the timer so nothing reopens", () => {
      const { client } = idleClient({ idleTimeoutMs: 1000 });
      expect(vi.getTimerCount()).toBe(1);
      client.disconnect();
      expect(vi.getTimerCount()).toBe(0);
      vi.advanceTimersByTime(5000);
      expect(FakeWS.instances).toHaveLength(1);
      expect(client.status).toBe("closed");
    });

    it("detaches the dropped socket's handlers", () => {
      const { client } = idleClient({ idleTimeoutMs: 1000 });
      const dropped = FakeWS.last!;
      vi.advanceTimersByTime(1000);
      expect(dropped.onclose).toBeNull();
      expect(client.status).toBe("reconnecting");
    });
  });
});
