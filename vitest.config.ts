import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import { BUILD_FLAGS } from "./build-flags.mjs";

export default defineConfig({
  plugins: [svelte()],
  // Build-time globals the footer renders (vite.config.ts defines the real ones).
  // Build-level feature flags are all ON under test so their guarded code stays
  // covered; exclusion from the real bundle is the S3 check
  // (`pnpm check:build-flags`), not a unit test.
  define: {
    __APP_VERSION__: JSON.stringify("test"),
    __BUILD_DATE__: JSON.stringify("test"),
    // Derived from BUILD_FLAGS, never hand-listed: a flag missing here is a
    // bare `ReferenceError: __FEATURE_X__ is not defined` inside whichever
    // test happens to touch the guarded path.
    ...Object.fromEntries(
      BUILD_FLAGS.map((name) => [`__FEATURE_${name}__`, "true"]),
    ),
  },
  test: {
    globals: true,
    // tests/polar-sandbox hits the live sandbox: its own config, never here.
    exclude: [
      "**/node_modules/**",
      ".claude/**",
      "e2e/**",
      "tests/polar-sandbox/**",
      "packages/**",
      "apps/**",
    ],
    testTimeout: 15000,
    environment: "jsdom",
    // One jsdom per worker, files isolated in vm contexts: a fresh jsdom per
    // file is over half the suite's wall time.
    pool: "vmThreads",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        "src/lib/rate-limit.ts": { lines: 100 },
        "src/lib/csrf.ts": { lines: 100 },
        "src/lib/auth.ts": { lines: 90 },
      },
    },
  },
  resolve: {
    conditions: ["browser"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
      data: fileURLToPath(new URL("./data", import.meta.url)),
      "$app/state": fileURLToPath(
        new URL("./tests/stubs/app-state.ts", import.meta.url),
      ),
      "$env/dynamic/private": fileURLToPath(
        new URL("./tests/stubs/env-dynamic-private.ts", import.meta.url),
      ),
      "$app/forms": fileURLToPath(
        new URL("./tests/stubs/app-forms.ts", import.meta.url),
      ),
      "$app/environment": fileURLToPath(
        new URL("./tests/stubs/app-environment.ts", import.meta.url),
      ),
      "$app/navigation": fileURLToPath(
        new URL("./tests/stubs/app-navigation.ts", import.meta.url),
      ),
      // `ws` is server-only, and its "browser" export is a stub that throws;
      // socket-server tests need the Node build whatever the condition.
      ws: fileURLToPath(
        new URL("./node_modules/ws/wrapper.mjs", import.meta.url),
      ),
    },
  },
});
