import { render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import { page } from "../stubs/app-state.js";

const goto = vi.hoisted(() => vi.fn());
vi.mock("$app/navigation", () => ({ goto, invalidateAll: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

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
        vi.spyOn(capturedSession, "init");
        vi.spyOn(capturedSession, "reconnectNow");
        return actual.setQuizSession(session as never);
      },
    };
  },
);

import QuizLayout from "../../src/routes/(game)/quiz/+layout.svelte";

function renderLayout(over: Record<string, unknown> = {}) {
  render(QuizLayout, {
    props: {
      data: {
        membership: "none",
        phase: null,
        lobby: null,
        avatars: [],
        emotesEnabled: false,
        emotePacks: [],
        playerId: null,
        isCurator: false,
        isLoggedIn: false,
        profileAvatarId: "",
        curatorNickname: "",
        curatorAvatarId: "",
        ...over,
      } as never,
      children: createRawSnippet(() => ({ render: () => "<div></div>" })),
    },
  });
  return capturedSession as MockQuizSession;
}

describe("(game)/quiz +layout — archived results of a gone lobby", () => {
  beforeEach(() => {
    capturedSession = undefined;
    goto.mockClear();
    page.url = new URL("http://localhost/quiz/results");
  });

  it("opens no game socket and stays on the results page", async () => {
    const session = renderLayout({ archived: true });
    await tick();
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));
    expect(session.init).not.toHaveBeenCalled();
    expect(session.reconnectNow).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it("a context with no archived flag starts the session as before", async () => {
    const session = renderLayout();
    await tick();
    expect(session.init).toHaveBeenCalledTimes(1);
    expect(goto).toHaveBeenCalledWith("/join");
  });
});
