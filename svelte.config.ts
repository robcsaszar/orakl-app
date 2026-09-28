import adapter from "@sveltejs/adapter-node";
import type { Config } from "@sveltejs/kit";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config: Config = {
  preprocess: vitePreprocess(),
  // SVELTE_DEV_META=1 compiles a production build with Svelte's dev metadata
  // (`__svelte_meta` on every element) so the feedback widget can name the
  // owning components. Set for review apps via fly.review.toml; never in prod.
  // Applied per file through dynamicCompileOptions: vite-plugin-svelte forces
  // a static `compilerOptions.dev` back to false on production builds. Client
  // compiles only — dev-compiled SSR calls `push_element`, which needs a dev
  // context the production server runtime never sets up (every route 500s).
  ...(process.env.SVELTE_DEV_META === "1"
    ? {
        vitePlugin: {
          dynamicCompileOptions: ({ compileOptions }) =>
            compileOptions.generate === "client" ? { dev: true } : undefined,
        },
      }
    : {}),
  kit: {
    adapter: adapter(),
    alias: {
      "@": "./src",
      data: "./data",
    },
    csp: {
      mode: "nonce",
      directives: {
        "default-src": ["self"],
        "script-src": ["self", "https://visitors.nhg.app"],
        "style-src": ["self", "unsafe-inline"],
        "img-src": ["self", "data:", "blob:"],
        "connect-src": [
          "self",
          "blob:",
          "https://visitors.nhg.app",
          "https://bugs.nhg.app",
        ],
        "font-src": ["self", "data:"],
        "object-src": ["none"],
        "base-uri": ["self"],
        "form-action": ["self"],
        "frame-ancestors": ["none"],
      },
    },
  },
};

export default config;
