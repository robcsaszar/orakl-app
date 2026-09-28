import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AnswerButton from "../../src/lib/components/ui/AnswerButton.svelte";

const STATES = [
  "idle",
  "selected",
  "correct",
  "incorrect",
  "dimmed",
  "answered",
] as const;
const TYPES = ["multiple_choice", "true_false", "match"] as const;
const FLAVORS = ["none", "positive", "negative"] as const;

function classesOf(props: Record<string, unknown>) {
  const { container } = render(AnswerButton, { props });
  return (container.firstElementChild as HTMLElement).className;
}

describe("AnswerButton", () => {
  it("renders a squircle button", () => {
    render(AnswerButton);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("corner-shape-squircle");
  });

  it("idle is neutral; selected, correct and incorrect carry the semantic recipes", () => {
    expect(classesOf({ state: "idle" })).not.toMatch(
      /success|danger|border-secondary\b/,
    );
    expect(classesOf({ state: "selected" })).toContain("border-secondary");
    expect(classesOf({ state: "correct" })).toContain("bg-success");
    expect(classesOf({ state: "incorrect" })).toContain("bg-danger");
  });

  it("dimmed and answered fade the tile", () => {
    expect(classesOf({ state: "dimmed" })).toContain("opacity-50");
    expect(classesOf({ state: "answered" })).toContain("opacity-50");
  });

  it("true/false flavours tint idle tiles before the reveal", () => {
    expect(
      classesOf({ questionType: "true_false", flavor: "positive" }),
    ).toContain("border-success/40");
    expect(
      classesOf({ questionType: "true_false", flavor: "negative" }),
    ).toContain("border-danger/40");
    expect(
      classesOf({
        questionType: "true_false",
        flavor: "positive",
        state: "correct",
      }),
    ).toContain("bg-success");
  });

  it("true_false type applies the wide, centred layout", () => {
    expect(classesOf({ questionType: "true_false" })).toMatch(/text-center/);
  });

  it("never emits a raw palette class across the whole matrix", () => {
    for (const state of STATES)
      for (const questionType of TYPES)
        for (const flavor of FLAVORS)
          expect(
            classesOf({ state, questionType, flavor }),
            `${state}/${questionType}/${flavor}`,
          ).not.toMatch(
            /\b(bg|text|border|ring)-(gray|violet|green|red|emerald|rose|amber)-\d/,
          );
  });

  it("passes through disabled and data attributes", () => {
    render(AnswerButton, {
      props: { disabled: true, "data-match-left": "Rome" },
    });
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("data-match-left", "Rome");
  });
});
