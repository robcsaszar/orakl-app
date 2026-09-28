import type { TimerState } from "@orakl/client-core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import RingTimer from "$lib/components/ui/RingTimer.svelte";

function setup(
  timerState: TimerState,
  timeRemaining = 20,
  timerFraction = 0.5,
  observer = false,
) {
  return render(RingTimer, {
    props: { timerState, timeRemaining, timerFraction, observer },
  });
}

describe("RingTimer — counting state", () => {
  it("shows timeRemaining as text", () => {
    setup("counting", 15);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("does not apply timer-low animation class", () => {
    const { container } = setup("counting", 15);
    expect(container.querySelector(".animate-timer-low")).toBeNull();
  });
});

describe("RingTimer — low state", () => {
  it("shows timeRemaining as text", () => {
    setup("low", 4);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("applies animate-timer-low class", () => {
    const { container } = setup("low", 4);
    expect(container.querySelector(".animate-timer-low")).not.toBeNull();
  });
});

describe("RingTimer — result states", () => {
  it("correct state hides the time number", () => {
    setup("correct");
    expect(screen.queryByText("20")).not.toBeInTheDocument();
  });

  it("incorrect state hides the time number", () => {
    setup("incorrect");
    expect(screen.queryByText("20")).not.toBeInTheDocument();
  });

  it("timeout state hides the time number", () => {
    setup("timeout");
    expect(screen.queryByText("20")).not.toBeInTheDocument();
  });

  it("timeout state hides the ring circle (opacity-0)", () => {
    const { container } = setup("timeout");
    const ring = container.querySelectorAll("circle")[1];
    const cls = ring?.className.baseVal ?? ring?.getAttribute("class") ?? "";
    expect(cls).toContain("opacity-0");
  });

  it("incorrect state applies stroke-danger to the ring circle", () => {
    const { container } = setup("incorrect");
    const ring = container.querySelectorAll("circle")[1];
    const cls = ring?.className.baseVal ?? ring?.getAttribute("class") ?? "";
    expect(cls).toContain("stroke-danger");
  });
});

describe("RingTimer — final state (last countdown)", () => {
  it("hides the time number and shows the wreath", () => {
    const { container } = setup("final", 5, 0.6);
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    const centre = container.querySelector("span.absolute svg");
    expect(centre).toBeTruthy();
  });

  it("keeps the ring draining (not hidden) at the given fraction", () => {
    const { container } = setup("final", 5, 0.6);
    const ring = container.querySelectorAll("circle")[1] as SVGCircleElement;
    const cls = ring?.className.baseVal ?? ring?.getAttribute("class") ?? "";
    expect(cls).not.toContain("opacity-0");
    expect(ring.style.strokeDashoffset).toBe(
      String(2 * Math.PI * 28 * (1 - 0.6)),
    );
  });
});

describe("RingTimer — observer mode", () => {
  it("does not show the time number", () => {
    setup("counting", 20, 0.5, true);
    expect(screen.queryByText("20")).not.toBeInTheDocument();
  });

  it("renders the eye SVG (observer icon)", () => {
    const { container } = setup("counting", 20, 0.5, true);
    // The iris path is unique to the observer eye icon
    expect(container.querySelector(".iris")).not.toBeNull();
  });
});

describe("RingTimer — SVG ring", () => {
  it("renders the track and progress circles", () => {
    const { container } = setup("counting");
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2); // track + ring
  });
});
