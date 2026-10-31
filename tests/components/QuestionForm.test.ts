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

const imageMatching: QuestionFormQuestion = {
  id: "q-4",
  category: "Geography",
  difficulty: "easy",
  type: "image_matching",
  question: {
    text: "Match the flags.",
    media: { type: "image", url: "https://cdn.test/questions/flags.jpg" },
  },
  correctAnswer: "A|1",
  incorrectAnswers: ["B|2", "C|3", "D|4"],
  matchItems: { left: ["A", "B", "C", "D"], right: ["1", "2", "3", "4"] },
  previewUrl: "/media/questions/flags.jpg?exp=1&sig=x",
};

describe("QuestionForm", () => {
  describe("image section is upload only", () => {
    it("offers no Image URL input in add mode for any question type", async () => {
      const user = userEvent.setup();
      render(QuestionForm, {
        props: { categories, question: null, onsubmit: vi.fn() },
      });
      await user.click(
        await screen.findByRole("button", { name: "Add an image" }),
      );
      expect(screen.queryByLabelText("Image URL")).toBeNull();
      expect(screen.queryByLabelText("Upload file")).toBeNull();
      expect(document.getElementById("image-file")).not.toBeNull();

      await user.click(screen.getByText("True/false"));
      expect(screen.queryByLabelText("Image URL")).toBeNull();

      await user.click(screen.getByText("Image matching"));
      expect(screen.queryByLabelText("Image URL")).toBeNull();
      expect(document.getElementById("image-file")).not.toBeNull();
    });

    it("keeps the stored image URL on edit when no new file is chosen", async () => {
      const user = userEvent.setup();
      const onsubmit = vi.fn().mockResolvedValue(true);
      render(QuestionForm, {
        props: { categories, question: imageMatching, onsubmit },
      });
      await screen.findByDisplayValue("Match the flags.");
      expect(screen.queryByLabelText("Image URL")).toBeNull();
      expect(
        screen.getByAltText("What players will see with this question"),
      ).toHaveAttribute("src", "/media/questions/flags.jpg?exp=1&sig=x");

      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(onsubmit).toHaveBeenCalledTimes(1);
      expect(onsubmit.mock.calls[0]?.[0]).toMatchObject({
        questionType: "image_matching",
        imageUrl: "https://cdn.test/questions/flags.jpg",
      });
    });

    it("requires an image for image matching once the stored one is removed", async () => {
      const user = userEvent.setup();
      const onsubmit = vi.fn().mockResolvedValue(true);
      render(QuestionForm, {
        props: { categories, question: imageMatching, onsubmit },
      });
      await screen.findByDisplayValue("Match the flags.");
      await user.click(screen.getByRole("button", { name: "Remove image" }));
      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(onsubmit).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Select an image.");
    });
  });

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

  describe("image credit and rights tick", () => {
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

    /** Fills a standard question, picks a file and a licence; leaves the tick to the test. */
    async function pickFileAndLicence(
      user: ReturnType<typeof userEvent.setup>,
      licence: string,
    ) {
      await user.selectOptions(
        await screen.findByLabelText("Category"),
        "cat-geo",
      );
      await user.type(
        await screen.findByLabelText("Question"),
        "What is on the painting?",
      );
      await user.type(screen.getByPlaceholderText("Answer 1"), "A dog");
      await user.type(screen.getByPlaceholderText("Answer 2"), "A cat");
      await user.click(screen.getByRole("button", { name: "Add an image" }));
      await user.upload(
        document.getElementById("image-file") as HTMLInputElement,
        new File(["x"], "pic.png", { type: "image/png" }),
      );
      await screen.findByText("pic.png ready to upload.");
      await user.selectOptions(
        screen.getByLabelText(/^Licence(?! link)/),
        licence,
      );
    }

    it("describes the licence, marks the rights tick and states the author limit", async () => {
      const user = userEvent.setup();
      render(QuestionForm, {
        props: {
          categories: [categories[0]],
          question: null,
          onsubmit: vi.fn(),
        },
      });
      await pickFileAndLicence(user, "cc-by");
      expect(
        screen.getByLabelText(/^Licence(?! link)/),
      ).toHaveAccessibleDescription(
        "Shown under the image. Sharing a question needs CC0, public domain, CC BY or CC BY-SA.",
      );
      expect(screen.getByLabelText(/I hold the rights/)).toBeRequired();
      expect(screen.getByLabelText(/^Author/)).toBeRequired();
      expect(screen.getByLabelText(/^Author/)).toHaveAccessibleDescription(
        "200 characters or fewer.",
      );
      await user.selectOptions(
        screen.getByLabelText(/^Licence(?! link)/),
        "cc0",
      );
      expect(screen.getByLabelText(/^Author/)).not.toBeRequired();
    });

    it("focuses the first errored credit field on submit", async () => {
      const user = userEvent.setup();
      render(QuestionForm, {
        props: {
          categories: [categories[0]],
          question: null,
          onsubmit: vi.fn(),
        },
      });
      await pickFileAndLicence(user, "cc-by");
      await user.click(screen.getByLabelText(/I hold the rights/));
      await user.click(screen.getByRole("button", { name: "Add question" }));
      expect(screen.getByLabelText(/^Author/)).toHaveFocus();

      await user.type(screen.getByLabelText(/^Author/), "Jane");
      await user.click(screen.getByLabelText(/I hold the rights/));
      await user.click(screen.getByRole("button", { name: "Add question" }));
      expect(screen.getByLabelText(/I hold the rights/)).toHaveFocus();
    });

    it("resets the rights tick on every new file", async () => {
      const user = userEvent.setup();
      render(QuestionForm, {
        props: {
          categories: [categories[0]],
          question: null,
          onsubmit: vi.fn(),
        },
      });
      await pickFileAndLicence(user, "cc0");
      await user.click(screen.getByLabelText(/I hold the rights/));
      expect(screen.getByLabelText(/I hold the rights/)).toBeChecked();
      await user.upload(
        document.getElementById("image-file") as HTMLInputElement,
        new File(["x"], "second.png", { type: "image/png" }),
      );
      await screen.findByText("second.png ready to upload.");
      expect(screen.getByLabelText(/I hold the rights/)).not.toBeChecked();
    });

    it("does not upload without the tick and shows an error", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const onsubmit = vi.fn().mockResolvedValue(true);
      render(QuestionForm, {
        props: { categories: [categories[0]], question: null, onsubmit },
      });
      await pickFileAndLicence(user, "cc0");
      await user.click(screen.getByRole("button", { name: "Add question" }));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(onsubmit).not.toHaveBeenCalled();
      expect(
        screen.getByText("Confirm you hold the rights to this image."),
      ).toBeInTheDocument();
    });

    it("refuses CC BY with no author before any upload", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      render(QuestionForm, {
        props: {
          categories: [categories[0]],
          question: null,
          onsubmit: vi.fn(),
        },
      });
      await pickFileAndLicence(user, "cc-by");
      await user.click(screen.getByLabelText(/I hold the rights/));
      await user.click(screen.getByRole("button", { name: "Add question" }));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        screen.getByText("Author is required for CC BY and CC BY-SA."),
      ).toBeInTheDocument();
    });

    it("refuses a non-https source link before any upload", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      render(QuestionForm, {
        props: {
          categories: [categories[0]],
          question: null,
          onsubmit: vi.fn(),
        },
      });
      await pickFileAndLicence(user, "cc0");
      await user.type(screen.getByLabelText("Source link"), "http://a.test/x");
      await user.click(screen.getByLabelText(/I hold the rights/));
      await user.click(screen.getByRole("button", { name: "Add question" }));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        screen.getByText("Source link must start with https://."),
      ).toBeInTheDocument();
    });

    it("sends rightsConfirmed with the file and puts imageCredit in the payload", async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ url: "https://cdn.test/questions/up.png" }),
      }));
      vi.stubGlobal("fetch", fetchMock);
      const onsubmit = vi.fn().mockResolvedValue(true);
      render(QuestionForm, {
        props: { categories: [categories[0]], question: null, onsubmit },
      });
      await pickFileAndLicence(user, "cc-by");
      await user.type(screen.getByLabelText(/^Author/), "Jane Doe");
      await user.type(
        screen.getByLabelText("Licence link"),
        "https://creativecommons.org/licenses/by/4.0/",
      );
      await user.click(screen.getByLabelText(/I hold the rights/));
      await user.click(screen.getByRole("button", { name: "Add question" }));

      await waitFor(() => expect(onsubmit).toHaveBeenCalledTimes(1));
      const [url, init] = fetchMock.mock.calls[0] as unknown as [
        string,
        { body: FormData },
      ];
      expect(url).toBe("/api/upload-image");
      expect(init.body.get("rightsConfirmed")).toBe("true");
      expect(onsubmit.mock.calls[0]?.[0]).toMatchObject({
        imageUrl: "https://cdn.test/questions/up.png",
        imageCredit: {
          licence: "cc-by",
          author: "Jane Doe",
          licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
        },
      });
    });

    it("prefills the stored credit on edit and saves without a tick", async () => {
      const user = userEvent.setup();
      const credit = {
        licence: "cc-by-sa",
        author: "Jane Doe",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Flags.jpg",
      } as const;
      const onsubmit = vi.fn().mockResolvedValue(true);
      render(QuestionForm, {
        props: {
          categories,
          question: {
            ...imageMatching,
            question: {
              ...imageMatching.question,
              media: {
                type: "image",
                url: "https://cdn.test/questions/flags.jpg",
                credit,
              },
            },
          },
          onsubmit,
        },
      });
      await screen.findByDisplayValue("Match the flags.");
      expect(screen.getByLabelText(/^Licence(?! link)/)).toHaveValue(
        "cc-by-sa",
      );
      expect(screen.getByLabelText(/^Author/)).toHaveValue("Jane Doe");
      expect(screen.getByLabelText("Source link")).toHaveValue(
        credit.sourceUrl,
      );

      await user.click(screen.getByRole("button", { name: "Save changes" }));
      expect(onsubmit.mock.calls[0]?.[0]).toMatchObject({
        imageCredit: credit,
      });
    });

    it("clears the stored credit when a new file replaces the stored image", async () => {
      const user = userEvent.setup();
      render(QuestionForm, {
        props: {
          categories,
          question: {
            ...imageMatching,
            question: {
              ...imageMatching.question,
              media: {
                type: "image",
                url: "https://cdn.test/questions/flags.jpg",
                credit: { licence: "cc-by", author: "Jane Doe" },
              },
            },
          },
          onsubmit: vi.fn().mockResolvedValue(true),
        },
      });
      await screen.findByDisplayValue("Match the flags.");
      expect(screen.getByLabelText(/^Licence(?! link)/)).toHaveValue("cc-by");
      await user.upload(
        document.getElementById("image-file") as HTMLInputElement,
        new File(["x"], "other.png", { type: "image/png" }),
      );
      await screen.findByText(/other.png ready to upload\./);
      expect(screen.getByLabelText(/^Licence(?! link)/)).toHaveValue("");
    });

    it("says the credit was cleared when a new file replaces the stored image", async () => {
      const user = userEvent.setup();
      render(QuestionForm, {
        props: {
          categories,
          question: {
            ...imageMatching,
            question: {
              ...imageMatching.question,
              media: {
                type: "image",
                url: "https://cdn.test/questions/flags.jpg",
                credit: { licence: "cc-by", author: "Jane Doe" },
              },
            },
          },
          onsubmit: vi.fn().mockResolvedValue(true),
        },
      });
      await screen.findByDisplayValue("Match the flags.");
      await user.upload(
        document.getElementById("image-file") as HTMLInputElement,
        new File(["x"], "other.png", { type: "image/png" }),
      );
      expect(
        await screen.findByText(
          /Credit cleared\. Add the credit for the new image\./,
        ),
      ).toBeInTheDocument();
    });
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
      await user.upload(
        document.getElementById("image-file") as HTMLInputElement,
        new File(["x"], "pic.png", { type: "image/png" }),
      );
      await screen.findByText("pic.png ready to upload.");
      await user.click(screen.getByLabelText(/I hold the rights/));
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
