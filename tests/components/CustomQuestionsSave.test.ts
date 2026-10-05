import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomQuestionsPage from "../../src/routes/(game)/curator/questions/CustomQuestionsPage.svelte";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const fetchMock = vi.fn();

const categories = [{ id: "cat-geo", name: "Geography", count: 3 }];

function row(id: string, label: string) {
  return {
    id,
    category: "Geography",
    label,
    created_at: "2026-03-05 10:00:00",
  };
}

function detail(id: string, text: string) {
  return {
    id,
    category: "Geography",
    difficulty: "medium",
    type: "text_choice",
    question: { text },
    correctAnswer: "Right",
    incorrectAnswers: ["Wrong 1", "Wrong 2", "Wrong 3"],
  };
}

/** Routes fetch by method and URL; the PATCH for q-a stays pending until release(). */
function stubApi() {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      await gate;
      return new Response("{}", { status: 200 });
    }
    const id = url.split("/").pop() as string;
    return new Response(
      JSON.stringify(detail(id, id === "q-a" ? "Question A" : "Question B")),
      { status: 200 },
    );
  });
  return release;
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

function renderPage() {
  return render(CustomQuestionsPage, {
    props: {
      categories,
      ownQuestions: [row("q-a", "Label A"), row("q-b", "Label B")],
    },
  });
}

describe("curator library save", () => {
  it("closes the edit when the save finishes and nothing else was opened", async () => {
    const user = userEvent.setup();
    const release = stubApi();
    renderPage();
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    await screen.findByDisplayValue("Question A");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    release();
    await waitFor(() =>
      expect(screen.queryByDisplayValue("Question A")).toBeNull(),
    );
    expect(
      screen.getByRole("button", { name: "Add question" }),
    ).toBeInTheDocument();
  });

  it("keeps a newer edit open with its fields when an earlier save finishes", async () => {
    const user = userEvent.setup();
    const release = stubApi();
    renderPage();
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    await screen.findByDisplayValue("Question A");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/custom-questions/q-a",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[1],
    );
    const text = await screen.findByDisplayValue("Question B");
    await user.type(text, " typed");
    release();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled(),
    );
    expect(screen.getByDisplayValue("Question B typed")).toBeInTheDocument();
  });

  it("keeps a reopened edit of the same question open when its earlier save finishes", async () => {
    const user = userEvent.setup();
    const release = stubApi();
    renderPage();
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    await screen.findByDisplayValue("Question A");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/custom-questions/q-a",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([url, init]) => url === "/api/custom-questions/q-a" && !init,
        ),
      ).toHaveLength(2),
    );
    const text = await screen.findByDisplayValue("Question A");
    await user.type(text, " typed");
    release();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled(),
    );
    expect(screen.getByDisplayValue("Question A typed")).toBeInTheDocument();
  });
});
