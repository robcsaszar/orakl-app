import type { MatchStyleState } from "@orakl/client-core";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ImageMatchingGrid from "$lib/components/quiz/ImageMatchingGrid.svelte";

// jsdom lacks SVG path methods; mock the drawing helpers to prevent crashes
vi.mock("../../src/lib/question-helpers.js", () => ({
  drawMatchLines: vi.fn(),
  drawPendingLine: vi.fn(),
  drawHoverLine: vi.fn(),
}));

const matchItems = {
  left: ["Cat", "Dog", "Bird"],
  right: ["Meow", "Woof", "Tweet"],
};

const idle: MatchStyleState = {
  correctAnswerId: "",
  selectedLeftItem: null,
  selectedRightItem: null,
  answered: false,
};

function setup(styleState = idle, disabled = false) {
  const onSelect = vi.fn();
  render(ImageMatchingGrid, {
    props: { matchItems, styleState, disabled, onSelect },
  });
  return { onSelect };
}

describe("ImageMatchingGrid", () => {
  it("renders a button for each left item", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dog" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bird" })).toBeInTheDocument();
  });

  it("renders a button for each right item", () => {
    setup();
    expect(screen.getByRole("button", { name: "Meow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Woof" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tweet" })).toBeInTheDocument();
  });

  it("renders 'Match from' column header", () => {
    setup();
    expect(screen.getByText(/match from/i)).toBeInTheDocument();
  });

  it("renders 'Match to' column header", () => {
    setup();
    expect(screen.getByText(/match to/i)).toBeInTheDocument();
  });

  it("clicking a left item calls onSelect('left', item)", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    await user.click(screen.getByRole("button", { name: "Cat" }));
    expect(onSelect).toHaveBeenCalledWith("left", "Cat", "pointer");
  });

  it("clicking a right item calls onSelect('right', item)", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    await user.click(screen.getByRole("button", { name: "Woof" }));
    expect(onSelect).toHaveBeenCalledWith("right", "Woof", "pointer");
  });

  it("disabled=true marks all buttons disabled", () => {
    setup(idle, true);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) expect(btn).toBeDisabled();
  });

  it("disabled=true prevents onSelect from firing", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup(idle, true);
    await user.click(screen.getByRole("button", { name: "Cat" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("ImageMatchingGrid — reveal", () => {
  const revealed: MatchStyleState = {
    correctAnswerId: "Cat|Meow",
    selectedLeftItem: "Dog",
    selectedRightItem: "Woof",
    answered: true,
  };

  function setupRevealed() {
    const onSelect = vi.fn();
    const { container } = render(ImageMatchingGrid, {
      props: { matchItems, styleState: revealed, disabled: true, onSelect },
    });
    return { container, onSelect };
  }

  it("correct left item gets success class", () => {
    setupRevealed();
    const btn = screen.getByRole("button", { name: "Cat" });
    expect(btn.className).toContain("border-success");
  });

  it("correct right item gets success class", () => {
    setupRevealed();
    const btn = screen.getByRole("button", { name: "Meow" });
    expect(btn.className).toContain("border-success");
  });

  it("wrong selected left item gets danger class", () => {
    setupRevealed();
    const btn = screen.getByRole("button", { name: "Dog" });
    expect(btn.className).toContain("border-danger");
  });

  it("non-selected items are dimmed", () => {
    setupRevealed();
    const btn = screen.getByRole("button", { name: "Bird" });
    expect(btn.className).toContain("opacity-50");
  });
});
