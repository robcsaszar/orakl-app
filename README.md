# Orakl

The web client for [Orakl](https://orakl.quest), a quiz app for local gatherings. One person curates the quiz and everyone else plays from their own device. Players need no install and no account.

This repository holds what players and curators see: the SvelteKit pages, the components, the design system and the styles. The engine that runs games, scores answers and keeps the question bank is private. The client talks to it over HTTP and WebSocket on the same origin.

## How a game runs

1. The curator creates a quiz and picks categories and a timer.
2. Players join from a shared link or a QR code.
3. Questions arrive in real time. Players answer before the timer runs out.
4. The leaderboard shows the final scores.

Solo mode, the Trial of the Sphinx, has no lobby: pick categories and play.

## Stack

- [SvelteKit](https://svelte.dev/docs/kit) and Svelte 5, server-rendered on Node
- [Tailwind CSS](https://tailwindcss.com) 4 with [tailwind-variants](https://www.tailwind-variants.org)
- TypeScript, [Vitest](https://vitest.dev) and [Biome](https://biomejs.dev)
- [`@orakl/protocol`](https://www.npmjs.com/package/@orakl/protocol): the wire contract with the engine, as Effect schemas
- [`@orakl/shared`](https://www.npmjs.com/package/@orakl/shared): runtime helpers that the client and the engine both use

## Develop

You need Node LTS and pnpm 10.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

These four checks need no API and no credentials. CI runs them on every push and pull request.

```bash
pnpm dev
```

`pnpm dev` serves the app on `http://localhost:5173`. It forwards `/api/*` and both WebSocket paths to the API at `API_ORIGIN` (default `http://localhost:3001`). The API is not in this repository, so pages that load data show an error until one answers at that address.

## Design

[`DESIGN.md`](DESIGN.md) is the design system: tokens, components, and the principles behind them. Read it before you change the interface.

## License

[AGPL-3.0-only](LICENSE).
