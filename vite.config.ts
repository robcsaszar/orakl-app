import { readFileSync } from "node:fs";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { buildFlagDefines } from "./build-flags.mjs";
import svgoPlugin from "./src/lib/vite-plugin-svgo";
import wsProxyPlugin from "./src/lib/vite-plugin-ws-proxy";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

// Build date: YYYYMMDD at build time (no plumbing needed — it's just "now").
const buildDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), svgoPlugin(), wsProxyPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(buildDate),
    ...buildFlagDefines(),
  },
});
