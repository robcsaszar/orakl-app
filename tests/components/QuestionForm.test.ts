import { render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QuestionForm from "$lib/components/questions/QuestionForm.svelte";
import type { QuestionFormQuestion } from "$lib/components/questions/question-form.js";
import { toast } from "../../src/lib/toast.js";

vi.mock("../../src/lib/toast.js", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(toast.info).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("scrolls the form into view smoothly when filled", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    render(QuestionForm, {
      props: { categories, question: multipleChoice, onsubmit: vi.fn() },
    });
    await screen.findByDisplayValue("Capital of France?");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("scrolls the form into view instantly under reduced motion", async () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    vi.stubGlobal("matchMedia", matchMedia);
    render(QuestionForm, {
      props: { categories, question: multipleChoice, onsubmit: vi.fn() },
    });
    await screen.findByDisplayValue("Capital of France?");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "instant",
      block: "start",
    });
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

  it("keeps another question's fields when an add finishes after the form switched to it", async () => {
    const user = userEvent.setup();
    let finish!: (ok: boolean) => void;
    const onsubmit = vi.fn(
      () =>
        new Promise<boolean>((r) => {
          finish = r;
        }),
    );
    const { rerender } = render(QuestionForm, {
      props: { categories, question: null, onsubmit },
    });
    await user.selectOptions(screen.getByLabelText("Category"), "cat-sci");
    await user.type(screen.getByLabelText("Question"), "Symbol for gold?");
    await user.type(screen.getByPlaceholderText("Answer 1"), "Au");
    await user.type(screen.getByPlaceholderText("Answer 2"), "Ag");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    await waitFor(() => expect(onsubmit).toHaveBeenCalledTimes(1));
    await rerender({ categories, question: multipleChoice, onsubmit });
    await screen.findByDisplayValue("Capital of France?");
    finish(true);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeEnabled(),
    );
    expect(screen.getByDisplayValue("Capital of France?")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Paris")).toBeInTheDocument();
  });

  it("keeps text typed during a pending add when it resolves ok", async () => {
    const user = userEvent.setup();
    let finish!: (ok: boolean) => void;
    const onsubmit = vi.fn(
      () =>
        new Promise<boolean>((r) => {
          finish = r;
        }),
    );
    render(QuestionForm, { props: { categories, question: null, onsubmit } });
    await user.selectOptions(screen.getByLabelText("Category"), "cat-sci");
    await user.type(screen.getByLabelText("Question"), "Symbol for gold?");
    await user.type(screen.getByPlaceholderText("Answer 1"), "Au");
    await user.type(screen.getByPlaceholderText("Answer 2"), "Ag");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    await waitFor(() => expect(onsubmit).toHaveBeenCalledTimes(1));
    await user.type(screen.getByLabelText("Question"), " Next");
    finish(true);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add question" }),
      ).toBeEnabled(),
    );
    expect(screen.getByLabelText("Question")).toHaveValue(
      "Symbol for gold? Next",
    );
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith(
      "Edits made while saving are still in the form.",
    );
  });

  it("resets the fields when an add resolves ok with no typing during the submit", async () => {
    const user = userEvent.setup();
    const onsubmit = vi.fn().mockResolvedValue(true);
    render(QuestionForm, { props: { categories, question: null, onsubmit } });
    await user.selectOptions(screen.getByLabelText("Category"), "cat-sci");
    await user.type(screen.getByLabelText("Question"), "Symbol for gold?");
    await user.type(screen.getByPlaceholderText("Answer 1"), "Au");
    await user.type(screen.getByPlaceholderText("Answer 2"), "Ag");
    await user.click(screen.getByRole("button", { name: "Add question" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Question")).toHaveValue(""),
    );
    expect(screen.getByPlaceholderText("Answer 1")).toHaveValue("");
    expect(toast.info).not.toHaveBeenCalled();
  });

  describe("during an image upload", () => {
    const sciTrueFalse: QuestionFormQuestion = {
      ...trueFalse,
      id: "q-3",
      category: "Science",
      difficulty: "hard",
      question: { text: "Water boils at 100 C." },
    };

    /** Holds the upload request open; resolve() completes it with a stored URL. */
    function holdUpload() {
      let resolve!: () => void;
      const gate = new Promise<void>((r) => {
        resolve = r;
      });
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          await gate;
          return { ok: true, json: async () => ({ url: "/media/up.png" }) };
        }),
      );
      return resolve;
    }

    /** Picks a file in upload mode and starts the submit; the upload stays pending. */
    async function startUpload(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Add an image" }));
      await user.click(screen.getByLabelText("Upload file"));
      await user.upload(
        document.getElementById("image-file") as HTMLInputElement,
        new File(["x"], "pic.png", { type: "image/png" }),
      );
      await screen.findByText("pic.png ready to upload.");
      await user.click(
        screen.getByRole("button", { name: /Save changes|Add question/ }),
      );
    }

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => "blob:pic");
      URL.revokeObjectURL = vi.fn();
      vi.stubGlobal(
        "Image",
        class {
          naturalWidth = 200;
          naturalHeight = 200;
          onload: (() => void) | null = null;
          onerror: (() => void) | null = null;
          set src(_: string) {
            queueMicrotask(() => this.onload?.());
          }
        },
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("does not submit when the question changes mid-upload", async () => {
      const user = userEvent.setup();
      const onsubmit = vi.fn().mockResolvedValue(true);
      const release = holdUpload();
      const { rerender } = render(QuestionForm, {
        props: { categories, question: multipleChoice, onsubmit },
      });
      await screen.findByDisplayValue("Capital of France?");
      await startUpload(user);
      await rerender({ categories, question: sciTrueFalse, onsubmit });
      await screen.findByDisplayValue("Water boils at 100 C.");
      release();
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Save changes" }),
        ).toBeEnabled(),
      );
      expect(onsubmit).not.toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledWith(
        "Not saved: the form changed before the upload finished.",
      );
      expect(
        screen.getByDisplayValue("Water boils at 100 C."),
      ).toBeInTheDocument();
    });

    it("disables Cancel while the upload runs", async () => {
      const user = userEvent.setup();
      const release = holdUpload();
      render(QuestionForm, {
        props: {
          categories,
          question: multipleChoice,
          onsubmit: vi.fn().mockResolvedValue(true),
          oncancel: vi.fn(),
        },
      });
      await screen.findByDisplayValue("Capital of France?");
      await startUpload(user);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
      release();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled(),
      );
    });

    it("submits the original text, category and difficulty when the question is unchanged", async () => {
      const user = userEvent.setup();
      const onsubmit = vi.fn().mockResolvedValue(true);
      const release = holdUpload();
      render(QuestionForm, {
        props: { categories, question: multipleChoice, onsubmit },
      });
      await screen.findByDisplayValue("Capital of France?");
      await startUpload(user);
      release();
      await waitFor(() => expect(onsubmit).toHaveBeenCalledTimes(1));
      expect(onsubmit).toHaveBeenCalledWith({
        questionType: "standard",
        categoryId: "cat-geo",
        questionText: "Capital of France?",
        answers: [
          { text: "Paris", isCorrect: true },
          { text: "Rome", isCorrect: false },
          { text: "Berlin", isCorrect: false },
          { text: "Madrid", isCorrect: false },
        ],
        imageUrl: "/media/up.png",
        difficulty: "medium",
      });
    });

    it("submits the values from the moment of submit when fields change mid-upload", async () => {
      const user = userEvent.setup();
      const onsubmit = vi.fn().mockResolvedValue(true);
      const release = holdUpload();
      render(QuestionForm, {
        props: { categories, question: multipleChoice, onsubmit },
      });
      await screen.findByDisplayValue("Capital of France?");
      await startUpload(user);
      const text = screen.getByDisplayValue("Capital of France?");
      await user.clear(text);
      await user.type(text, "Edited during upload");
      await user.selectOptions(screen.getByLabelText("Category"), "cat-sci");
      await user.click(
        document.getElementById("difficulty-hard") as HTMLElement,
      );
      release();
      await waitFor(() => expect(onsubmit).toHaveBeenCalledTimes(1));
      expect(onsubmit).toHaveBeenCalledWith({
        questionType: "standard",
        categoryId: "cat-geo",
        questionText: "Capital of France?",
        answers: [
          { text: "Paris", isCorrect: true },
          { text: "Rome", isCorrect: false },
          { text: "Berlin", isCorrect: false },
          { text: "Madrid", isCorrect: false },
        ],
        imageUrl: "/media/up.png",
        difficulty: "medium",
      });
    });

    it("still submits in add mode after an upload", async () => {
      const user = userEvent.setup();
      const onsubmit = vi.fn().mockResolvedValue(true);
      const release = holdUpload();
      render(QuestionForm, { props: { categories, question: null, onsubmit } });
      await user.selectOptions(screen.getByLabelText("Category"), "cat-sci");
      await user.type(screen.getByLabelText("Question"), "Symbol for gold?");
      await user.type(screen.getByPlaceholderText("Answer 1"), "Au");
      await user.type(screen.getByPlaceholderText("Answer 2"), "Ag");
      await startUpload(user);
      release();
      await waitFor(() => expect(onsubmit).toHaveBeenCalledTimes(1));
      expect(onsubmit).toHaveBeenCalledWith({
        questionType: "standard",
        categoryId: "cat-sci",
        questionText: "Symbol for gold?",
        answers: [
          { text: "Au", isCorrect: true },
          { text: "Ag", isCorrect: false },
        ],
        imageUrl: "/media/up.png",
        difficulty: "easy",
      });
    });
  });
});
