import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SoloRunReviewPage from "../../src/routes/(app)/history/solo/[id]/+page.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    info: vi.fn(),
  },
}));

function makeReviewRow(over: Record<string, unknown> = {}) {
  return {
    questionPosition: 0,
    isCorrect: true,
    timeToAnswerMs: 0,
    categoryId: "greek-mythology",
    questionText: "Who ruled the underworld?",
    difficulty: "all",
    selectedAnswerText: "Hades",
    correctAnswerText: "Hades",
    questionId: "q-1",
    mediaUrl: null,
    mediaType: null,
    source: null,
    postAnswerNote: null,
    ...over,
  };
}

function makeData(over: Record<string, unknown> = {}) {
  return {
    run: {
      id: "run-1",
      totalScore: 100,
      totalAnswered: 2,
      correctCount: 1,
      timeToAnswerAvgMs: 2000,
      maxStreak: 1,
      mode: "normal",
      difficulty: "all",
      completedAt: Date.now(),
      categories: ["Greek mythology", "Norse lore"],
    },
    badges: [],
    categoryStats: [
      {
        categoryId: "greek-mythology",
        name: "Greek mythology",
        correct: 1,
        total: 1,
      },
      { categoryId: "norse-lore", name: "Norse lore", correct: 0, total: 1 },
    ],
    review: [
      makeReviewRow({ questionPosition: 0, categoryId: "greek-mythology" }),
      makeReviewRow({
        questionPosition: 1,
        categoryId: "norse-lore",
        isCorrect: false,
        questionId: "q-2",
        questionText: "Who wields Mjolnir?",
      }),
    ],
    alreadyFlaggedIds: [],
    uiFlags: {},
    ...over,
  } as never;
}

describe("solo run review — mirrors the solo results screen", () => {
  it("renders the performance frame with category bars when 2+ categories", () => {
    render(SoloRunReviewPage, { props: { data: makeData() } });
    expect(screen.getByText("By category")).toBeInTheDocument();
    expect(screen.getAllByText("Greek mythology").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Norse lore").length).toBeGreaterThan(0);
  });

  it("longest deliberation shows the question with the largest timeToAnswerMs and its seconds", () => {
    render(SoloRunReviewPage, {
      props: {
        data: makeData({
          review: [
            makeReviewRow({
              questionPosition: 0,
              timeToAnswerMs: 1200,
              questionText: "Fast one",
            }),
            makeReviewRow({
              questionPosition: 1,
              questionId: "q-2",
              timeToAnswerMs: 4200,
              questionText: "Slow one",
            }),
          ],
        }),
      },
    });
    expect(screen.getByText("Longest deliberation")).toBeInTheDocument();
    expect(screen.getByText("Slow one")).toBeInTheDocument();
    expect(screen.getByText(/4\.2s/)).toBeInTheDocument();
  });

  it("no timing (all 0) hides the longest deliberation callout", () => {
    render(SoloRunReviewPage, {
      props: {
        data: makeData({
          review: [
            makeReviewRow({ questionPosition: 0, timeToAnswerMs: 0 }),
            makeReviewRow({
              questionPosition: 1,
              questionId: "q-2",
              timeToAnswerMs: 0,
            }),
          ],
        }),
      },
    });
    expect(screen.queryByText("Longest deliberation")).toBeNull();
  });

  it("has no in-page back-to-history link", () => {
    render(SoloRunReviewPage, { props: { data: makeData() } });
    expect(screen.queryByRole("link", { name: /back to history/i })).toBeNull();
  });

  it("renders flag follow-up for rows with a questionId", () => {
    render(SoloRunReviewPage, { props: { data: makeData() } });
    expect(screen.getAllByText("Flag this question").length).toBe(2);
  });
});
