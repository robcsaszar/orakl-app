import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RatingThumbs from "$lib/components/quiz/RatingThumbs.svelte";
import { type RatingState, ratingFor } from "$lib/question-rating-state";

function props(rating: RatingState = ratingFor("q-1"), onrate = vi.fn()) {
  return { rating, onrate };
}

describe("RatingThumbs", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders bad then good with accessible names and tooltips", () => {
    render(RatingThumbs, { props: props() });
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Bad question",
      "Good question",
    ]);
    expect(buttons[0]).toHaveAttribute("data-tooltip", "Bad question");
    expect(buttons[1]).toHaveAttribute("data-tooltip", "Good question");
    for (const b of buttons) expect(b).toHaveAttribute("data-rating-thumb");
  });

  it("clicking a thumb calls onrate with its rating", async () => {
    const onrate = vi.fn();
    render(RatingThumbs, { props: props(ratingFor("q-1"), onrate) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "Good question" }));
    await user.click(screen.getByRole("button", { name: "Bad question" }));
    expect(onrate.mock.calls).toEqual([["up"], ["down"]]);
  });

  it("pending marks only the tapped thumb aria-busy", () => {
    render(RatingThumbs, {
      props: props({ ...ratingFor("q-1"), pending: "up" }),
    });
    expect(
      screen.getByRole("button", { name: "Good question" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("button", { name: "Bad question" }),
    ).not.toHaveAttribute("aria-busy", "true");
  });

  it("ok result shows Submitted under the tapped thumb only", () => {
    render(RatingThumbs, {
      props: props({
        ...ratingFor("q-1"),
        result: { rating: "up", ok: true, seq: 1 },
      }),
    });
    expect(screen.getAllByText("Submitted")).toHaveLength(1);
    const status = screen.getByText("Submitted");
    expect(status).toHaveAttribute("aria-live", "polite");
    const good = screen.getByRole("button", {
      name: "Good question, submitted",
    });
    expect(good.parentElement).toContainElement(status);
    expect(
      screen.getByRole("button", { name: "Bad question" }),
    ).toBeInTheDocument();
  });

  it("error result shows Failed, then the thumb returns after 2000 ms", async () => {
    render(RatingThumbs, {
      props: props({
        ...ratingFor("q-1"),
        result: { rating: "down", ok: false, seq: 1 },
      }),
    });
    expect(screen.getByText("Failed")).toBeInTheDocument();
    vi.advanceTimersByTime(1999);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    vi.advanceTimersByTime(1);
    await vi.waitFor(() => expect(screen.queryByText("Failed")).toBeNull());
    expect(
      screen.getByRole("button", { name: "Bad question" }),
    ).toBeInTheDocument();
  });

  it("a centre snippet renders between the thumbs", () => {
    const children = createRawSnippet(() => ({
      render: () => '<span data-testid="centre">ring</span>',
    }));
    const { container } = render(RatingThumbs, {
      props: { ...props(), children },
    });
    const bad = screen.getByRole("button", { name: "Bad question" });
    const good = screen.getByRole("button", { name: "Good question" });
    const centre = screen.getByTestId("centre");
    expect(
      bad.compareDocumentPosition(centre) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      centre.compareDocumentPosition(good) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container).toContainElement(centre);
  });

  it("no thumb is a toggle: aria-pressed is absent", () => {
    render(RatingThumbs, {
      props: props({
        ...ratingFor("q-1"),
        result: { rating: "up", ok: true, seq: 1 },
      }),
    });
    for (const b of screen.getAllByRole("button")) {
      expect(b).not.toHaveAttribute("aria-pressed");
    }
  });

  it("the ✓ thumb's accessible name says submitted; the other keeps its label", () => {
    render(RatingThumbs, {
      props: props({
        ...ratingFor("q-1"),
        result: { rating: "up", ok: true, seq: 1 },
      }),
    });
    expect(
      screen.getByRole("button", { name: "Good question, submitted" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bad question" }),
    ).toBeInTheDocument();
  });

  it("the live region names the rating it reports on", () => {
    render(RatingThumbs, {
      props: props({
        ...ratingFor("q-1"),
        result: { rating: "up", ok: true, seq: 1 },
      }),
    });
    const status = screen.getByText("Submitted").closest("[role=status]");
    expect(status?.textContent).toBe("Good question: Submitted");
    expect(screen.getByText("Submitted")).toBeVisible();
  });

  it("an idle live region is empty", () => {
    render(RatingThumbs, { props: props() });
    for (const s of screen.getAllByRole("status")) {
      expect(s.textContent).toBe("");
    }
  });

  it("tooltips sit above the thumbs", () => {
    render(RatingThumbs, { props: props() });
    for (const b of screen.getAllByRole("button")) {
      expect(b).toHaveAttribute("data-tooltip-position", "top");
    }
  });

  it("thumb wrappers are offset by mt-1 only with a centre snippet", () => {
    const wrappers = () =>
      screen.getAllByRole("button").map((b) => b.parentElement);
    const { unmount } = render(RatingThumbs, { props: props() });
    for (const w of wrappers()) expect(w).not.toHaveClass("mt-1");
    unmount();
    const children = createRawSnippet(() => ({
      render: () => "<span>ring</span>",
    }));
    render(RatingThumbs, { props: { ...props(), children } });
    for (const w of wrappers()) expect(w).toHaveClass("mt-1");
  });
});
