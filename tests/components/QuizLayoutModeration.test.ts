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

describe("(game)/quiz +layout — Admin moderation", () => {
  beforeEach(() => {
    capturedSession = undefined;
    vi.clearAllMocks();
  });

  it("tells the Curator Orakl closed the lobby on a moderated close", async () => {
    render(QuizLayout, {
      props: {
        data: makeData({ isCurator: true }) as never,
        children: emptyChildren(),
      },
    });
    capturedSession!.lobbyEndedReason = "moderated";
    capturedSession!.lobbyClosed = true;
    await Promise.resolve();
    expect(toast.info).toHaveBeenCalledWith(
      "Orakl closed your lobby. Nothing from this session was saved.",
      expect.anything(),
    );
  });

  it("stays silent for the Curator on their own close", async () => {
    render(QuizLayout, {
      props: {
        data: makeData({ isCurator: true }) as never,
        children: emptyChildren(),
      },
    });
    capturedSession!.lobbyClosed = true;
    await Promise.resolve();
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("tells a removed Player so in neutral copy", async () => {
    render(QuizLayout, {
      props: { data: makeData() as never, children: emptyChildren() },
    });
    capturedSession!.wasRemoved = true;
    await Promise.resolve();
    expect(toast.error).toHaveBeenCalledWith(
      "You were removed from this lobby. Redirecting...",
      expect.anything(),
    );
  });
});
