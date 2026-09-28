import type { Server } from "node:http";
import type { Plugin } from "vite";
import { attachWsEntry } from "./ws-entry.js";

/**
 * Dev server: proxies both socket upgrades to the API at `API_ORIGIN` and
 * leaves every other upgrade to Vite's HMR listener.
 */
export default function wsProxyPlugin(): Plugin {
  return {
    name: "ws-proxy",
    configureServer(server) {
      const apiOrigin = process.env.API_ORIGIN;
      if (!apiOrigin) throw new Error("API_ORIGIN must name the API service");
      if (server.httpServer)
        attachWsEntry(server.httpServer as Server, apiOrigin, false);
    },
  };
}
