import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { goto } from "$app/navigation";
import ManageBank from "../../src/routes/(app)/manage/bank/ManageBank.svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
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
    id: "q-1",
    excerpt: "Which Norse god forged Mjolnir?",
    source: "built-in" as const,
    category: "Science",
    type: "text_choice",
    difficulty: "medium" as const,
    edited: false,
  },
  {
    id: "q-2",
    excerpt: "Order these emperors",
    source: "promoted" as const,
    category: "History",
    type: "sequence_order",
    difficulty: null,
    edited: true,
  },
];

const STORED = {
  id: "q-1",
  category: "Science",
  difficulty: "medium",
  type: "text_choice",
  question: { text: "Which Norse god forged Mjolnir?" },
  correctAnswer: "Sindri",
  incorrectAnswers: ["Odin", "Thor", "Loki"],
};
const CATEGORIES = [
  { id: "cat-sci", name: "Science", count: 5 },
  { id: "cat-his", name: "History", count: 3 },
];

function renderBank(props: Partial<{ q: string; category: string }> = {}) {
  return render(ManageBank, {
    props: {
      initial: ROWS,
      initialHasMore: false,
      page: 1,
      q: "",
      category: "",
      categories: ["History", "Science"],
      ...props,
    },
  });
}

function mockFetch() {
  const fn = vi.fn(async (_url: string, init?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () =>
      init?.method === "PATCH"
        ? { ok: true }
        : { question: STORED, categories: CATEGORIES, tags: [] },
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

async function settle() {
  await new Promise((r) => setTimeout(r, 0));
}

describe("ManageBank", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(goto).mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists each question with its category, type, difficulty and source", async () => {
    renderBank();
    await settle();
    expect(
      screen.getAllByText("Science · Multiple choice · medium · Built-in")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("History · Sequence order · Promoted · Edited")
        .length,
    ).toBeGreaterThan(0);
  });

  it("offers Edit only for types the form can rewrite", async () => {
    renderBank();
    await settle();
    expect(
      screen.getAllByRole("button", { name: "Edit question" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Not editable here").length).toBeGreaterThan(0);
  });

  it("loads the question from the bank API and saves via PATCH", async () => {
    const fetchMock = mockFetch();
    const user = userEvent.setup();
    renderBank();
    await settle();

    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    const text = await screen.findByDisplayValue(
      "Which Norse god forged Mjolnir?",
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/manage/bank/q-1");

    await user.clear(text);
    await user.type(text, "Who forged Mjolnir?");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() =>
      expect(screen.getAllByText("Who forged Mjolnir?").length).toBeGreaterThan(
        0,
      ),
    );
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patch?.[0]).toBe("/api/manage/bank/q-1");
    expect(JSON.parse(String(patch?.[1]?.body)).questionText).toBe(
      "Who forged Mjolnir?",
    );
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("puts the category filter in the URL and returns to page 1", async () => {
    const user = userEvent.setup();
    renderBank();
    await settle();
    await user.selectOptions(screen.getByLabelText("Category"), "History");
    expect(goto).toHaveBeenCalledWith("?category=History", {
      keepFocus: true,
      noScroll: true,
    });
  });

  it("searches on Enter and keeps the category", async () => {
    const user = userEvent.setup();
    renderBank({ category: "Science" });
    await settle();
    await user.type(screen.getByLabelText("Search"), "Mjolnir{Enter}");
    expect(goto).toHaveBeenCalledWith("?q=Mjolnir&category=Science", {
      keepFocus: true,
      noScroll: true,
    });
  });

  it("shows Clear only with a filter, and Clear drops both", async () => {
    const user = userEvent.setup();
    const { unmount } = renderBank();
    await settle();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    unmount();

    renderBank({ q: "thor", category: "Science" });
    await settle();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(goto).toHaveBeenCalledWith("?", { keepFocus: true, noScroll: true });
  });
});
