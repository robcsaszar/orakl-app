import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import QuestionBlock from "$lib/components/quiz/QuestionBlock.svelte";

function makeChildren(text: string) {
  return createRawSnippet(() => ({ render: () => text }));
}

const baseProps = {
  timerState: "counting" as const,
  timeRemaining: 20,
  timerFraction: 0.5,
};

describe("QuestionBlock", () => {
  it("renders children text inside the heading", () => {
    render(QuestionBlock, {
      props: {
        ...baseProps,
        children: makeChildren("What is the capital of France?"),
      },
    });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "What is the capital of France?",
    );
  });

  it("renders the ring timer", () => {
    const { container } = render(QuestionBlock, {
      props: { ...baseProps, children: makeChildren("Q") },
    });
    // RingTimer renders two SVG circles (track + ring)
    expect(container.querySelectorAll("circle")).toHaveLength(2);
  });

  it("displays timeRemaining inside the timer", () => {
    render(QuestionBlock, {
      props: { ...baseProps, timeRemaining: 12, children: makeChildren("Q") },
    });
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("observer mode hides the time number and shows eye icon", () => {
    const { container } = render(QuestionBlock, {
      props: { ...baseProps, observer: true, children: makeChildren("Q") },
    });
    expect(screen.queryByText("20")).not.toBeInTheDocument();
    expect(container.querySelector(".iris")).not.toBeNull();
  });
});
