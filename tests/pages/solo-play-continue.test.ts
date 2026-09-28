import { fireEvent, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CORRECT_ANSWER_ID,
  FIXTURE_TOPICS_JSON,
  fixtureQuizQuestion,
} from "../../src/lib/mock/fixtures.js";
import type { SoloModeStore } from "../../src/lib/soloMode.store.js";
import SoloPlayPage from "../../src/routes/(app)/solo/play/+page.svelte";
import { makeReactiveSoloStore } from "./reactiveSoloStore.svelte.js";
import SoloSessionHarness from "./SoloSessionHarness.svelte";

vi.mock("$app/state", () => ({
  page: { data: { nickname: "Seeker" } },
}));

function seedQuestion(store: SoloModeStore, opts: { last?: boolean } = {}) {
  const q = fixtureQuizQuestion("text_choice");
  store.questions = [q];
  store.currentIndex = 0;
  store.totalQuestions = opts.last ? 1 : 5;
  store.phase = "playing";
  store.timer = 20;
  store.timeRemaining = 20;
  store.showingAnswer = false;
  store.answered = false;
  store.selectedAnswerId = null;
  store.correctAnswerId = "";
  store.lastAnswerInput = null;
}

function reveal(store: SoloModeStore) {
  store.showingAnswer = true;
  store.correctAnswerId = CORRECT_ANSWER_ID;
}

function makeStore() {
  return makeReactiveSoloStore(FIXTURE_TOPICS_JSON, "");
}

describe("solo play — continue control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("not the last question → accessible label 'Continue', no visible text", () => {
    const store = makeStore();
    seedQuestion(store);
    reveal(store);
    render(
      SoloPlayPage as never,
      {},
      { wrapper: SoloSessionHarness, wrapperProps: { session: store } },
    );

    const button = screen.getByRole("button", { name: "Continue" });
    expect(button.textContent?.trim()).toBe("");
  });

  it("last question → accessible label 'See results'", () => {
    const store = makeStore();
    seedQuestion(store, { last: true });
    reveal(store);
    render(
      SoloPlayPage as never,
      {},
      { wrapper: SoloSessionHarness, wrapperProps: { session: store } },
    );

    const button = screen.getByRole("button", { name: "See results" });
    expect(button.textContent?.trim()).toBe("");
  });

  it("keyboard answer focuses the continue button on reveal", async () => {
    const store = makeStore();
    seedQuestion(store);
    render(
      SoloPlayPage as never,
      {},
      { wrapper: SoloSessionHarness, wrapperProps: { session: store } },
    );

    store.handleKeyDown(new KeyboardEvent("keydown", { key: "1" }));
    reveal(store);

    const button = await screen.findByRole("button", { name: "Continue" });
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(button);
    });
  });

  it("Tab + Enter on an answer button counts as a keyboard answer", async () => {
    const store = makeStore();
    seedQuestion(store);
    render(
      SoloPlayPage as never,
      {},
      { wrapper: SoloSessionHarness, wrapperProps: { session: store } },
    );

    const user = userEvent.setup();
    await user.tab();
    expect(document.activeElement).toBe(screen.getAllByRole("button")[0]);
    await user.keyboard("{Enter}");
    expect(store.lastAnswerInput).toBe("keyboard");
    reveal(store);

    const button = await screen.findByRole("button", { name: "Continue" });
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(button);
    });
  });

  it("pointer answer does not focus the continue button on reveal", async () => {
    const store = makeStore();
    seedQuestion(store);
    render(
      SoloPlayPage as never,
      {},
      { wrapper: SoloSessionHarness, wrapperProps: { session: store } },
    );

    store.selectAnswer(CORRECT_ANSWER_ID);
    reveal(store);

    const button = await screen.findByRole("button", { name: "Continue" });
    expect(document.activeElement).not.toBe(button);
  });

  it("clicking the button advances (showingAnswer flips false)", async () => {
    const store = makeStore();
    seedQuestion(store);
    reveal(store);
    const advanceSpy = vi.spyOn(store, "advance");
    render(
      SoloPlayPage as never,
      {},
      { wrapper: SoloSessionHarness, wrapperProps: { session: store } },
    );

    const button = screen.getByRole("button", { name: "Continue" });
    await fireEvent.click(button);

    expect(advanceSpy).toHaveBeenCalledOnce();
    expect(store.showingAnswer).toBe(false);
  });
});
