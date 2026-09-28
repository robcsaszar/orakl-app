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

// Layout constructs its own QuizSession and hands it to context via
// setQuizSession — swap the class for MockQuizSession (no init/SSE side
// effects) and capture the instance setQuizSession receives so the test can
// drive session.error directly.
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

import { toast } from "../../src/lib/toast.js";
import QuizLayout from "../../src/routes/(game)/quiz/+layout.svelte";

function makeData(over: Record<string, unknown> = {}) {
  return {
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
    ...over,
  };
}

describe("(game)/quiz +layout — session.error toast", () => {
  beforeEach(() => {
    capturedSession = undefined;
    vi.clearAllMocks();
  });

  it("toasts the 403 reconnect-ownership message", async () => {
    render(QuizLayout, {
      props: { data: makeData() as never, children: emptyChildren() },
    });

    capturedSession!.error = "This player belongs to another session.";
    await Promise.resolve();

    expect(toast.error).toHaveBeenCalledWith(
      "This player belongs to another session.",
    );
  });

  it("does not toast when error is empty", async () => {
    render(QuizLayout, {
      props: { data: makeData() as never, children: emptyChildren() },
    });

    await Promise.resolve();

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("toasts the 403 message regardless of the child page (lobby and play)", async () => {
    const { unmount } = render(QuizLayout, {
      props: {
        data: makeData({ phase: "playing" }) as never,
        children: emptyChildren(),
      },
    });

    capturedSession!.error = "This player belongs to another session.";
    await Promise.resolve();

    expect(toast.error).toHaveBeenCalledWith(
      "This player belongs to another session.",
    );
    unmount();
  });
});
