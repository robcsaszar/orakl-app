import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

// ─── Async context ─────────────────────────────────────────────────────────────

interface LogCtx {
  requestId: string;
}

const als = new AsyncLocalStorage<LogCtx>();

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return als.run({ requestId }, fn);
}

export function getRequestId(): string | undefined {
  return als.getStore()?.requestId;
}

// ─── Logger ────────────────────────────────────────────────────────────────────

const VALID_LEVELS = new Set([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);
const rawLevel = process.env.LOG_LEVEL?.trim().toLowerCase() ?? "info";
const level = VALID_LEVELS.has(rawLevel) ? rawLevel : "info";

const transport =
  process.env.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined;

export const logger = pino({
  level,
  transport,
  mixin() {
    const requestId = getRequestId();
    return requestId ? { requestId } : {};
  },
});

export function logError(err: unknown, context: Record<string, unknown>): void {
  logger.error({ err, ...context });
}
