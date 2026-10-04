/**
 * ADR 0010 enforcement — QuizSession (real) and MockQuizSession (dev fixture)
 * must both satisfy the exact same `PlayerSessionView` interface. Each class
 * already declares `implements PlayerSessionView`, so a drift is a compile
 * error there too; this file re-asserts it independently (a class could drop
 * the `implements` clause without either of those compile errors surfacing
 * here) and adds a tiny runtime smoke test that the mock's no-op stubs never
 * throw when a page calls them.
 */
import { describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../src/lib/svelte/mockQuizSession.svelte.js";
import type { PlayerSessionView } from "../src/lib/svelte/player-session-view.js";
import { QuizSession } from "../src/lib/svelte/quizSession.svelte.js";

describe("PlayerSessionView (ADR 0010 compile-check)", () => {
  it("QuizSession satisfies PlayerSessionView", () => {
    const session: PlayerSessionView = new QuizSession();
    expect(session).toBeInstanceOf(QuizSession);
  });

  it("MockQuizSession satisfies PlayerSessionView", () => {
    const session: PlayerSessionView = new MockQuizSession();
    expect(session).toBeInstanceOf(MockQuizSession);
  });
});

describe("MockQuizSession stubs (runtime smoke)", () => {
  it("lifecycle/action stubs resolve without throwing", async () => {
    const mock = new MockQuizSession();

    await expect(
      mock.init({ isLoggedIn: false, profileAvatarId: "" }),
    ).resolves.toBeUndefined();
    await expect(mock.initCodeEntry()).resolves.toBeUndefined();
    await expect(mock.validateCode()).resolves.toBe(true);
    await expect(mock.connect("Dev Player")).resolves.toBeUndefined();
    await expect(mock.confirmAvatar()).resolves.toBeUndefined();
    await expect(mock.leaveLobby()).resolves.toBeUndefined();

    expect(() => mock.destroy()).not.toThrow();
    expect(() => mock.seedLobbyRoster({})).not.toThrow();
    expect(() => mock.applyStateMessages([])).not.toThrow();
    expect(() => mock.connectStatusStream()).not.toThrow();
    expect(() => mock.clearStoredData()).not.toThrow();
    expect(() =>
      mock.previewAvatar({ id: "a", title: "A", description: "", src: "" }),
    ).not.toThrow();
    expect(() => mock.openAvatarSelector()).not.toThrow();
    expect(() => mock.closeAvatarSelector()).not.toThrow();
    expect(() => mock.sendEmote("smile", 0.5, 0.5)).not.toThrow();
    expect(() => mock.selectMatchItem("left", "x")).not.toThrow();
    expect(() => mock.getAvatarSrc("nope")).not.toThrow();
    expect(() => mock.getMyScore()).not.toThrow();
    expect(() => mock.validateNickname("")).not.toThrow();
  });
});

describe("MockQuizSession.rate", () => {
  it("goes pending, then ends in an ok result", async () => {
    vi.useFakeTimers();
    const session = new MockQuizSession();
    session.rate("up");
    expect(session.rating.pending).toBe("up");
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    expect(session.rating.pending).toBeNull();
    expect(session.rating.result).toMatchObject({ rating: "up", ok: true });
  });

  it("canRate only on a revealed round for a signed-in non-observer", () => {
    const session = new MockQuizSession();
    expect(session.canRate).toBe(false);
    session.showingResult = true;
    expect(session.canRate).toBe(true);
    session.isObserver = true;
    expect(session.canRate).toBe(false);
  });
});
