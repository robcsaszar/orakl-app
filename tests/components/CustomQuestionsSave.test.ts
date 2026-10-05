import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../../src/lib/toast.js";
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
  let saved = false;
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      await gate;
      saved = true;
      return new Response("{}", { status: 200 });
    }
    const id = url.split("/").pop() as string;
    const textA = saved ? "Question A saved" : "Question A";
    return new Response(
      JSON.stringify(detail(id, id === "q-a" ? textA : "Question B")),
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
    const gets = () =>
      fetchMock.mock.calls.filter(
        ([url, init]) => url === "/api/custom-questions/q-a" && !init,
      );
    expect(gets()).toHaveLength(1);
    release();
    await waitFor(() => expect(gets()).toHaveLength(2));
    const text = await screen.findByDisplayValue("Question A saved");
    expect(text).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("keeps a question opened later when an Edit waiting on a save resumes", async () => {
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
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByDisplayValue("Question B typed")).toBeInTheDocument();
  });

  it("shows the row's Edit button loading while its Edit waits on a save", async () => {
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
    const [editA, editB] = screen.getAllByRole("button", {
      name: "Edit question",
    });
    await user.click(editA);
    expect(editA).toHaveTextContent("Loading...");
    expect(editA).toBeDisabled();
    expect(editB).toHaveTextContent("Edit");
    release();
    await screen.findByDisplayValue("Question A saved");
    await waitFor(() => expect(editA).toHaveTextContent(/^Edit$/));
    expect(editA).toBeEnabled();
  });

  it("drops an Edit load that Cancel superseded", async () => {
    const user = userEvent.setup();
    let releaseA!: () => void;
    const heldA = new Promise<void>((r) => {
      releaseA = r;
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/custom-questions/q-a") await heldA;
      const id = url.split("/").pop() as string;
      return new Response(JSON.stringify(detail(id, `Question ${id}`)), {
        status: 200,
      });
    });
    renderPage();
    const [editA, editB] = screen.getAllByRole("button", {
      name: "Edit question",
    });
    await user.click(editB);
    await screen.findByDisplayValue("Question q-b");
    await user.click(editA);
    expect(editA).toHaveTextContent("Loading...");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(editA).toHaveTextContent(/^Edit$/));
    releaseA();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByDisplayValue("Question q-a")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Add question" }),
    ).toBeInTheDocument();
  });

  it("shows no error for a load that a later Edit click superseded", async () => {
    const user = userEvent.setup();
    let failA!: () => void;
    const heldA = new Promise<void>((r) => {
      failA = r;
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/custom-questions/q-a") {
        await heldA;
        return new Response(JSON.stringify({ error: "boom" }), { status: 500 });
      }
      return new Response(JSON.stringify(detail("q-b", "Question B")), {
        status: 200,
      });
    });
    renderPage();
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[1],
    );
    await screen.findByDisplayValue("Question B");
    failA();
    await new Promise((r) => setTimeout(r, 50));
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Question B")).toBeInTheDocument();
  });

  it("hands the loading state to a later Edit click", async () => {
    const user = userEvent.setup();
    let releaseA!: () => void;
    const heldA = new Promise<void>((r) => {
      releaseA = r;
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/custom-questions/q-a") await heldA;
      const id = url.split("/").pop() as string;
      return new Response(
        JSON.stringify(detail(id, id === "q-a" ? "Question A" : "Question B")),
        { status: 200 },
      );
    });
    renderPage();
    const edit = () => screen.getAllByRole("button", { name: "Edit question" });
    await user.click(edit()[0]);
    expect(edit()[0]).toHaveTextContent("Loading");
    await user.click(edit()[1]);
    await screen.findByDisplayValue("Question B");
    expect(edit()[0]).toHaveTextContent("Edit");
    expect(edit()[1]).toHaveTextContent("Edit");
    expect(edit()[1]).toBeEnabled();
    releaseA();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByDisplayValue("Question B")).toBeInTheDocument();
    expect(edit()[0]).toHaveTextContent("Edit");
  });

  it("clears the loading state when the Edit load fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
    );
    renderPage();
    const edit = () => screen.getAllByRole("button", { name: "Edit question" });
    await user.click(edit()[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"));
    expect(edit()[0]).toHaveTextContent("Edit");
    expect(edit()[0]).toBeEnabled();
  });
});
