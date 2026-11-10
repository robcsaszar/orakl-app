import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import PlayPage from "../../src/routes/(game)/quiz/play/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/quiz/play"), data: {} },
}));

/** A hero with emotes, on a text question. */
function heroSession() {
  const session = new MockQuizSession();
  session.phase = "playing";
  session.currentQuestion = {
    questionId: "q1",
    questionIndex: 0,
    totalQuestions: 10,
    text: "Q?",
    questionType: "text_choice",
    answers: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
  } as never;
  session.timeRemaining = 10;
  session.isObserver = false;
  session.pickedEmotes = ["e1"];
  return session;
}

function renderPage(session: MockQuizSession) {
  return render(
    PlayPage as never,
    {},
    { wrapper: LobbySessionHarness, wrapperProps: { session } },
  );
}

const emoteHint = () => screen.queryByText(/to react$/);

describe("play page — emote gate", () => {
  it("a timed-out player sees no emote hint at the reveal", () => {
    const session = heroSession();
    session.answered = false;
    session.correctAnswerId = "a";
    session.showingResult = true;
    renderPage(session);
    expect(emoteHint()).toBeNull();
  });

  it("an answered player sees the emote hint", () => {
    const session = heroSession();
    session.answered = true;
    session.selectedAnswerId = "a";
    renderPage(session);
    expect(emoteHint()).not.toBeNull();
  });
});

describe("play page — reconnecting", () => {
  it("disables the answer tiles while the socket reconnects", () => {
    const session = heroSession();
    session.isReconnecting = true;
    renderPage(session);
    expect(screen.getByRole("button", { name: /^A/ })).toBeDisabled();
  });

  it("leaves the tiles open when connected", () => {
    const session = heroSession();
    renderPage(session);
    expect(screen.getByRole("button", { name: /^A/ })).toBeEnabled();
  });
});
