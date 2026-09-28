// Production server entry. adapter-node's build/index.js owns its own
// http.Server and exposes no upgrade hook, so WebSockets need a custom server:
// we drive SvelteKit's request handler ourselves and attach the upgrade
// listener to the same Node HTTP server (ADR 0013, 0016). Both socket upgrades
// are proxied to the API service at API_ORIGIN.
import { createServer } from "node:http";
import { handler } from "./build/handler.js";
import { attachWsEntry } from "./build/solo-ws.mjs";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

const server = createServer((req, res) => {
  // SvelteKit handler serves the app + static assets; fall through to 404.
  handler(req, res, () => {
    res.statusCode = 404;
    res.end("Not found");
  });
});

const apiOrigin = process.env.API_ORIGIN;
if (!apiOrigin) throw new Error("API_ORIGIN must name the API service");
attachWsEntry(server, apiOrigin);

server.listen(port, host, () => {
  console.log(`[server] listening on http://${host}:${port}`);
});

// Graceful shutdown so in-flight requests/sockets close cleanly on deploy.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // Hard stop if sockets linger past the platform's grace period.
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
