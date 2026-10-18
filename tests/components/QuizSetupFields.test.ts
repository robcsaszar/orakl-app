import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
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

describe("QuizSetupFields — seasons", () => {
  const seasons = [
    {
      id: "s-open",
      name: "Halloween",
      icon: null,
      color: null,
      count: 12,
      locked: false,
      opensOn: null,
    },
    {
      id: "s-shut",
      name: "Yule",
      icon: null,
      color: null,
      count: 7,
      locked: true,
      opensOn: "2026-12-20",
    },
  ];

  it("renders no Seasons group without seasons", () => {
    setup();
    expect(screen.queryByText("Seasons")).not.toBeInTheDocument();
  });

  it("renders the Seasons group above Categories", () => {
    setup({ seasons });
    const seasonsLegend = screen.getByText("Seasons");
    const categoriesLegend = screen.getByText("Categories");
    expect(
      seasonsLegend.compareDocumentPosition(categoriesLegend) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("offers an open Season as a checkbox with its question count", () => {
    setup({ seasons });
    expect(screen.getByRole("checkbox", { name: /halloween/i })).toBeEnabled();
    expect(screen.getByText("12 questions")).toBeInTheDocument();
  });

  it("shows a locked Season with its opening day, not toggleable", () => {
    setup({ seasons });
    const yule = screen.getByRole("checkbox", { name: /yule/i });
    expect(yule).toBeDisabled();
    expect(screen.getByText(/Opens .*Dec.*2026/)).toBeInTheDocument();
  });

  it("toggles a Season id into selectedSeasons", async () => {
    setup({ seasons, selectedSeasons: [] });
    const box = screen.getByRole("checkbox", { name: /halloween/i });
    await userEvent.click(box);
    expect(box).toBeChecked();
  });

  it("counts a picked Season against the category cap", () => {
    setup({
      seasons,
      selectedSeasons: ["s-open"],
      selectedCategories: ["cat-1"],
      maxCategories: 2,
    });
    expect(screen.getByRole("checkbox", { name: /science/i })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /history/i })).toBeDisabled();
  });

  it("shows one shared cap line with the number when capped", () => {
    setup({ seasons, selectedSeasons: ["s-open"], maxCategories: 3 });
    expect(
      screen.getAllByText(
        "Pick up to 3 seasons or categories in total. Sign in to pick more.",
      ),
    ).toHaveLength(1);
    expect(screen.queryByText(/Choose up to/)).not.toBeInTheDocument();
  });

  it("says '1 question' for a one-question Season", () => {
    setup({ seasons: [{ ...seasons[0], count: 1 }] });
    expect(screen.getByText("1 question")).toBeInTheDocument();
  });

  it("disables a locked tile through the input, not aria-disabled", () => {
    setup({ seasons });
    const yule = screen.getByRole("checkbox", { name: /yule/i });
    expect(yule).toBeDisabled();
    expect(yule.closest("label")).not.toHaveAttribute("aria-disabled");
  });

  it("shows the Season icon on a locked tile", () => {
    setup({
      seasons: [{ ...seasons[1], icon: "/yule.svg", color: "#aa0000" }],
    });
    expect(document.querySelector('img[src="/yule.svg"]')).not.toBeNull();
  });
});
