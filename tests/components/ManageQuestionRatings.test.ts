import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../../src/lib/toast.js";
import RatingsPage from "../../src/routes/(app)/manage/question-ratings/+page.svelte";
import ManageQuestionRatings from "../../src/routes/(app)/manage/question-ratings/ManageQuestionRatings.svelte";

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
    down: 7,
    up: 3,
    downAllTime: 11,
    upAllTime: 5,
    edited: true,
    openFlags: 4,
  },
  {
    id: "q-2",
    excerpt: "Who wrote the Aeneid?",
    source: "promoted" as const,
    category: "History",
    down: 2,
    up: 9,
    downAllTime: 2,
    upAllTime: 9,
    edited: false,
    openFlags: 0,
  },
];

function renderList(initialHasMore = true) {
  return render(ManageQuestionRatings, {
    props: { initial: ROWS, initialHasMore, initialPage: 1 },
  });
}

async function settle() {
  await new Promise((r) => setTimeout(r, 0));
}

describe("ManageQuestionRatings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders rows in the given order with excerpt and source line", async () => {
    renderList();
    await settle();
    const first = screen.getByText("Which Norse god forged Mjolnir?");
    const second = screen.getByText("Who wrote the Aeneid?");
    expect(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByText("Built-in · Science").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Promoted · History").length).toBeGreaterThan(0);
  });

  it("shows the counts and open flags", async () => {
    renderList();
    await settle();
    const cells = screen
      .getAllByRole("gridcell")
      .map((c) => c.textContent?.replace(/\s+/g, " ").trim());
    expect(cells).toContain("7 11 all time");
    expect(cells).toContain("3 5 all time");
    expect(cells).toContain("2");
    expect(cells).toContain("9");
    expect(cells).toContain("4");
    expect(cells).toContain("0");
  });

  it("shows the all time line only for an edited row", async () => {
    renderList();
    await settle();
    expect(screen.getAllByText(/all time/)).toHaveLength(2);
    expect(screen.queryByText("2 all time")).toBeNull();
    expect(screen.queryByText("9 all time")).toBeNull();
  });

  it("labels the rating columns with string headers", async () => {
    renderList();
    await settle();
    expect(
      screen.getByRole("columnheader", { name: "Bad question" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Good question" }),
    ).toBeInTheDocument();
  });

  it("shows the page title", async () => {
    renderList();
    await settle();
    expect(
      screen.getByRole("heading", { level: 1, name: "Question ratings" }),
    ).toBeInTheDocument();
  });

  it("toasts a fixed message when a page load fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    );
    const user = userEvent.setup();
    renderList(true);
    await settle();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load question ratings.",
      ),
    );
    vi.clearAllMocks();
  });

  it("shows Page 1 and Next while more pages exist", async () => {
    renderList(true);
    await settle();
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();
    const next = screen.getByRole("button", {
      name: "Next",
    }) as HTMLButtonElement;
    expect(next.disabled).toBe(false);
  });

  it("disables Next on the last page", async () => {
    renderList(false);
    await settle();
    const next = screen.getByRole("button", {
      name: "Next",
    }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
  });

  it("renders no rater identity", async () => {
    const { container } = renderList();
    await settle();
    expect(container.textContent).not.toContain("@");
  });

  it("shows the empty state", async () => {
    render(ManageQuestionRatings, {
      props: { initial: [], initialHasMore: false, initialPage: 1 },
    });
    await settle();
    expect(screen.getByText("No ratings yet.")).toBeInTheDocument();
  });
});

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

