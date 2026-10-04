import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuestionForm from "$lib/components/questions/QuestionForm.svelte";
import type { QuestionFormQuestion } from "$lib/components/questions/question-form.js";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const categories = [
  { id: "cat-geo", name: "Geography", count: 3 },
  { id: "cat-sci", name: "Science", count: 5 },
];

const multipleChoice: QuestionFormQuestion = {
  id: "q-1",
  category: "Geography",
  difficulty: "medium",
  type: "text_choice",
  question: { text: "Capital of France?" },
  correctAnswer: "Paris",
  incorrectAnswers: ["Rome", "Berlin", "Madrid"],
};

const trueFalse: QuestionFormQuestion = {
  id: "q-2",
  category: "Geography",
  difficulty: "easy",
  type: "true_false",
  question: { text: "Paris is in France." },
  correctAnswer: "true",
  incorrectAnswers: ["false"],
};

describe("QuestionForm", () => {
  it("renders the editing heading in edit mode by default", async () => {
    render(QuestionForm, {
      props: { categories, question: multipleChoice, onsubmit: vi.fn() },
    });
    expect(
      await screen.findByRole("heading", { name: "Editing question" }),
    ).toBeInTheDocument();
  });

  it("omits the editing heading when showHeading is false", async () => {
    render(QuestionForm, {
      props: {
        categories,
        question: multipleChoice,
        onsubmit: vi.fn(),
        showHeading: false,
      },
    });
    await screen.findByDisplayValue("Capital of France?");
    expect(screen.queryByText("Editing question")).toBeNull();
  });

  it("shows an existing multiple-choice question in edit mode", async () => {
    render(QuestionForm, {
      props: { categories, question: multipleChoice, onsubmit: vi.fn() },
    });
    expect(
      await screen.findByDisplayValue("Capital of France?"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Paris")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rome")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Berlin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Madrid")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("submits the edited text with the existing answers", async () => {
    const user = userEvent.setup();
    const onsubmit = vi.fn().mockResolvedValue(true);
    render(QuestionForm, {
      props: { categories, question: multipleChoice, onsubmit },
    });
    const text = await screen.findByDisplayValue("Capital of France?");
    await user.clear(text);
    await user.type(text, "Capital city of France?");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onsubmit).toHaveBeenCalledTimes(1);
    expect(onsubmit).toHaveBeenCalledWith({
      questionType: "standard",
      categoryId: "cat-geo",
      questionText: "Capital city of France?",
      answers: [
        { text: "Paris", isCorrect: true },
        { text: "Rome", isCorrect: false },
        { text: "Berlin", isCorrect: false },
        { text: "Madrid", isCorrect: false },
      ],
      difficulty: "medium",
    });
  });

  it("submits a true/false question with the edited correct answer", async () => {
    const user = userEvent.setup();
    const onsubmit = vi.fn().mockResolvedValue(true);
    render(QuestionForm, {
      props: { categories, question: trueFalse, onsubmit },
    });
    await screen.findByDisplayValue("Paris is in France.");
    await user.click(
      document.getElementById("trueFalseAnswer-false") as HTMLElement,
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onsubmit).toHaveBeenCalledTimes(1);
    expect(onsubmit).toHaveBeenCalledWith({
      questionType: "true_false",
      categoryId: "cat-geo",
      questionText: "Paris is in France.",
      correctAnswer: "false",
      difficulty: "easy",
    });
  });

  it("does not submit a blank question in add mode", async () => {
    const user = userEvent.setup();
    const onsubmit = vi.fn().mockResolvedValue(true);
    render(QuestionForm, { props: { categories, question: null, onsubmit } });
    await user.selectOptions(screen.getByLabelText("Category"), "cat-geo");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(onsubmit).not.toHaveBeenCalled();
  });

  it("calls oncancel from the cancel button in edit mode", async () => {
    const user = userEvent.setup();
    const oncancel = vi.fn();
    render(QuestionForm, {
      props: {
        categories,
        question: multipleChoice,
        onsubmit: vi.fn(),
        oncancel,
      },
    });
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(oncancel).toHaveBeenCalledTimes(1);
  });

  it("shows no Cancel in edit mode when the caller gives no oncancel", async () => {
    render(QuestionForm, {
      props: { categories, question: multipleChoice, onsubmit: vi.fn() },
    });
    await screen.findByDisplayValue("Capital of France?");
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("refills when the question changes and returns to add mode on null", async () => {
    const { rerender } = render(QuestionForm, {
      props: { categories, question: multipleChoice, onsubmit: vi.fn() },
    });
    await screen.findByDisplayValue("Capital of France?");
    await rerender({ categories, question: trueFalse, onsubmit: vi.fn() });
    expect(
      await screen.findByDisplayValue("Paris is in France."),
    ).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Capital of France?")).toBeNull();
    await rerender({ categories, question: null, onsubmit: vi.fn() });
    expect(
      await screen.findByRole("button", { name: "Add question" }),
    ).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Paris is in France.")).toBeNull();
  });
});
