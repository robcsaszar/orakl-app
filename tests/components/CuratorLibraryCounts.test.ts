import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Icon from "$lib/components/ui/Icon.svelte";
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

function renderIcon(name: string): SVGElement {
  const { container } = render(Icon, { props: { name } });
  return container.querySelector("svg") as SVGElement;
}

const categories = [{ id: "cat-geo", name: "Geography", count: 3 }];

const stored = {
  id: "q-1",
  category: "Geography",
  difficulty: "medium",
  type: "text_choice",
  question: { text: "Capital of France?" },
  correctAnswer: "Paris",
  incorrectAnswers: ["Rome", "Berlin", "Madrid"],
};

function row(extra: Record<string, unknown> = {}) {
  return {
    id: "q-1",
    category: "Geography",
    label: "Capital of France?",
    created_at: "2026-03-05 10:00:00",
    ...extra,
  };
}

describe("curator library rating counts", () => {
  it("shows since-edit pills with all-time totals in the tooltips", () => {
    render(CustomQuestionsPage, {
      props: {
        categories,
        ownQuestions: [
          row({ ratings: { up: 3, down: 1, upAllTime: 7, downAllTime: 4 } }),
        ],
      },
    });
    const up = screen
      .getByText("3 good since last edit, 7 all time")
      .closest("[data-tooltip]");
    const down = screen
      .getByText("1 bad since last edit, 4 all time")
      .closest("[data-tooltip]");
    expect(up).toHaveAttribute("data-tooltip", "7 all time");
    expect(down).toHaveAttribute("data-tooltip", "4 all time");
    // A screen reader hears both numbers, not only the all-time total.
    expect(up).not.toHaveAttribute("aria-label");
    expect(up).toHaveTextContent("3 good since last edit, 7 all time");
    expect(down).toHaveTextContent("1 bad since last edit, 4 all time");
  });

  it("makes each pill focusable with a focus ring and an all-time tooltip", () => {
    render(CustomQuestionsPage, {
      props: {
        categories,
        ownQuestions: [
          row({ ratings: { up: 3, down: 1, upAllTime: 7, downAllTime: 4 } }),
        ],
      },
    });
    const pills = [
      screen.getByText("3 good since last edit, 7 all time"),
      screen.getByText("1 bad since last edit, 4 all time"),
    ].map((el) => el.closest("[data-tooltip]") as HTMLElement);
    expect(pills.map((p) => p.getAttribute("data-tooltip"))).toEqual([
      "7 all time",
      "4 all time",
    ]);
    for (const pill of pills) {
      expect(pill).toHaveAttribute("tabindex", "0");
      for (const cls of [
        "focus-visible:outline-hidden",
        "focus-visible:ring-2",
        "focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background",
        "focus-visible:ring-secondary",
      ]) {
        expect(pill).toHaveClass(cls);
      }
      pill.focus();
      expect(pill).toHaveFocus();
    }
  });

  it("shows no pills without ratings", () => {
    render(CustomQuestionsPage, {
      props: { categories, ownQuestions: [row()] },
    });
    expect(screen.queryByText(/good since last edit/)).toBeNull();
    expect(screen.queryByText(/bad since last edit/)).toBeNull();
  });

  it("renders status pills with thumb icons in a wrapping cluster", () => {
    render(CustomQuestionsPage, {
      props: {
        categories,
        ownQuestions: [
          row({ ratings: { up: 3, down: 1, upAllTime: 7, downAllTime: 4 } }),
        ],
      },
    });
    const up = screen
      .getByText("3 good since last edit, 7 all time")
      .closest("[data-tooltip]") as HTMLElement;
    const down = screen
      .getByText("1 bad since last edit, 4 all time")
      .closest("[data-tooltip]") as HTMLElement;
    for (const pill of [up, down]) {
      expect(pill).toHaveClass("rounded-lg");
      const svg = pill.querySelector("svg");
      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
    expect(up.querySelector("svg")?.innerHTML).toBe(
      renderIcon("thumb-up").innerHTML,
    );
    expect(down.querySelector("svg")?.innerHTML).toBe(
      renderIcon("thumb-down").innerHTML,
    );
    expect(up.querySelector('[aria-hidden="true"]:not(svg)')).toHaveTextContent(
      "3",
    );
    expect(up.parentElement).toHaveClass("flex-wrap");
  });

  it("zeroes the since-edit counts after a saved edit, keeping all-time", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") return new Response("{}", { status: 200 });
      return new Response(JSON.stringify(stored), { status: 200 });
    });
    render(CustomQuestionsPage, {
      props: {
        categories,
        ownQuestions: [
          row({ ratings: { up: 3, down: 1, upAllTime: 7, downAllTime: 4 } }),
        ],
      },
    });
    await user.click(screen.getByRole("button", { name: "Edit question" }));
    await user.click(
      await screen.findByRole("button", { name: "Save changes" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText("0 good since last edit, 7 all time"),
      ).toBeInTheDocument(),
    );
    expect(
      screen
        .getByText("0 bad since last edit, 4 all time")
        .closest("[data-tooltip]"),
    ).toHaveAttribute("data-tooltip", "4 all time");
    expect(
      screen
        .getByText("0 good since last edit, 7 all time")
        .closest("[data-tooltip]"),
    ).toHaveAttribute("data-tooltip", "7 all time");
  });
});
