import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ListPage from "../../src/routes/(game)/curator/history/+page.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../../src/lib/format.js", () => ({
  formatDateShort: () => "Mar 5, 2026",
}));

function entry(overrides: Record<string, unknown>) {
  return {
    id: "s1",
    quiz_name: "Norse gods",
    started_at: "2026-03-05 23:30:00",
    player_count: 2,
    total_questions: 5,
    winners: [],
    top_score: null,
    ...overrides,
  };
}

describe("curator history list", () => {
  it("shows a single winner", () => {
    render(ListPage, {
      props: {
        data: {
          entries: [entry({ winners: ["Ada"], top_score: 80 })],
          nextCursor: null,
        } as never,
      },
    });
    expect(screen.getByText("Winner: Ada")).toBeInTheDocument();
  });

  it("lists all co-winners on a tie", () => {
    render(ListPage, {
      props: {
        data: {
          entries: [entry({ winners: ["Ada", "Bo"], top_score: 80 })],
          nextCursor: null,
        } as never,
      },
    });
    expect(screen.getByText("Winners: Ada, Bo")).toBeInTheDocument();
  });

  it("shows no winner when the game has no results", () => {
    render(ListPage, {
      props: {
        data: {
          entries: [entry({ id: "s2", winners: [], top_score: null })],
          nextCursor: null,
        } as never,
      },
    });
    expect(screen.queryByText(/Winner/)).not.toBeInTheDocument();
  });

  it("meta shows top score and correct player pluralization", () => {
    render(ListPage, {
      props: {
        data: {
          entries: [
            entry({
              id: "s3",
              player_count: 1,
              winners: ["Ada"],
              top_score: 80,
            }),
          ],
          nextCursor: null,
        } as never,
      },
    });
    const meta = screen.getByText(/top 80/);
    expect(meta.textContent).toContain("1 player");
    expect(meta.textContent).not.toContain("1 players");
  });

  it("links the row to the curator game detail page", () => {
    render(ListPage, {
      props: {
        data: {
          entries: [entry({ id: "abc123", winners: ["Ada"], top_score: 80 })],
          nextCursor: null,
        } as never,
      },
    });
    const link = screen.getByRole("link", { name: /view results/i });
    expect(link).toHaveAttribute("href", "/curator/history/abc123");
  });
});
