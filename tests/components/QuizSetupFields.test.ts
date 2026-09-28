import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import QuizSetupFields from "$lib/components/quiz-setup/QuizSetupFields.svelte";

const categories = [
  { id: "cat-1", name: "Science", icon: null, count: 40 },
  { id: "cat-2", name: "History", icon: null, count: 20 },
];

function setup(overrides = {}, powerUser = false) {
  return render(QuizSetupFields, {
    props: {
      categories,
      selectedCategories: [],
      difficulty: "all" as const,
      timer: 30 as const,
      questionsPerRound: 10 as const,
      ...overrides,
    },
    context: new Map([[Symbol.for("orakl.power-user"), () => powerUser]]),
  });
}

describe("QuizSetupFields", () => {
  it("renders a Categories section", () => {
    setup();
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });

  it("renders all category names", () => {
    setup();
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });

  it("renders a Difficulty selector with all four options", () => {
    setup();
    expect(
      screen.getByRole("radio", { name: /all difficulties/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /easy/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /medium/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /hard/i })).toBeInTheDocument();
  });

  it("renders Answer time timer options (15s, 30s, 45s, 60s)", () => {
    setup();
    expect(screen.getByText("Answer time")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /15 seconds/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /30 seconds/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /45 seconds/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /60 seconds/i }),
    ).toBeInTheDocument();
  });

  it("renders Questions per round options (10, 20, 50, 100)", () => {
    setup();
    expect(screen.getByText("Questions")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /^10 questions$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /^20 questions$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /^50 questions$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /^100 questions$/i }),
    ).toBeInTheDocument();
  });

  it("selected timer option is checked", () => {
    setup({ timer: 45 });
    expect(screen.getByRole("radio", { name: /45 seconds/i })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /30 seconds/i }),
    ).not.toBeChecked();
  });

  it("hides questions per round when showQuestionsPerRound=false", () => {
    setup({ showQuestionsPerRound: false });
    expect(screen.queryByText("Questions")).not.toBeInTheDocument();
  });

  it("categoriesError=true marks the categories group with error style", () => {
    const { container } = setup({ categoriesError: true });
    const group = container.querySelector('[role="group"]');
    expect(group?.className).toContain("border-red-500");
  });
});

describe("QuizSetupFields — is-power-user", () => {
  it("offers a description toggle per field to an ordinary account", () => {
    setup();
    expect(
      screen.getAllByRole("button", { name: /toggle description/i }).length,
    ).toBeGreaterThan(0);
  });

  it("strips every one of them for a holder", () => {
    setup({}, true);
    expect(
      screen.queryAllByRole("button", { name: /toggle description/i }),
    ).toEqual([]);
    // The legends stay — the power hides the explanations, not the fields.
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("Answer time")).toBeInTheDocument();
  });
});
