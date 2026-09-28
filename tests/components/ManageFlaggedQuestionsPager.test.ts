import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ManageFlaggedQuestions from "../../src/routes/(app)/manage/flagged-questions/ManageFlaggedQuestions.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

const ROWS = [
  {
    questionId: "q-1",
    excerpt: "Which Norse god forged Mjolnir?",
    categoryId: "Mythology",
    flagCount: 2,
    status: "open" as const,
  },
];

function renderAt(initialPage: number) {
  return render(ManageFlaggedQuestions, {
    props: {
      initial: ROWS,
      initialHasMore: true,
      initialStatus: "open" as const,
      initialPage,
    },
  });
}

/**
 * The load function has always returned the page it parsed from `?page=`; the
 * component is what has to start there. A test over `load` alone passes either
 * way, so these assert the rendered pager.
 */
describe("ManageFlaggedQuestions deep link", () => {
  it("starts on the page the server loaded", async () => {
    renderAt(3);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText(/Page 3/)).toBeInTheDocument();
  });

  it("leaves Previous usable on a deep-linked later page", async () => {
    renderAt(3);
    await new Promise((r) => setTimeout(r, 0));
    const previous = screen.getByRole("button", { name: "Previous" });
    expect((previous as HTMLButtonElement).disabled).toBe(false);
  });

  it("disables Previous on the first page", async () => {
    renderAt(1);
    await new Promise((r) => setTimeout(r, 0));
    const previous = screen.getByRole("button", { name: "Previous" });
    expect((previous as HTMLButtonElement).disabled).toBe(true);
  });
});
