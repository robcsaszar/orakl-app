import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ListPage from "../../src/routes/(game)/curator/history/+page.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const formatDateShort = vi.fn(() => "Mar 5, 2026");
vi.mock("../../src/lib/format.js", () => ({
  formatDateShort: (value: string) => formatDateShort(value),
}));

// SQLite datetime('now') shape — no "T", no zone. Rendered via toIsoTimestamp
// so every engine reads it as UTC instead of Invalid Date or local time.
const SQLITE_STAMP = "2026-03-05 23:30:00";

describe("curator history dates", () => {
  it("list page renders a SQLite-shaped started_at as a valid short date", () => {
    render(ListPage, {
      props: {
        data: {
          entries: [
            {
              id: "s1",
              quiz_name: "Norse gods",
              started_at: SQLITE_STAMP,
              player_count: 2,
              total_questions: 5,
              winners: ["Ada"],
              top_score: 80,
            },
          ],
          nextCursor: null,
        } as never,
      },
    });
    const line = screen.getByText(/2 players/);
    expect(formatDateShort).toHaveBeenCalledWith("2026-03-05T23:30:00Z");
    expect(formatDateShort).not.toHaveBeenCalledWith(SQLITE_STAMP);
    expect(line.textContent).toContain("Mar 5, 2026");
  });
});
