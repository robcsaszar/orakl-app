import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import PlayPage from "../../src/routes/(game)/quiz/play/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/quiz/play"), data: {} },
}));

function makeSession(intermission: boolean) {
  const session = new MockQuizSession();
  session.phase = "playing";
  session.advanceMode = "auto_5";
  session.currentQuestion = {
    id: "q1",
    text: "Q?",
    type: "text_choice",
    answers: [{ id: "a", text: "A" }],
  } as never;
  session.correctAnswerId = "a";
  session.showingResult = true;
  session.nextQuestionCountdown = 3;
  session.isIntermission = intermission;
  return session;
}

function revealBlock(container: HTMLElement) {
  // The reveal ring sits in its own centred block below the question; the
  // question timer ring lives in the header.
  return container
    .querySelector("div.py-4 svg.-rotate-90")
    ?.closest("div.py-4");
}

describe("play page — reveal ring during an intermission", () => {
  it("shows the ring on the reveal while the game runs", () => {
    const { container } = render(
      PlayPage as never,
      {},
      {
        wrapper: LobbySessionHarness,
        wrapperProps: { session: makeSession(false) },
      },
    );
    const block = revealBlock(container);
    expect(block).not.toBeNull();
    expect(block?.classList.contains("invisible")).toBe(false);
  });

  it("hides the ring while the game is paused", () => {
    const { container } = render(
      PlayPage as never,
      {},
      {
        wrapper: LobbySessionHarness,
        wrapperProps: { session: makeSession(true) },
      },
    );
    expect(revealBlock(container)?.classList.contains("invisible")).toBe(true);
  });
});
