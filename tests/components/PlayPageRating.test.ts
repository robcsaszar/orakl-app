import { render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockQuizSession } from "../../src/lib/svelte/mockQuizSession.svelte.js";
import PlayPage from "../../src/routes/(game)/quiz/play/+page.svelte";
import LobbySessionHarness from "./LobbySessionHarness.svelte";

const pageData = vi.hoisted(() => ({
  value: { uiFlags: { QUESTION_RATING: true } } as Record<string, unknown>,
}));

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", () => ({
  page: {
    url: new URL("http://localhost/quiz/play"),
    get data() {
      return pageData.value;
    },
  },
}));

function makeSession(countdown: number) {
  const session = new MockQuizSession();
  session.phase = "playing";
  session.advanceMode = countdown > 0 ? "auto_5" : "manual";
  session.currentQuestion = {
    id: "q1",
    text: "Q?",
    type: "text_choice",
    answers: [{ id: "a", text: "A" }],
  } as never;
  session.correctAnswerId = "a";
  session.showingResult = true;
  session.nextQuestionCountdown = countdown;
  return session;
}

function renderPage(session: MockQuizSession) {
  return render(
    PlayPage as never,
    {},
    { wrapper: LobbySessionHarness, wrapperProps: { session } },
  );
}

const thumbLabels = (c: HTMLElement) =>
  [...c.querySelectorAll("[data-rating-thumb]")].map((el) =>
    el.getAttribute("aria-label"),
  );

describe("play page — rating thumbs at the reveal", () => {
  beforeEach(() => {
    pageData.value = { uiFlags: { QUESTION_RATING: true } };
  });

  it("auto advance: 👎, the ring, 👍 in that order", () => {
    const { container } = renderPage(makeSession(3));
    const row = container
      .querySelector("[data-rating-thumb]")
      ?.closest("div.flex.items-start");
    expect(row).not.toBeNull();
    const kids = [...(row?.children ?? [])];
    expect(kids).toHaveLength(3);
    expect(
      kids[0].querySelector("[data-rating-thumb]")?.getAttribute("aria-label"),
    ).toBe("Bad question");
    expect(kids[1].querySelector("svg.-rotate-90")).not.toBeNull();
    expect(
      kids[2].querySelector("[data-rating-thumb]")?.getAttribute("aria-label"),
    ).toBe("Good question");
  });

  it("auto advance: one py-4 element wraps the row, the ring has none of its own", () => {
    const { container } = renderPage(makeSession(3));
    const row = container
      .querySelector("[data-rating-thumb]")
      ?.closest("div.flex.items-start");
    expect(row?.parentElement).toHaveClass("py-4");
    expect(container.querySelectorAll("div.py-4")).toHaveLength(1);
    expect(row?.querySelector("svg.-rotate-90")?.closest("div.py-4")).toBe(
      row?.parentElement,
    );
  });

  it("manual advance: the row keeps its py-4", () => {
    const { container } = renderPage(makeSession(0));
    const row = container
      .querySelector("[data-rating-thumb]")
      ?.closest("div.flex.items-start");
    expect(row?.parentElement).toHaveClass("py-4");
    expect(container.querySelectorAll("div.py-4")).toHaveLength(1);
  });

  it("manual advance: both thumbs, no ring", () => {
    const { container } = renderPage(makeSession(0));
    expect(thumbLabels(container)).toEqual(["Bad question", "Good question"]);
    expect(container.querySelector("div.py-4 svg.-rotate-90")).toBeNull();
  });

  it("an intermission hides the row", () => {
    const session = makeSession(3);
    session.isIntermission = true;
    const { container } = renderPage(session);
    const row = container
      .querySelector("[data-rating-thumb]")
      ?.closest("div.flex.items-start");
    expect(row?.parentElement?.classList.contains("invisible")).toBe(true);
  });

  it("no thumbs for an observer", () => {
    const session = makeSession(3);
    session.isObserver = true;
    const { container } = renderPage(session);
    expect(thumbLabels(container)).toEqual([]);
    expect(container.querySelector("div.py-4 svg.-rotate-90")).not.toBeNull();
  });

  it("no thumbs for a guest", () => {
    const session = makeSession(0);
    session.isLoggedIn = false;
    const { container } = renderPage(session);
    expect(thumbLabels(container)).toEqual([]);
  });

  it("no thumbs with the flag off", () => {
    pageData.value = { uiFlags: { QUESTION_RATING: false } };
    const { container } = renderPage(makeSession(3));
    expect(thumbLabels(container)).toEqual([]);
  });
});
