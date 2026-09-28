import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DetailPage from "../../src/routes/(game)/curator/history/[id]/+page.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../src/lib/format.js", () => ({
  formatDateShort: () => "Mar 5, 2026",
}));

const SESSION = {
  id: "gs-1",
  quiz_name: "Norse gods",
  started_at: "2026-03-05 23:30:00",
  ended_at: null,
  categoryIds: ["general"],
  timer_duration: 30,
  total_questions: 2,
  player_count: 2,
  curator_id: "curator-a",
  difficulty: null,
  advance_mode: null,
  access_mode: null,
  max_players: null,
  questions_per_round: null,
  preset_id: null,
  stopped_at: null,
  planned_questions: null,
};

function baseData(overrides: Record<string, unknown> = {}) {
  return {
    entry: {
      session: SESSION,
      results: [
        {
          id: "r1",
          player_nickname: "Alice",
          final_score: 30,
          rank: 1,
          player_id: "p1",
          user_id: null,
          avatarSrc: "/avatars/alice.png",
        },
        {
          id: "r2",
          player_nickname: "Bob",
          final_score: 10,
          rank: 2,
          player_id: "p2",
          user_id: null,
          role: "observer",
        },
      ],
      questions: [
        {
          questionIndex: 0,
          questionText: "First question",
          answered: 4,
          correct: 3,
          spread: [
            { answerId: "a", text: "Odin", count: 3, correct: true },
            { answerId: "b", text: "Loki", count: 0, correct: false },
          ],
          noAnswer: 1,
        },
        {
          questionIndex: 1,
          questionText: "Second question",
          answered: 0,
          correct: 0,
          spread: null,
          noAnswer: 0,
        },
      ],
    },
    presetLimit: 25,
    presetCount: 0,
    uiFlags: { QUIZ_PRESETS: true },
    ...overrides,
  };
}

describe("curator game review", () => {
  it("lists every player in the leaderboard and shows accuracy on an answered question", () => {
    render(DetailPage, { props: { data: baseData() as never } });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText(/3 of 4 correct/)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it("hides the accuracy line for a question nobody reached", () => {
    render(DetailPage, { props: { data: baseData() as never } });

    expect(screen.getByText(/Second question/)).toBeInTheDocument();
    expect(screen.queryByText(/of 0 correct/)).not.toBeInTheDocument();
  });

  it("shows the answer spread with the correct option and no-answers", () => {
    render(DetailPage, { props: { data: baseData() as never } });

    const lists = screen.getAllByRole("list", { name: "Answer spread" });
    expect(lists).toHaveLength(1);
    expect(within(lists[0]).getByText("Odin")).toBeInTheDocument();
    expect(within(lists[0]).getByText("Correct answer:")).toBeInTheDocument();
    expect(within(lists[0]).getByText("Loki")).toBeInTheDocument();
    expect(within(lists[0]).getByText("No answer")).toBeInTheDocument();
  });

  it("keeps the Save quiz button when QUIZ_PRESETS is on", () => {
    render(DetailPage, { props: { data: baseData() as never } });

    expect(
      screen.getByRole("button", { name: /save quiz/i }),
    ).toBeInTheDocument();
  });

  it("renders the stored avatar src for a row that has one", () => {
    render(DetailPage, { props: { data: baseData() as never } });
    const aliceRow = screen.getByText("Alice").closest("li") as HTMLElement;
    const img = within(aliceRow).getByRole("img", { name: "Alice" });
    expect(img).toHaveAttribute("src", "/avatars/alice.png");
  });

  it("shows the observer badge on an observer row", () => {
    render(DetailPage, { props: { data: baseData() as never } });
    const bobRow = screen.getByText("Bob").closest("li") as HTMLElement;
    expect(within(bobRow).getByText("Observer")).toBeInTheDocument();
  });
});
