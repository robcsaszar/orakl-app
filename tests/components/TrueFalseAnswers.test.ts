import type { AnswerStyleState } from "@orakl/client-core";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TrueFalseAnswers from "$lib/components/quiz/TrueFalseAnswers.svelte";

const answers = [
  { id: "t", text: "True" },
  { id: "f", text: "False" },
];

const idle: AnswerStyleState = {
  correctAnswerId: "",
  selectedAnswerId: null,
  answered: false,
};

function setup(styleState = idle, disabled = false) {
  const onSelect = vi.fn();
  render(TrueFalseAnswers, {
    props: { answers, styleState, disabled, onSelect },
  });
  return { onSelect, buttons: screen.getAllByRole("button") };
}

describe("TrueFalseAnswers", () => {
  it("renders two buttons", () => {
    const { buttons } = setup();
    expect(buttons).toHaveLength(2);
  });

  it("first button shows True", () => {
    const { buttons } = setup();
    expect(buttons[0]).toHaveTextContent("True");
  });

  it("second button shows False", () => {
    const { buttons } = setup();
    expect(buttons[1]).toHaveTextContent("False");
  });

  it("True button has aria-keyshortcuts=t", () => {
    const { buttons } = setup();
    expect(buttons[0]).toHaveAttribute("aria-keyshortcuts", "t");
  });

  it("False button has aria-keyshortcuts=f", () => {
    const { buttons } = setup();
    expect(buttons[1]).toHaveAttribute("aria-keyshortcuts", "f");
  });

  it("clicking True calls onSelect with true id", async () => {
    const user = userEvent.setup();
    const { onSelect, buttons } = setup();
    await user.click(buttons[0]);
    expect(onSelect).toHaveBeenCalledWith("t", "pointer");
  });

  it("clicking False calls onSelect with false id", async () => {
    const user = userEvent.setup();
    const { onSelect, buttons } = setup();
    await user.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith("f", "pointer");
  });

  it("disabled state prevents clicks", async () => {
    const user = userEvent.setup();
    const { onSelect, buttons } = setup(idle, true);
    expect(buttons[0]).toBeDisabled();
    await user.click(buttons[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("correct answer gets success class after reveal", () => {
    const revealed: AnswerStyleState = {
      correctAnswerId: "t",
      selectedAnswerId: "f",
      answered: true,
    };
    const { buttons } = setup(revealed, true);
    expect(buttons[0].className).toMatch(/success/);
  });

  it("wrong selection gets danger class after reveal", () => {
    const revealed: AnswerStyleState = {
      correctAnswerId: "t",
      selectedAnswerId: "f",
      answered: true,
    };
    const { buttons } = setup(revealed, true);
    expect(buttons[1].className).toMatch(/danger/);
  });
});
