// @vitest-environment node
import { EventEmitter } from "node:events";
import type { Server } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { proxyUpgrade } = vi.hoisted(() => ({ proxyUpgrade: vi.fn() }));
vi.mock("../src/lib/ws-proxy.js", () => ({ proxyUpgrade }));

import { attachWsEntry, PROXIED_WS_PATHS } from "../src/lib/ws-entry.js";

function upgrade(server: EventEmitter, url: string) {
  const req = { url, headers: {} };
  const socket = { destroy: vi.fn() };
  const head = Buffer.alloc(0);
  server.emit("upgrade", req, socket, head);
  return { req, socket, head };
}

beforeEach(() => {
  proxyUpgrade.mockClear();
});

describe("attachWsEntry", () => {
  it("drops an upgrade on a path the API does not serve", () => {
    const server = new EventEmitter();
    attachWsEntry(server as unknown as Server, "http://127.0.0.1:3001");
    const { socket } = upgrade(server, "/elsewhere");
    expect(socket.destroy).toHaveBeenCalled();
    expect(proxyUpgrade).not.toHaveBeenCalled();
  });

  it("proxies both listed paths to the API origin", () => {
    const server = new EventEmitter();
    attachWsEntry(
      server as unknown as Server,
      "http://orakl-api.internal:3001",
    );
    const solo = upgrade(server, "/api/solo/ws?x=1");
    const game = upgrade(server, "/api/game/ws");
    expect(proxyUpgrade).toHaveBeenCalledTimes(2);
    const [soloReq, , , soloTarget] = proxyUpgrade.mock.calls[0] as unknown as [
      unknown,
      unknown,
      unknown,
      URL,
    ];
    const [gameReq, , , gameTarget] = proxyUpgrade.mock.calls[1] as unknown as [
      unknown,
      unknown,
      unknown,
      URL,
    ];
    expect(soloReq).toBe(solo.req);
    expect(soloTarget.href).toBe("http://orakl-api.internal:3001/");
    expect(gameReq).toBe(game.req);
    expect(gameTarget.href).toBe("http://orakl-api.internal:3001/");
  });

  it("both sockets are proxied paths", () => {
    expect(PROXIED_WS_PATHS.has("/api/game/ws")).toBe(true);
    expect(PROXIED_WS_PATHS.has("/api/solo/ws")).toBe(true);
  });
});
