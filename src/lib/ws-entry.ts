import type { Server } from "node:http";
import type { Duplex } from "node:stream";
import { proxyUpgrade } from "./ws-proxy.js";

/**
 * Upgrade paths the web entry hands to the API service. Both sockets are
 * served by the API: the game socket shares the registry with the lobby/quiz
 * routes, and the solo socket needs no shared state at all.
 */
export const PROXIED_WS_PATHS: ReadonlySet<string> = new Set([
  "/api/solo/ws",
  "/api/game/ws",
]);

/**
 * The web server's single upgrade listener: a listed path is proxied to the
 * API service at `apiOrigin`; any other upgrade is dropped.
 */
export function attachWsEntry(httpServer: Server, apiOrigin: string): void {
  const target = new URL(apiOrigin);
  httpServer.on("upgrade", (req, socket, head) => {
    const path = (req.url ?? "").split("?")[0];
    if (!PROXIED_WS_PATHS.has(path)) {
      socket.destroy();
      return;
    }
    proxyUpgrade(req, socket as Duplex, head, target);
  });
}
