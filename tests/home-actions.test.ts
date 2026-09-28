import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DismissQuizDeps,
  DismissQuizState,
} from "../src/lib/home-actions.js";
import { confirmDismiss, dismissQuiz } from "../src/lib/home-actions.js";
import { storage } from "../src/lib/storage.js";

function makeState(
  overrides: Partial<DismissQuizState> = {},
): DismissQuizState {
  return {
    showConfirm: false,
    hasQuiz: true,
    confirmTimeout: null,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<DismissQuizDeps> = {}): DismissQuizDeps {
  return {
    fetch: vi.fn().mockResolvedValue(new Response()),
    setTimeout: vi
      .fn()
      .mockReturnValue(42 as unknown as ReturnType<typeof setTimeout>),
    clearTimeout: vi.fn(),
    ...overrides,
  };
}

describe("confirmDismiss", () => {
  afterEach(() => vi.restoreAllMocks());

  it("happy path: calls fetch, removes stored quiz config, invokes onDone", async () => {
    const onDone = vi.fn();
    const deps = makeDeps();
    const removeSpy = vi.spyOn(storage, "removeQuizConfig");
    await confirmDismiss(onDone, deps);

    expect(deps.fetch).toHaveBeenCalledWith("/api/lobby", { method: "DELETE" });
    expect(removeSpy).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("error path: fetch rejects — error swallowed, removeQuizConfig and onDone still called", async () => {
    const onDone = vi.fn();
    const deps = makeDeps({
      fetch: vi.fn().mockRejectedValue(new Error("network")),
    });
    const removeSpy = vi.spyOn(storage, "removeQuizConfig");
    await expect(confirmDismiss(onDone, deps)).resolves.toBeUndefined();
    expect(removeSpy).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe("dismissQuiz", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("first call sets showConfirm=true and schedules reset timer", async () => {
    const state = makeState();
    const deps = makeDeps();
    await dismissQuiz(state, deps);

    expect(state.showConfirm).toBe(true);
    expect(deps.setTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);
    expect(deps.fetch).not.toHaveBeenCalled();
    expect(state.hasQuiz).toBe(true);
  });

  it("first call stores the timer handle", async () => {
    const state = makeState();
    const deps = makeDeps();
    await dismissQuiz(state, deps);

    expect(state.confirmTimeout).toBe(42);
  });

  it("first call clears existing timer before scheduling new one", async () => {
    const existingTimer = 99 as unknown as ReturnType<typeof setTimeout>;
    const state = makeState({ confirmTimeout: existingTimer });
    const deps = makeDeps();
    await dismissQuiz(state, deps);

    expect(deps.clearTimeout).toHaveBeenCalledWith(existingTimer);
    expect(deps.setTimeout).toHaveBeenCalledOnce();
  });

  it("timer callback resets showConfirm to false", async () => {
    const state = makeState();
    let timerCb: (() => void) | null = null;
    const deps = makeDeps({
      setTimeout: vi.fn().mockImplementation((cb: () => void) => {
        timerCb = cb;
        return 1;
      }),
    });
    await dismissQuiz(state, deps);
    expect(state.showConfirm).toBe(true);
    timerCb!();
    expect(state.showConfirm).toBe(false);
  });

  it("second call (showConfirm=true) calls DELETE /api/lobby", async () => {
    const state = makeState({ showConfirm: true });
    const deps = makeDeps();
    await dismissQuiz(state, deps);

    expect(deps.fetch).toHaveBeenCalledWith("/api/lobby", { method: "DELETE" });
  });

  it("second call sets hasQuiz=false and showConfirm=false", async () => {
    const state = makeState({ showConfirm: true });
    const deps = makeDeps();
    await dismissQuiz(state, deps);

    expect(state.hasQuiz).toBe(false);
    expect(state.showConfirm).toBe(false);
  });

  it("second call removes stored quiz config", async () => {
    const state = makeState({ showConfirm: true });
    const deps = makeDeps();
    const removeSpy = vi.spyOn(storage, "removeQuizConfig");
    await dismissQuiz(state, deps);

    expect(removeSpy).toHaveBeenCalledOnce();
    removeSpy.mockRestore();
  });

  it("second call clears pending timer", async () => {
    const timer = 77 as unknown as ReturnType<typeof setTimeout>;
    const state = makeState({ showConfirm: true, confirmTimeout: timer });
    const deps = makeDeps();
    await dismissQuiz(state, deps);

    expect(deps.clearTimeout).toHaveBeenCalledWith(timer);
  });

  it("second call completes even if fetch rejects", async () => {
    const state = makeState({ showConfirm: true });
    const deps = makeDeps({
      fetch: vi.fn().mockRejectedValue(new Error("network")),
    });
    await expect(dismissQuiz(state, deps)).resolves.toBeUndefined();
    expect(state.hasQuiz).toBe(false);
  });
});
