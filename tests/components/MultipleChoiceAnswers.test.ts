import type { AnswerStyleState } from "@orakl/client-core";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import MultipleChoiceAnswers from "$lib/components/quiz/MultipleChoiceAnswers.svelte";

const answers = [
  { id: "a1", text: "Option A" },
  { id: "a2", text: "Option B" },
  { id: "a3", text: "Option C" },
];

const idle: AnswerStyleState = {
  correctAnswerId: "",
  selectedAnswerId: null,
  answered: false,
};

function setup(styleState = idle, disabled = false) {
  const onSelect = vi.fn();
  render(MultipleChoiceAnswers, {
    props: { answers, styleState, disabled, onSelect },
  });
  return { onSelect, buttons: screen.getAllByRole("button") };
}

describe("MultipleChoiceAnswers", () => {
  it("renders one button per answer", () => {
    const { buttons } = setup();
    expect(buttons).toHaveLength(3);
  });

  it("button text contains answer text", () => {
    const { buttons } = setup();
    expect(buttons[0]).toHaveTextContent("Option A");
    expect(buttons[1]).toHaveTextContent("Option B");
    expect(buttons[2]).toHaveTextContent("Option C");
  });

  it("clicking a button calls onSelect with that answer's id", async () => {
    const user = userEvent.setup();
    const { onSelect, buttons } = setup();
    await user.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith("a1", "pointer");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("clicking second button calls onSelect with second id", async () => {
    const user = userEvent.setup();
    const { onSelect, buttons } = setup();
    await user.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith("a2", "pointer");
  });

  it("disabled=true prevents clicks", async () => {
    const user = userEvent.setup();
    const { onSelect, buttons } = setup(idle, true);
    expect(buttons[0]).toBeDisabled();
    await user.click(buttons[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("correct answer gets success class after reveal", () => {
    const revealed: AnswerStyleState = {
      correctAnswerId: "a1",
      selectedAnswerId: "a2",
      answered: true,
    };
    const { buttons } = setup(revealed, true);
    expect(buttons[0].className).toMatch(/success/);
  });

  it("wrong selected answer gets danger class after reveal", () => {
    const revealed: AnswerStyleState = {
      correctAnswerId: "a1",
      selectedAnswerId: "a2",
      answered: true,
    };
    const { buttons } = setup(revealed, true);
    expect(buttons[1].className).toMatch(/danger/);
  });

  it("unselected wrong answers are dimmed after reveal", () => {
    const revealed: AnswerStyleState = {
      correctAnswerId: "a1",
      selectedAnswerId: "a2",
      answered: true,
    };
    const { buttons } = setup(revealed, true);
    // a3 was not selected and not correct → dimmed
    expect(buttons[2].className).toMatch(/opacity-50/);
  });
});
