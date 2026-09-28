import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ProgressBar from "$lib/components/quiz/ProgressBar.svelte";

describe("ProgressBar", () => {
  it("has progressbar role", () => {
    render(ProgressBar, { props: { progress: 50 } });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("aria-valuenow reflects progress prop", () => {
    render(ProgressBar, { props: { progress: 75 } });
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "75",
    );
  });

  it("aria-valuemin is 0 and aria-valuemax is 100", () => {
    render(ProgressBar, { props: { progress: 50 } });
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("defaults aria-label to 'Round progress'", () => {
    render(ProgressBar, { props: { progress: 50 } });
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Round progress",
    );
  });

  it("uses provided label as aria-label", () => {
    render(ProgressBar, { props: { progress: 50, label: "Question 3 of 10" } });
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Question 3 of 10",
    );
  });

  it("renders label text when label prop is set", () => {
    render(ProgressBar, { props: { progress: 50, label: "Halfway there" } });
    expect(screen.getByText("Halfway there")).toBeInTheDocument();
  });

  it("renders no visible label text when label is omitted", () => {
    render(ProgressBar, { props: { progress: 50 } });
    expect(screen.queryByText("Halfway there")).not.toBeInTheDocument();
  });

  it("fill is scaled to nothing when progress is 0", () => {
    const { container } = render(ProgressBar, { props: { progress: 0 } });
    expect(container.querySelector("[style*='scaleX(0)']")).not.toBeNull();
    expect(container.querySelector("[style*='width']")).toBeNull();
  });

  it("fill is scaled to full at 100%", () => {
    const { container } = render(ProgressBar, { props: { progress: 100 } });
    expect(container.querySelector("[style*='scaleX(1)']")).not.toBeNull();
  });
});
