# Orakl app — agent guidelines

This repository is published from the private Orakl repository by `pnpm sync:client`; every file here is overwritten by the next sync.

- NEVER commit here directly → make the change in the private repository and run `pnpm sync:client` there; it opens a PR on this repository.
- Before any UI work, read `DESIGN.md`; before adding or moving a component, read `docs/components.md`.
- Done = `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` all exit 0 (CI runs the same four).
- `pnpm dev` needs the API at `API_ORIGIN` (default `http://localhost:3001`); the API is not in this repository.

## Working Style

- **Communication:** Use ASD-STE 1000 simplified technical English (short, direct, ~1000-word approved vocabulary) + Barbara Minto Pyramid Principle (answer first, then support, then details). Start with conclusion/main point before evidence.
- State assumptions up front. Multiple valid interpretations → present them, don't pick silently.
- Simpler approach exists → say so, push back.
- Multi-step task → state plan w/ verify step per line: `1. [step] → verify: [check]`.
- Autonomous agents (no user to ask) → note assumptions in PR description instead.
- Minimum code for the ask. No speculative abstractions, config, or error handling for cases that can't happen.
- Touch only what the task requires. Don't refactor/reformat adjacent code. Remove only orphans your own change created — leave pre-existing dead code, flag it instead.
- Comments and docs state the system as it is, never the change that produced it. No "used to", "no longer", "previously", "moved off X", "replaces the old Y". A removed name → delete the mention; don't leave a tombstone. Covers code comments, `CONTEXT.md`, `UBIQUITOUS_LANGUAGE.md`, `docs/flows/`.
- Documenting a symbol → JSDoc on what it does or gates. A union of capabilities → one JSDoc per member, not a paragraph above the list.
- Two exceptions: an ADR amends in place (strike the stale line, state what replaced it); a migration may describe the bad-data shape it repairs, since that is what it is for.
- Verify before commit: `grep -rnE "used to|no longer|previously|the old " src/` — nothing your diff added.

## Frontend Copy & Tone

- **Sentence case** everywhere — only proper nouns capitalised (e.g. "Start game", not "Start Game"). Page and section titles follow the same rule.
- **Tone:** spartan, professional, courteous. No fluff. No exclamation marks unless truly warranted.
- **On-brand language:** the app's identity draws from oracle / Greek / Roman / Norse mythology, mysticism. *Occasionally* use thematic words where they fit naturally (e.g. "vault", "seal", "chronicle", "oracle", "relic"). Don't force it — clarity first.
- **Confirmation labels** (`ConfirmButton`'s `confirmLabel`): always a simple, direct question — no em-dash, no "Confirm …" prefix (e.g. "Sign out everywhere?", not "Confirm — sign out everywhere"). Mirrors the header sign-out button.

## Routes & Page Config

`src/lib/page-config.ts` is the **single source of truth** for all page chrome: the `header` block (visibility, back link, nav links, logo, badge) and the `footer` block (show, nav, and the privacy-ledger `useCases` the page collects). Every navigable, user-facing route **must** have an entry in `PAGE_CONFIG` — either an exact path key or a wildcard (`/some/path/*`).

- New route added → add an entry to `PAGE_CONFIG` before opening a PR; if the page collects personal data, list its use cases under `footer.useCases` and the route in the matching `src/lib/legal/ledger.ts` row — `tests/legal-ledger.test.ts` fails otherwise
- Dynamic segments (e.g. `[id]`) → use a wildcard key covering the parent (e.g. `/curator/history/*`)
- The fallback in `getPageConfig` is a last resort; relying on it for a real route is a bug

## Components

Always use repository components over native HTML elements. See `docs/components.md` for the full reference and the location rule: imported from 2+ places → `src/lib/components/**` (`$lib`); used by one route → colocated beside its `+page.svelte`. There is no `src/components/` tree.

Key rule: `<Button>` over `<button>`, `<Link>` over `<a>`, `<Card>` over `<div>`, `<Input>` over `<input>`. `StatusMessage` removed (#700, svelte-sonner migration) — transient feedback via `toast` (`lib/toast.ts`); inline banners via `Card` variants or `role="status"|"alert"` divs.
