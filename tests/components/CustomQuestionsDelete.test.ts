import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../../src/lib/toast.js";
import CustomQuestionsPage from "../../src/routes/(game)/curator/questions/CustomQuestionsPage.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

const categories = [{ id: "cat-geo", name: "Geography", count: 3 }];

function row() {
  return {
    id: "q-1",
    category: "Geography",
    label: "Capital of France?",
    created_at: "2026-03-05 10:00:00",
  };
}

function renderPage() {
  return render(CustomQuestionsPage, {
    props: { categories, ownQuestions: [row()] },
  });
}

describe("curator library delete", () => {
  it("first tap asks for confirmation and sends nothing, with no dialog", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Delete question" }));
    expect(screen.getByText("Delete question?")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Capital of France?")).toBeInTheDocument();
  });

  it("second tap sends DELETE and removes the row", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    renderPage();
    await user.click(screen.getByRole("button", { name: "Delete question" }));
    await user.click(
      screen.getByRole("button", {
        name: "Click again to delete this question",
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText("Capital of France?")).toBeNull(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/custom-questions/q-1", {
      method: "DELETE",
    });
  });

  it("keeps the row when the DELETE fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "nope" }), { status: 500 }),
    );
    renderPage();
    await user.click(screen.getByRole("button", { name: "Delete question" }));
    await user.click(
      screen.getByRole("button", {
        name: "Click again to delete this question",
      }),
    );
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("nope"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Capital of France?")).toBeInTheDocument();
    expect(screen.getByText(/Geography \(3 questions\)/)).toBeInTheDocument();
  });
});
