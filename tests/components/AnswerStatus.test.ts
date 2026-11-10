import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AnswerStatus from "$lib/components/quiz/AnswerStatus.svelte";

describe("AnswerStatus", () => {
  it("pending → role=status (polite live region)", () => {
    render(AnswerStatus, { props: { status: "pending" } });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("pending → aria-live=polite", () => {
    render(AnswerStatus, { props: { status: "pending" } });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("pending → shows waiting copy", () => {
    render(AnswerStatus, { props: { status: "pending" } });
    expect(screen.getByText(/waiting for other players/i)).toBeInTheDocument();
  });

  it("pending during a last call → names the reveal countdown, not the wait", () => {
    render(AnswerStatus, {
      props: {
        status: "pending",
        answeredCount: 4,
        totalToAnswer: 4,
        lastCallSeconds: 3,
      },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Everyone has answered. Revealing in 3…",
    );
    expect(screen.queryByText(/waiting for/i)).toBeNull();
  });

  it("pending with no last call running → the waiting line", () => {
    render(AnswerStatus, {
      props: {
        status: "pending",
        answeredCount: 2,
        totalToAnswer: 4,
        lastCallSeconds: 0,
      },
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Waiting for 2 more answers...",
    );
    expect(screen.queryByText(/revealing in/i)).toBeNull();
  });

  it("correct → role=alert (assertive)", () => {
    render(AnswerStatus, { props: { status: "correct" } });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("correct → shows 'Correct!'", () => {
    render(AnswerStatus, { props: { status: "correct" } });
    expect(screen.getByText("Correct!")).toBeInTheDocument();
  });

  it("incorrect → role=alert", () => {
    render(AnswerStatus, { props: { status: "incorrect" } });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("incorrect → shows 'Incorrect'", () => {
    render(AnswerStatus, { props: { status: "incorrect" } });
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
  });

  it('timeout → shows "Time\'s up"', () => {
    render(AnswerStatus, { props: { status: "timeout" } });
    expect(screen.getByText("Time's up")).toBeInTheDocument();
  });

  it("correct → applies green class", () => {
    render(AnswerStatus, { props: { status: "correct" } });
    expect(screen.getByRole("alert").className).toMatch(/green/);
  });

  it("incorrect → applies danger class", () => {
    render(AnswerStatus, { props: { status: "incorrect" } });
    expect(screen.getByRole("alert").className).toMatch(/danger/);
  });
});
