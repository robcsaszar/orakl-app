import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CategorySelector from "$lib/components/quiz-setup/CategorySelector.svelte";

let reducedMotion = true;
vi.mock("../../src/lib/motion-prefs.js", () => ({
  prefersReducedMotion: () => reducedMotion,
}));

beforeEach(() => {
  reducedMotion = true;
});

const categories = [
  { id: "cat-1", name: "Science", icon: null, count: 50 },
  { id: "cat-2", name: "History", icon: null, count: 30 },
  { id: "cat-3", name: "Music", icon: null, count: 20 },
];

function setup(selected: string[] = []) {
  return render(CategorySelector, { props: { categories, selected } });
}

describe("CategorySelector", () => {
  it("renders all category names", () => {
    setup();
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Music")).toBeInTheDocument();
  });

  it("renders question count per category", () => {
    setup();
    expect(screen.getByText(/50 questions/)).toBeInTheDocument();
    expect(screen.getByText(/30 questions/)).toBeInTheDocument();
    expect(screen.getByText(/20 questions/)).toBeInTheDocument();
  });

  it("checking a category selects it", async () => {
    const user = userEvent.setup();
    setup();
    const checkbox = screen.getByRole("checkbox", { name: /science/i });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("unchecking a selected category deselects it", async () => {
    const user = userEvent.setup();
    setup(["cat-1"]);
    const checkbox = screen.getByRole("checkbox", { name: /science/i });
    expect(checkbox).toBeChecked();
    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("'Select all' button selects all categories", async () => {
    const user = userEvent.setup();
    setup([]);
    await user.click(screen.getByRole("button", { name: /select all/i }));
    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) expect(cb).toBeChecked();
  });

  it("'Deselect all' appears when all selected, clicking it deselects all", async () => {
    const user = userEvent.setup();
    setup(["cat-1", "cat-2", "cat-3"]);
    const btn = screen.getByRole("button", { name: /deselect all/i });
    await user.click(btn);
    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) expect(cb).not.toBeChecked();
  });

  it("'Invert selection' inverts the current state", async () => {
    const user = userEvent.setup();
    setup(["cat-1"]);
    await user.click(screen.getByRole("button", { name: /invert selection/i }));
    expect(
      screen.getByRole("checkbox", { name: /science/i }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /history/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /music/i })).toBeChecked();
  });

  it("shows the target percent instantly under prefers-reduced-motion", () => {
    setup(["cat-1"]);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("has no layout-property transition on the category grid", () => {
    setup();
    const grid = screen.getByText("Science").closest(".grid");
    expect(grid?.className).not.toMatch(/transition-\[max-height\]/);
  });

  it("count-up in flight, reduced-motion flips on, reselect", async () => {
    const user = userEvent.setup();
    let rafId = 0;
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation(() => ++rafId);
    const cafSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});

    try {
      reducedMotion = false;
      setup([]);
      // Selecting Science alone targets 100% — animate() requests a frame but
      // (RAF stubbed, never fired) displayedPcts stays at 0, i.e. in flight.
      await user.click(screen.getByRole("checkbox", { name: /science/i }));
      expect(rafSpy).toHaveBeenCalled();
      const pendingId = rafSpy.mock.results[0]?.value;

      reducedMotion = true;
      // Reselecting History changes Science's target from 100% to 63%
      // (50 of 80) — animate() re-fires for the still-pending Science frame.
      await user.click(screen.getByRole("checkbox", { name: /history/i }));
      expect(cafSpy).toHaveBeenCalledWith(pendingId);
      expect(screen.getByText("63%")).toBeInTheDocument();
    } finally {
      rafSpy.mockRestore();
      cafSpy.mockRestore();
    }
  });
});
