import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";

function emptyChildren() {
  return createRawSnippet(() => ({ render: () => "<div></div>" }));
}

vi.mock("../../src/lib/toast.js", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Layout constructs its own QuizSession — swap in MockQuizSession and capture
// the instance so the test can watch reconnectNow.
let capturedSession: MockQuizSession | undefined;
vi.mock(
  "../../src/lib/svelte/quizSession.svelte.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../src/lib/svelte/quizSession.svelte.js")
      >();
    return {
      ...actual,
      QuizSession: MockQuizSession,
      setQuizSession: (session: unknown) => {
        capturedSession = session as MockQuizSession;
        return actual.setQuizSession(session as never);
      },
    };
  },
);

import QuizLayout from "../../src/routes/(game)/quiz/+layout.svelte";

function renderLayout() {
  render(QuizLayout, {
    props: {
      data: {
        membership: "active",
        phase: "lobby",
        lobby: null,
        avatars: [],
        emotesEnabled: false,
        playerId: "p1",
        isCurator: false,
        isLoggedIn: true,
        profileAvatarId: "",
        curatorNickname: null,
        curatorAvatarId: null,
      } as never,
      children: emptyChildren(),
    },
  });
  return vi.spyOn(capturedSession as MockQuizSession, "reconnectNow");
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

describe("(game)/quiz +layout — reconnect on wake", () => {
  beforeEach(() => {
    capturedSession = undefined;
    setVisibility("visible");
  });

  it("reconnects when the page becomes visible", () => {
    const reconnect = renderLayout();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("does not reconnect when the page is hidden", () => {
    const reconnect = renderLayout();
    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(reconnect).not.toHaveBeenCalled();
  });

  it("reconnects when the browser comes back online", () => {
    const reconnect = renderLayout();
    window.dispatchEvent(new Event("online"));
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it("reconnects on a pageshow from the back-forward cache only", () => {
    const reconnect = renderLayout();
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: false }),
    );
    expect(reconnect).not.toHaveBeenCalled();
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
    expect(reconnect).toHaveBeenCalledTimes(1);
  });
});
