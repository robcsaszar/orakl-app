import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { QuizDisplayData } from "../../src/routes/(display)/curator/display/QuizDisplay.svelte";
import QuizDisplay from "../../src/routes/(display)/curator/display/QuizDisplay.svelte";

const base: QuizDisplayData = {
  questionType: "multiple_choice",
  text: "What colour is the sky?",
  answers: [
    { id: "a1", text: "Blue" },
    { id: "a2", text: "Green" },
    { id: "a3", text: "Red" },
  ],
  matchItems: null,
  correctAnswerId: "",
  timerState: "counting",
  timeRemaining: 20,
  timerFraction: 0.5,
};

describe("QuizDisplay — question text", () => {
  it("renders the question text", () => {
    render(QuizDisplay, { props: { data: base } });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "What colour is the sky?",
    );
  });
});

describe("QuizDisplay — answer type routing", () => {
  it("multiple_choice → renders multiple choice buttons", () => {
    render(QuizDisplay, { props: { data: base } });
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.getByText("Green")).toBeInTheDocument();
    expect(screen.getByText("Red")).toBeInTheDocument();
  });

  it("true_false → renders True and False buttons", () => {
    const data: QuizDisplayData = {
      ...base,
      questionType: "true_false",
      answers: [
        { id: "t", text: "True" },
        { id: "f", text: "False" },
      ],
    };
    render(QuizDisplay, { props: { data } });
    expect(screen.getByRole("button", { name: "True" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "False" })).toBeInTheDocument();
  });

  it("image_matching → renders Match from / Match to column headers", () => {
    const data: QuizDisplayData = {
      ...base,
      questionType: "image_matching",
      matchItems: {
        left: ["Cat", "Dog"],
        right: ["Meow", "Woof"],
      },
    };
    render(QuizDisplay, { props: { data } });
    expect(screen.getByText(/match from/i)).toBeInTheDocument();
    expect(screen.getByText(/match to/i)).toBeInTheDocument();
  });
});

describe("QuizDisplay — media", () => {
  it("shows image when mediaUrl and mediaType='image' are set", () => {
    const data: QuizDisplayData = {
      ...base,
      mediaUrl: "https://example.com/img.png",
      mediaType: "image",
    };
    render(QuizDisplay, { props: { data } });
    const img = screen.getByRole("img", { name: "Question" });
    expect(img).toHaveAttribute("src", "https://example.com/img.png");
  });

  it("hides image when mediaUrl is absent", () => {
    render(QuizDisplay, { props: { data: base } });
    expect(
      screen.queryByRole("img", { name: "Question" }),
    ).not.toBeInTheDocument();
  });

  it("hides image when mediaType is not 'image'", () => {
    const data: QuizDisplayData = {
      ...base,
      mediaUrl: "https://example.com/clip.mp4",
      mediaType: "video",
    };
    render(QuizDisplay, { props: { data } });
    expect(
      screen.queryByRole("img", { name: "Question" }),
    ).not.toBeInTheDocument();
  });
});
