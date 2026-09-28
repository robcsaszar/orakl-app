# Orakl app

The web client of [Orakl](https://orakl.quest), a casual live quiz: a curator
hosts a session, players join from their own devices in the browser, no
accounts needed to play.

This repository holds the client only — SvelteKit pages, components, the
design system and styles. The game engine, data and API are private; the
client talks to them over HTTP and WebSocket through the same origin, with
the wire contract published as [`@orakl/protocol`](https://www.npmjs.com/package/@orakl/protocol)
and shared runtime helpers as [`@orakl/shared`](https://www.npmjs.com/package/@orakl/shared).

## Develop

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm dev` serves the app and forwards `/api/*` and both sockets to the API at
`API_ORIGIN` (default `http://localhost:3001`); without a running API, pages
that load data will fail.

## License

[AGPL-3.0-only](LICENSE).
