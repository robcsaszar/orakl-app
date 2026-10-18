import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CreateQuiz from "../../src/routes/(game)/curator/create/CreateQuiz.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const categories = [{ id: "general", name: "General", count: 40 }];

const preset = {
  id: "p1",
  name: "Spooky",
  description: null,
  category_ids: JSON.stringify(["general", "gone-1", "gone-2"]),
  season_ids: JSON.stringify(["s1"]),
  timer_duration: 30,
  questions_per_round: 10,
  difficulty: "all",
  advance_mode: "auto_5",
  scoring_mode: null,
  access_mode: "open",
  max_players: null,
};

const presetMarks = {
  p1: {
    closedSeasons: [{ id: "s1", name: "Halloween", opensOn: "2027-10-15" }],
    missingSeasons: [],
    missingCategories: ["gone-1", "gone-2"],
  },
};

const renderWith = () =>
  render(CreateQuiz, {
    props: {
      categories,
      categoryColors: {},
      seasons: [
        {
          id: "s1",
          name: "Halloween",
          icon: null,
          color: null,
          count: 5,
          locked: true,
          opensOn: "2027-10-15",
        },
      ],
      presets: [preset],
      presetMarks,
      presetLimit: 10,
      quizPresets: true,
    } as never,
  });

describe("saved quiz marks on the create page", () => {
  it("says which Season is closed, when it opens, and how many categories are gone", () => {
    renderWith();
    expect(
      screen.getByText(
        `Halloween closed · opens ${new Date(2027, 9, 15).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} · 2 categories gone`,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/1 season · 3 categories/)).toBeTruthy();
  });

  it("applying drops the gone categories and the closed Season", async () => {
    renderWith();
    await fireEvent.click(screen.getByRole("button", { name: "Apply Spooky" }));
    const checkedValues = [
      ...document.querySelectorAll<HTMLInputElement>("input:checked"),
    ].map((i) => i.value);
    expect(checkedValues).toContain("general");
    expect(checkedValues).not.toContain("s1");
    expect(checkedValues).not.toContain("gone-1");
    expect(checkedValues).not.toContain("gone-2");
  });

  it("writes the opening day in the short browser format", () => {
    renderWith();
    const expected = new Date(2027, 9, 15).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    expect(screen.getByText(new RegExp(`opens ${expected}`))).toBeTruthy();
  });

  it("applying leaves an open Season absent from the list unticked", async () => {
    render(CreateQuiz, {
      props: {
        categories,
        categoryColors: {},
        seasons: [],
        presets: [{ ...preset, category_ids: "[]" }],
        presetMarks: {
          p1: { closedSeasons: [], missingSeasons: [], missingCategories: [] },
        },
        presetLimit: 10,
        quizPresets: true,
      } as never,
    });
    await fireEvent.click(screen.getByRole("button", { name: "Apply Spooky" }));
    expect(screen.getByRole("button", { name: "Host quiz" })).toBeDisabled();
  });
});
