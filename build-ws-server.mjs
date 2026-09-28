// Bundles the WebSocket entry (the upgrade proxy to the API)
// into build/solo-ws.mjs so the production custom server (server-entry.mjs)
// can attach it to the Node HTTP server.
//
// adapter-node's build/index.js owns its own http.Server and exposes no upgrade
// hook, so WebSockets need a custom entry. The WS chain uses only relative
// imports + node_modules (no $env / $lib aliases), so a plain Vite SSR build
// resolves the TS `.js` specifiers and externalizes node deps cleanly.
import { build } from "vite";

await build({
  configFile: false,
  logLevel: "info",
  build: {
    ssr: "src/lib/ws-entry.ts",
    outDir: "build",
    emptyOutDir: false,
    target: "node22",
    minify: false,
    rollupOptions: {
      output: { entryFileNames: "solo-ws.mjs", format: "es" },
    },
  },
});

console.log("[build-ws-server] wrote build/solo-ws.mjs");
