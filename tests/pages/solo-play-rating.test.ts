import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSoloModeStore } from "../../src/lib/soloMode.store.js";
import PlayPage from "../../src/routes/(app)/solo/play/+page.svelte";
import SoloSessionHarness from "./SoloSessionHarness.svelte";

const pageData = vi.hoisted(() => ({
  data: { nickname: "Ada", uiFlags: {} } as Record<string, unknown>,
}));

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", () => ({
  page: {
    url: new URL("http://localhost/solo/play"),
    get data() {
      return pageData.data;
    },
  },
}));

function revealStore(isGuest: boolean) {
  const store = createSoloModeStore("[]", "", isGuest, "user-1");
  store._handleServerMessage(
    JSON.stringify({
      type: "solo:question",
      question: {
        id: "q-0",
        text: "What is 2+2?",
        type: "text_choice",
        categoryId: "science",
        difficulty: "easy",
        answers: [
          { id: "a-correct", text: "4" },
          { id: "a-wrong", text: "5" },
        ],
      },
      questionIndex: 0,
      totalQuestions: 3,
      timeRemaining: 30,
      serverTs: 1000,
    }),
  );
  store._handleServerMessage(
    JSON.stringify({
      type: "solo:round-result",
      correctAnswerId: "a-correct",
      selectedAnswerId: "a-correct",
      isCorrect: true,
      score: 100,
      totalScore: 100,
      timeToAnswerMs: 1000,
      streak: 1,
      strikes: 0,
      fasterThanPercent: 10,
    }),
  );
  // isGuest is set by solo:ready on a live run; the page reads the store field.
  store.isGuest = isGuest;
  return store;
}

function mount(store: ReturnType<typeof revealStore>) {
  return render(
    PlayPage as never,
    {},
    { wrapper: SoloSessionHarness, wrapperProps: { session: store } },
  );
}

describe("solo play page — rating thumbs", () => {
  beforeEach(() => {
    pageData.data = { nickname: "Ada", uiFlags: { QUESTION_RATING: true } };
  });

  it("signed-in reveal with the flag on shows the thumbs above Continue", () => {
    mount(revealStore(false));
    const bad = screen.getByRole("button", { name: "Bad question" });
    screen.getByRole("button", { name: "Good question" });
    const next = screen.getByRole("button", { name: "Continue" });
    expect(
      bad.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("a thumb tap rates through the store", async () => {
    const store = revealStore(false);
    mount(store);
    screen.getByRole("button", { name: "Good question" }).click();
    await vi.waitFor(() => expect(store.rating.pending).toBe("up"));
  });

  it("guest sees no thumbs", () => {
    mount(revealStore(true));
    expect(screen.queryByRole("button", { name: "Bad question" })).toBeNull();
    screen.getByRole("button", { name: "Continue" });
  });

  it("flag off shows no thumbs", () => {
    pageData.data = { nickname: "Ada", uiFlags: { QUESTION_RATING: false } };
    mount(revealStore(false));
    expect(screen.queryByRole("button", { name: "Good question" })).toBeNull();
    screen.getByRole("button", { name: "Continue" });
  });
});
