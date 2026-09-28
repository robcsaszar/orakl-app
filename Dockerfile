# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git && \
    git config --global url."https://github.com/".insteadOf "git@github.com:" && \
    npm install -g pnpm@10

COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
RUN printf '{"compilerOptions":{"strict":true,"moduleResolution":"bundler","module":"esnext","target":"esnext","allowImportingTsExtensions":true,"noEmit":true}}' > tsconfig.json

RUN pnpm install --frozen-lockfile

COPY src ./src
COPY data ./data
COPY static ./static
COPY svelte.config.ts vite.config.ts tsconfig.json ./
COPY sentry.client.config.ts sentry.server.config.ts ./
COPY build-ws-server.mjs build-flags.mjs ./

ARG VITE_SENTRY_DSN
ARG SVELTE_DEV_META
# Build-level feature flags (map #859, decision 5). These are the ONLY switch
# for a build-tier feature — it has no registry entry, no feature_flags row and
# no FEATURE_FLAG_* override — so a deploy that wants one on must pass the arg
# (fly.toml / fly.review.toml `[build.args]`). Unset means excluded from the
# bundle, which is the shipping default.
ARG BUILD_FEATURE_SKY
ARG BUILD_FEATURE_PLAYER_EMOTES
ARG BUILD_FEATURE_SIGNUP_ROLE_SELECTION
ARG BUILD_FEATURE_WIP_QUESTION_TYPES
# Build the SvelteKit app, then bundle the solo WS server into build/solo-ws.mjs
RUN pnpm exec svelte-kit sync && pnpm build && node build-ws-server.mjs

# Runtime stage
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache git && \
    git config --global url."https://github.com/".insteadOf "git@github.com:" && \
    npm install -g pnpm@10

COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN printf '{"compilerOptions":{"strict":true,"moduleResolution":"bundler","module":"esnext","target":"esnext"}}' > tsconfig.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/build ./build
COPY server-entry.mjs ./

EXPOSE 3000

ENV NODE_ENV=production

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
