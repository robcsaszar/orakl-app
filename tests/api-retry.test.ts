// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_RETRY_BACKOFF_MS,
  API_RETRY_LIMIT,
  API_UNAVAILABLE_MESSAGE,
} from "../src/lib/page-data.js";
import { requireJourney } from "../src/lib/quiz-guard.js";
import { load as quizLoad } from "../src/routes/(game)/quiz/+layout.js";
import { load as resultsLoad } from "../src/routes/(game)/quiz/results/+page.js";

const journey = {
  membership: "active",
  phase: "lobby",
  state: "lobby",
  route: "/quiz/lobby",
  miss: null,
};

/** A fetch answering each call from `steps` in order, then repeating the last. */
function sequence(steps: Array<number | "network">, okBody: unknown = journey) {
  let i = 0;
  const fn = vi.fn(async () => {
    const step = steps[Math.min(i++, steps.length - 1)];
    if (step === "network") throw new TypeError("fetch failed");
    return step === 200
      ? Response.json(okBody)
      : new Response(null, { status: step });
  });
  return { fn, fetchFn: fn as unknown as typeof fetch };
}

/** Runs `p` to settlement while the fake clock sleeps through every backoff. */
async function settle<T>(p: Promise<T>) {
  const out = p.then(
    (v) => ({ ok: true as const, v }),
    (e) => ({ ok: false as const, e }),
  );
  await vi.advanceTimersByTimeAsync(
    API_RETRY_BACKOFF_MS * (API_RETRY_LIMIT + 1) * (API_RETRY_LIMIT + 1),
  );
  return out;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("requireJourney retries", () => {
  it("a 503 then 200 passes the guard", async () => {
    const { fn, fetchFn } = sequence([503, 200]);
    const r = await settle(requireJourney(fetchFn, ["lobby"]));
    expect(r).toMatchObject({ ok: true, v: { state: "lobby" } });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("a network failure then 200 passes the guard", async () => {
    const { fetchFn } = sequence(["network", 200]);
    const r = await settle(requireJourney(fetchFn, ["lobby"]));
    expect(r).toMatchObject({ ok: true });
  });

  it("a 503 every time ends in the 503 page after the bounded retries", async () => {
    const { fn, fetchFn } = sequence([503]);
    const r = await settle(requireJourney(fetchFn, ["lobby"]));
    expect(r).toMatchObject({
      ok: false,
      e: { status: 503, body: { message: API_UNAVAILABLE_MESSAGE } },
    });
    expect(fn).toHaveBeenCalledTimes(API_RETRY_LIMIT + 1);
  });

  it("a network failure every time ends in the 503 page, not a raw fetch error", async () => {
    const { fn, fetchFn } = sequence(["network"]);
    const r = await settle(requireJourney(fetchFn, ["lobby"]));
    expect(r).toMatchObject({
      ok: false,
      e: { status: 503, body: { message: API_UNAVAILABLE_MESSAGE } },
    });
    expect(fn).toHaveBeenCalledTimes(API_RETRY_LIMIT + 1);
  });

  it("a 404 fails at once", async () => {
    const { fn, fetchFn } = sequence([404]);
    const r = await settle(requireJourney(fetchFn, ["lobby"]));
    expect(r).toMatchObject({ ok: false, e: { status: 404 } });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("quiz layout and results loads retry", () => {
  const args = (fetch: typeof globalThis.fetch) =>
    ({
      fetch,
      url: new URL("http://localhost/quiz/results"),
      untrack: <T>(f: () => T) => f(),
    }) as never;

  it("the quiz layout load retries a 503", async () => {
    const { fn, fetchFn } = sequence([503]);
    const r = await settle(quizLoad(args(fetchFn)));
    expect(r).toMatchObject({ ok: false, e: { status: 503 } });
    expect(fn).toHaveBeenCalledTimes(API_RETRY_LIMIT + 1);
  });

  it("the results load retries a 503 and does not retry a 404", async () => {
    const a = sequence([503]);
    await settle(resultsLoad(args(a.fetchFn)));
    expect(a.fn).toHaveBeenCalledTimes(API_RETRY_LIMIT + 1);
    const b = sequence([404]);
    const r = await settle(resultsLoad(args(b.fetchFn)));
    expect(r).toMatchObject({ ok: false, e: { status: 404 } });
    expect(b.fn).toHaveBeenCalledTimes(1);
  });
});