function mockFetch(
  patch: { ok: boolean; body: unknown } = { ok: true, body: { ok: true } },
) {
  const fn = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      return {
        ok: patch.ok,
        status: patch.ok ? 200 : 400,
        json: async () => patch.body,
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ question: STORED, categories: CATEGORIES }),
    };
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("ManageQuestionRatings edit", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderEditable(canPublish: boolean) {
    return render(ManageQuestionRatings, {
      props: {
        initial: ROWS,
        initialHasMore: false,
        initialPage: 1,
        canPublish,
      },
    });
  }

  it("shows Edit question per row only with canPublish", async () => {
    const { unmount } = renderEditable(false);
    await settle();
    expect(screen.queryByRole("button", { name: "Edit question" })).toBeNull();
    unmount();
    renderEditable(true);
    await settle();
    expect(
      screen.getAllByRole("button", { name: "Edit question" }),
    ).toHaveLength(2);
  });

  it("loads the question and opens the form in a dialog", async () => {
    const fetchMock = mockFetch();
    const user = userEvent.setup();
    renderEditable(true);
    await settle();
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    expect(
      await screen.findByDisplayValue("Which Norse god forged Mjolnir?"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/manage/question-ratings/q-1");
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("keeps the dialog open and the counts unchanged when the save fails", async () => {
    mockFetch({ ok: false, body: { error: "Not allowed" } });
    const user = userEvent.setup();
    renderEditable(true);
    await settle();
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    const text = await screen.findByDisplayValue(
      "Which Norse god forged Mjolnir?",
    );
    await user.clear(text);
    await user.type(text, "Who forged Mjolnir?");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Not allowed"),
    );
    expect(screen.getByDisplayValue("Who forged Mjolnir?")).toBeInTheDocument();
    const cells = screen
      .getAllByRole("gridcell")
      .map((c) => c.textContent?.replace(/\s+/g, " ").trim());
    expect(cells).toContain("7 11 all time");
    expect(cells).toContain("3 5 all time");
  });

  it("saves via PATCH and zeroes the row's since-edit counts", async () => {
    const fetchMock = mockFetch();
    const user = userEvent.setup();
    renderEditable(true);
    await settle();
    await user.click(
      screen.getAllByRole("button", { name: "Edit question" })[0],
    );
    const text = await screen.findByDisplayValue(
      "Which Norse god forged Mjolnir?",
    );
    await user.clear(text);
    await user.type(text, "Who forged Mjolnir?");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await vi.waitFor(() =>
      expect(screen.getByText("Who forged Mjolnir?")).toBeInTheDocument(),
    );
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patch?.[0]).toBe("/api/manage/question-ratings/q-1");
    const body = JSON.parse(String(patch?.[1]?.body));
    expect(body.questionText).toBe("Who forged Mjolnir?");
    expect(body.categoryId).toBe("cat-sci");
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
    const cells = screen
      .getAllByRole("gridcell")
      .map((c) => c.textContent?.replace(/\s+/g, " ").trim());
    expect(cells).toContain("0 11 all time");
    expect(cells).toContain("0 5 all time");
    expect(cells).not.toContain("7 11 all time");
  });
});

describe("ManageQuestionRatings delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function renderDeletable(canPublish: boolean) {
    return render(ManageQuestionRatings, {
      props: {
        initial: ROWS,
        initialHasMore: false,
        initialPage: 1,
        canPublish,
      },
    });
  }

  function mockDelete(ok: boolean, body: unknown = { ok: true }) {
    const fn = vi.fn(async () => ({
      ok,
      status: ok ? 200 : 500,
      json: async () => body,
    }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("shows Delete question per row only with canPublish", async () => {
    const { unmount } = renderDeletable(false);
    await settle();
    expect(
      screen.queryByRole("button", { name: "Delete question" }),
    ).toBeNull();
    unmount();
    renderDeletable(true);
    await settle();
    expect(
      screen.getAllByRole("button", { name: "Delete question" }),
    ).toHaveLength(2);
  });

  const REMAINING = ROWS.slice(1);

  /** DELETE answers `deleteResult`; GET list pages answer from `pages`. */
  function mockDeleteAndList(
    pages: Record<string, { rows: typeof ROWS; hasMore: boolean }>,
    deleteResult: Promise<unknown> | null = null,
  ) {
    const fn = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return (
          (await deleteResult) ?? {
            ok: true,
            status: 200,
            json: async () => ({ ok: true }),
          }
        );
      }
      const page = new URL(url, "http://x").searchParams.get("page") ?? "1";
      return { ok: true, status: 200, json: async () => pages[page] };
    });
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  async function confirmDelete(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      screen.getAllByRole("button", { name: "Delete question" })[0],
    );
    await user.click(
      screen.getByRole("button", {
        name: "Click again to delete this question",
      }),
    );
  }

  it("asks twice, then DELETEs the question and reloads the current page", async () => {
    const fetchMock = mockDeleteAndList({
      "1": { rows: REMAINING, hasMore: false },
    });
    const user = userEvent.setup();
    renderDeletable(true);
    await settle();
    await user.click(
      screen.getAllByRole("button", { name: "Delete question" })[0],
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Delete question?")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Click again to delete this question",
      }),
    );
    await vi.waitFor(() =>
      expect(screen.queryByText("Which Norse god forged Mjolnir?")).toBeNull(),
    );
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/manage/question-ratings/q-1");
    expect(init.method).toBe("DELETE");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/manage/question-ratings?page=1",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Who wrote the Aeneid?")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("Question deleted.");
  });

  it("loads the previous page when the delete empties the current one", async () => {
    const fetchMock = mockDeleteAndList({
      "2": { rows: [], hasMore: false },
      "1": { rows: REMAINING, hasMore: true },
    });
    const user = userEvent.setup();
    render(ManageQuestionRatings, {
      props: {
        initial: ROWS.slice(0, 1),
        initialHasMore: false,
        initialPage: 2,
        canPublish: true,
      },
    });
    await settle();
    await confirmDelete(user);
    await vi.waitFor(() =>
      expect(screen.getByText("Who wrote the Aeneid?")).toBeInTheDocument(),
    );
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls).toEqual([
      "/api/manage/question-ratings/q-1",
      "/api/manage/question-ratings?page=2",
      "/api/manage/question-ratings?page=1",
    ]);
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();
  });

  it("reloads the page the user is heading to when a pending delete resolves mid-Next", async () => {
    let releaseDelete: (v: unknown) => void = () => {};
    const deleteDone = new Promise((res) => {
      releaseDelete = res;
    });
    let releaseNext: () => void = () => {};
    const nextGate = new Promise<void>((res) => {
      releaseNext = res;
    });
    const pageTwo = {
      rows: [{ ...ROWS[0], id: "q-3", excerpt: "Page two question?" }],
      hasMore: false,
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return deleteDone;
      const page = new URL(url, "http://x").searchParams.get("page");
      if (page === "2") {
        if (fetchMock.mock.calls.filter((c) => c[0] === url).length === 1) {
          await nextGate;
        }
        return { ok: true, status: 200, json: async () => pageTwo };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ rows: REMAINING, hasMore: true }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(ManageQuestionRatings, {
      props: {
        initial: ROWS,
        initialHasMore: true,
        initialPage: 1,
        canPublish: true,
      },
    });
    await settle();
    await confirmDelete(user);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    releaseDelete({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    releaseNext();
    await vi.waitFor(() =>
      expect(screen.getByText("Page two question?")).toBeInTheDocument(),
    );
    await settle();
    expect(screen.getByText(/Page 2/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/manage/question-ratings/q-1",
      "/api/manage/question-ratings?page=2",
      "/api/manage/question-ratings?page=2",
    ]);
  });

  it("reloads the shown page when a delete follows a failed Next", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      if (url.endsWith("page=2")) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ rows: REMAINING, hasMore: true }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(ManageQuestionRatings, {
      props: {
        initial: ROWS,
        initialHasMore: true,
        initialPage: 1,
        canPublish: true,
      },
    });
    await settle();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load question ratings.",
      ),
    );
    await confirmDelete(user);
    await vi.waitFor(() =>
      expect(screen.queryByText("Which Norse god forged Mjolnir?")).toBeNull(),
    );
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      "/api/manage/question-ratings?page=2",
      "/api/manage/question-ratings/q-1",
      "/api/manage/question-ratings?page=1",
    ]);
  });

  it("sends no second DELETE while the first is pending", async () => {
    let release: (v: unknown) => void = () => {};
    const pending = new Promise((res) => {
      release = res;
    });
    const fetchMock = mockDeleteAndList(
      { "1": { rows: REMAINING, hasMore: false } },
      pending,
    );
    const user = userEvent.setup();
    renderDeletable(true);
    await settle();
    await confirmDelete(user);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const again = screen.queryByRole("button", {
      name: "Click again to delete this question",
    });
    if (!again) {
      await user.click(
        screen.getAllByRole("button", { name: "Delete question" })[0],
      );
    }
    await user.click(
      screen.getByRole("button", {
        name: "Click again to delete this question",
      }),
    );
    expect(
      fetchMock.mock.calls.filter((c) => c[1]?.method === "DELETE"),
    ).toHaveLength(1);
    release({ ok: true, status: 200, json: async () => ({ ok: true }) });
    await vi.waitFor(() =>
      expect(screen.queryByText("Which Norse god forged Mjolnir?")).toBeNull(),
    );
  });

  it("guards every pending delete, not only the latest", async () => {
    const pending = new Promise(() => {});
    const fetchMock = mockDeleteAndList(
      { "1": { rows: REMAINING, hasMore: false } },
      pending,
    );
    const user = userEvent.setup();
    renderDeletable(true);
    await settle();
    const arm = async (index: number) => {
      await user.click(
        screen.getAllByRole("button", { name: "Delete question" })[index],
      );
      await user.click(
        screen.getByRole("button", {
          name: "Click again to delete this question",
        }),
      );
    };
    await arm(0); // A, left pending
    await arm(1); // B, left pending
    await arm(0); // A again while both are in flight
    const deletes = fetchMock.mock.calls.filter(
      (c) => c[1]?.method === "DELETE",
    );
    expect(deletes.map((c) => c[0])).toEqual([
      `/api/manage/question-ratings/${ROWS[0].id}`,
      `/api/manage/question-ratings/${ROWS[1].id}`,
    ]);
  });

  it("keeps the row and toasts the server error when the DELETE fails", async () => {
    mockDelete(false, { error: "Not allowed" });
    const user = userEvent.setup();
    renderDeletable(true);
    await settle();
    await user.click(
      screen.getAllByRole("button", { name: "Delete question" })[0],
    );
    await user.click(
      screen.getByRole("button", {
        name: "Click again to delete this question",
      }),
    );
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Not allowed"),
    );
    expect(
      screen.getByText("Which Norse god forged Mjolnir?"),
    ).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("/manage/question-ratings page", () => {
  it("renders the list from page data", async () => {
    render(RatingsPage, {
      props: {
        data: { initial: ROWS, initialHasMore: false, page: 1 },
      } as never,
    });
    await settle();
    expect(
      screen.getByText("Which Norse god forged Mjolnir?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();
  });
});
