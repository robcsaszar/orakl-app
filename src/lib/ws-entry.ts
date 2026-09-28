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
 * Proxies upgrades on a listed path to the API service at `apiOrigin`. Any
 * other upgrade is dropped, unless `dropOthers` is false because another
 * listener owns it (Vite's HMR socket in dev).
 */
export function attachWsEntry(
  httpServer: Server,
  apiOrigin: string,
  dropOthers = true,
): void {
  const target = new URL(apiOrigin);
  httpServer.on("upgrade", (req, socket, head) => {
    const path = (req.url ?? "").split("?")[0];
    if (!PROXIED_WS_PATHS.has(path)) {
      if (dropOthers) socket.destroy();
      return;
    }
    proxyUpgrade(req, socket as Duplex, head, target);
  });
}
