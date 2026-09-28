import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Server-only modules: each reaches `node:` builtins or the database and
 *  cannot be bundled for the browser. A `.svelte` file may import types from
 *  them, never values — the production build fails otherwise, and CI here is
 *  manual, so this pins it. */
const SERVER_ONLY = [
  "@/lib/question-bank.js",
  "@/lib/question-flags.js",
  "@/lib/db.js",
  "@/lib/user-auth.js",
];

function svelteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return svelteFiles(full);
    return name.endsWith(".svelte") ? [full] : [];
  });
}

describe("client-safe imports", () => {
  it("no .svelte file value-imports a server-only module", () => {
    const offenders: string[] = [];
    for (const file of svelteFiles("src")) {
      const src = readFileSync(file, "utf8");
      for (const mod of SERVER_ONLY) {
        const re = new RegExp(
          `import\\s+(?!type\\b)[^;]*?from\\s+"${mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
          "g",
        );
        if (re.test(src)) offenders.push(`${file} → ${mod}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
