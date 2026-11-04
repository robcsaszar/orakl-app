import { readFileSync } from "node:fs";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { buildFlagDefines } from "./build-flags.mjs";
import svgoPlugin from "./src/lib/vite-plugin-svgo";
import wsProxyPlugin from "./src/lib/vite-plugin-ws-proxy";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

// Build date: YYYYMMDD at build time (no plumbing needed — it's just "now").
const buildDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");

export default defineConfig(({ command, mode }) => ({
  plugins: [tailwindcss(), sveltekit(), svgoPlugin(), wsProxyPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_DATE__: JSON.stringify(buildDate),
    // Vite does not put .env into process.env at config time. Dev reads
    // BUILD_FEATURE_* from .env too; builds take them from the real env only.
    ...buildFlagDefines(
      command === "serve"
        ? { ...process.env, ...loadEnv(mode, process.cwd(), "BUILD_FEATURE_") }
        : process.env,
    ),
  },
}));
