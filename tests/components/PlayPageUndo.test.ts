import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import PlayPage from "../../src/routes/(game)/quiz/play/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/quiz/play"), data: {} },
}));

/** An answered hero mid-question, one undo left. */
function answeredSession() {
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
  session.answered = true;
  session.selectedAnswerId = "a";
  session.feedbackStatus = "pending";
  session.undoBudget = 1;
  session.undoRemaining = 1;
  return session;
}

function renderPage(session: MockQuizSession) {
  return render(
    PlayPage as never,
    {},
    { wrapper: LobbySessionHarness, wrapperProps: { session } },
  );
}

const changeButton = () =>
  screen.queryByRole("button", { name: /^Change answer/ });

describe("play page — change answer", () => {
  it("offers the change with the undos left while canUndo holds", () => {
    renderPage(answeredSession());
    expect(changeButton()).toHaveTextContent("Change answer · 1 left");
  });

  it("clicking it calls undoAnswer", async () => {
    const session = answeredSession();
    const undo = vi.spyOn(session, "undoAnswer");
    renderPage(session);
    await fireEvent.click(changeButton() as HTMLElement);
    expect(undo).toHaveBeenCalledOnce();
  });

  it("offers no change with undo off", () => {
    const session = answeredSession();
    session.undoBudget = 0;
    renderPage(session);
    expect(changeButton()).toBeNull();
  });

  it("offers no change during the reveal", () => {
    const session = answeredSession();
    session.correctAnswerId = "a";
    renderPage(session);
    expect(changeButton()).toBeNull();
  });

  it("offers no change before an answer", () => {
    const session = answeredSession();
    session.answered = false;
    session.feedbackStatus = "none";
    renderPage(session);
    expect(changeButton()).toBeNull();
  });

  it("the pending status names the reveal during a last call", () => {
    const session = answeredSession();
    session.lastCallSeconds = 4;
    renderPage(session);
    expect(
      screen.getByText(/Everyone has answered\. Revealing in 4…/),
    ).toBeInTheDocument();
  });
});
