import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import StreakIndicator from "$lib/components/quiz/StreakIndicator.svelte";

describe("StreakIndicator", () => {
  it("hidden below visibleAt", () => {
    const { container } = render(StreakIndicator, {
      props: { streak: 1, flourish: null, nonce: 0 },
    });
    expect(container.querySelector(".streak")).not.toBeInTheDocument();
  });

  it("shows the pill text at 3", () => {
    const { container } = render(StreakIndicator, {
      props: { streak: 3, flourish: null, nonce: 0 },
    });
    expect(container.querySelector(".streak")?.textContent).toContain("3");
  });

  it('shows "Kindled!" on a gain-3 flourish', () => {
    render(StreakIndicator, {
      props: { streak: 3, flourish: { kind: "gain", value: 3 }, nonce: 1 },
    });
    expect(screen.getByText("Kindled!")).toBeInTheDocument();
  });

  it('shows "Flame quenched." on a loss-3 flourish', () => {
    render(StreakIndicator, {
      props: { streak: 0, flourish: { kind: "loss", value: 3 }, nonce: 1 },
    });
    expect(screen.getByText("Flame quenched.")).toBeInTheDocument();
  });

  it('shows "So close." on a near-miss flourish', () => {
    render(StreakIndicator, {
      props: { streak: 0, flourish: { kind: "near-miss", value: 2 }, nonce: 1 },
    });
    expect(screen.getByText("So close.")).toBeInTheDocument();
  });
});
