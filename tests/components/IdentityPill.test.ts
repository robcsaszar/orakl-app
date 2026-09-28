import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import IdentityPill from "$lib/components/quiz/IdentityPill.svelte";

describe("IdentityPill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the score immediately when no points were just earned", () => {
    render(IdentityPill, { props: { score: 5 } });
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("mounting with lastPointsEarned already set doesn't loop or throw (regression: effect read+wrote flyingPoints in the same pass)", () => {
    expect(() =>
      render(IdentityPill, { props: { score: 100, lastPointsEarned: 100 } }),
    ).not.toThrow();
  });

  it("steps the displayed score up to the target instead of jumping", async () => {
    render(IdentityPill, { props: { score: 100, lastPointsEarned: 100 } });
    // Immediately after mount the step hasn't run yet — starts at 0.
    expect(screen.getByText("0")).toBeInTheDocument();
    vi.advanceTimersByTime(1000);
    await tick();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("shows a '+N' delta cue while earning points", () => {
    render(IdentityPill, { props: { score: 100, lastPointsEarned: 100 } });
    expect(screen.getByText("+100")).toBeInTheDocument();
  });

  it("clears the delta cue once it has settled", async () => {
    render(IdentityPill, { props: { score: 100, lastPointsEarned: 100 } });
    expect(screen.getByText("+100")).toBeInTheDocument();
    vi.advanceTimersByTime(2000);
    await tick();
    expect(screen.queryByText("+100")).not.toBeInTheDocument();
  });

  it("variant 2 shows previous total, the gain, and new total on one line", async () => {
    render(IdentityPill, {
      props: { score: 250, lastPointsEarned: 50, variant: 2 },
    });
    vi.advanceTimersByTime(700);
    await tick();
    expect(screen.getByText("200")).toBeInTheDocument(); // previous total
    expect(screen.getByText("+50")).toBeInTheDocument(); // round gain
    expect(screen.getByText("250")).toBeInTheDocument(); // new total
  });

  it("variant 3 splits standing total and round gain into labelled segments", async () => {
    render(IdentityPill, {
      props: { score: 250, lastPointsEarned: 50, variant: 3 },
    });
    vi.advanceTimersByTime(700);
    await tick();
    expect(screen.getByText("total")).toBeInTheDocument();
    expect(screen.getByText("round")).toBeInTheDocument();
    expect(screen.getByText("+50")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("cleans up timers on unmount without errors", async () => {
    const { unmount } = render(IdentityPill, {
      props: { score: 200, lastPointsEarned: 100 },
    });
    unmount();
    vi.advanceTimersByTime(2000);
    await tick();
  });

  it("resyncs the score when score changes while lastPointsEarned stays the same (mimic mode: fixed preview delta, adjustable score param)", async () => {
    const { rerender } = render(IdentityPill, {
      props: { score: 50, lastPointsEarned: 100 },
    });
    vi.advanceTimersByTime(1000);
    await tick();
    expect(screen.getByText("50")).toBeInTheDocument();

    await rerender({ score: 80, lastPointsEarned: 100 });
    await tick();
    vi.advanceTimersByTime(1000);
    await tick();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("snaps straight to the target when lastPointsEarned is 0 (no round just won)", () => {
    render(IdentityPill, { props: { score: 42, lastPointsEarned: 0 } });
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
