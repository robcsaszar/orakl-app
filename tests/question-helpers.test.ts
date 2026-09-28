import {
  formatCorrectAnswer,
  getAnswerButtonClass,
  getMatchItemClass,
  getTrueFalseButtonClass,
  isAnswerCorrect,
  selectMatchItem,
} from "@orakl/client-core";
import { describe, expect, it } from "vitest";
import { drawMatchLines } from "../src/lib/question-helpers";

const answers = [
  { id: "a1", text: "Paris" },
  { id: "a2", text: "London" },
  { id: "a3", text: "Berlin" },
];

describe("formatCorrectAnswer", () => {
  it("returns answer text for text_choice", () => {
    expect(formatCorrectAnswer("a1", "text_choice", answers)).toBe("Paris");
  });

  it("replaces pipe with arrow for image_matching", () => {
    expect(formatCorrectAnswer("cat|feline", "image_matching", answers)).toBe(
      "cat \u2192 feline",
    );
  });

  it("returns empty string for missing answer", () => {
    expect(formatCorrectAnswer("missing", "text_choice", answers)).toBe("");
  });
});

describe("isAnswerCorrect", () => {
  it("returns true on match", () => {
    expect(isAnswerCorrect("a1", "a1")).toBe(true);
  });

  it("returns false on mismatch", () => {
    expect(isAnswerCorrect("a1", "a2")).toBe(false);
  });
});

describe("selectMatchItem", () => {
  it("toggles left selection", () => {
    const result = selectMatchItem(
      { selectedLeftItem: null, selectedRightItem: null },
      "left",
      "cat",
    );
    expect(result.selectedLeftItem).toBe("cat");
    expect(result.answerId).toBeNull();
  });

  it("deselects on second click", () => {
    const result = selectMatchItem(
      { selectedLeftItem: "cat", selectedRightItem: null },
      "left",
      "cat",
    );
    expect(result.selectedLeftItem).toBeNull();
  });

  it("toggles right selection", () => {
    const result = selectMatchItem(
      { selectedLeftItem: null, selectedRightItem: null },
      "right",
      "feline",
    );
    expect(result.selectedRightItem).toBe("feline");
    expect(result.answerId).toBeNull();
  });

  it("returns answerId when both selected", () => {
    const result = selectMatchItem(
      { selectedLeftItem: "cat", selectedRightItem: null },
      "right",
      "feline",
    );
    expect(result.answerId).toBe("cat|feline");
  });
});

describe("getAnswerButtonClass", () => {
  const _base =
    "w-full rounded-xl border-2 px-5 py-4 text-left text-base transition relative";

  it("highlights correct answer green", () => {
    const cls = getAnswerButtonClass("a1", {
      correctAnswerId: "a1",
      selectedAnswerId: "a1",
      answered: true,
    });
    expect(cls).toContain("border-green-500");
    expect(cls).toContain("bg-green-950");
  });

  it("highlights wrong selection red", () => {
    const cls = getAnswerButtonClass("a2", {
      correctAnswerId: "a1",
      selectedAnswerId: "a2",
      answered: true,
    });
    expect(cls).toContain("border-red-500");
  });

  it("shows neutral for unselected during results", () => {
    const cls = getAnswerButtonClass("a3", {
      correctAnswerId: "a1",
      selectedAnswerId: "a2",
      answered: true,
    });
    expect(cls).toContain("border-gray-800");
  });

  it("shows violet for selected pre-result", () => {
    const cls = getAnswerButtonClass("a1", {
      correctAnswerId: "",
      selectedAnswerId: "a1",
      answered: true,
    });
    expect(cls).toContain("border-violet-500");
  });

  it("shows hover state when not answered", () => {
    const cls = getAnswerButtonClass("a1", {
      correctAnswerId: "",
      selectedAnswerId: null,
      answered: false,
    });
    expect(cls).toContain("hover:border-gray-500");
  });

  it("shows neutral when answered but not this one", () => {
    const cls = getAnswerButtonClass("a2", {
      correctAnswerId: "",
      selectedAnswerId: "a1",
      answered: true,
    });
    expect(cls).toContain("border-gray-700");
    expect(cls).not.toContain("hover:");
  });
});

describe("getMatchItemClass", () => {
  it("highlights correct left item green", () => {
    const cls = getMatchItemClass("left", "cat", {
      correctAnswerId: "cat|feline",
      selectedLeftItem: "cat",
      selectedRightItem: "feline",
      answered: true,
    });
    expect(cls).toContain("border-green-500");
  });

  it("highlights correct right item green", () => {
    const cls = getMatchItemClass("right", "feline", {
      correctAnswerId: "cat|feline",
      selectedLeftItem: "cat",
      selectedRightItem: "feline",
      answered: true,
    });
    expect(cls).toContain("border-green-500");
  });

  it("highlights wrong selection red", () => {
    const cls = getMatchItemClass("left", "dog", {
      correctAnswerId: "cat|feline",
      selectedLeftItem: "dog",
      selectedRightItem: "feline",
      answered: true,
    });
    expect(cls).toContain("border-red-500");
  });

  it("shows violet for selected pre-result", () => {
    const cls = getMatchItemClass("left", "cat", {
      correctAnswerId: "",
      selectedLeftItem: "cat",
      selectedRightItem: null,
      answered: false,
    });
    expect(cls).toContain("border-violet-500");
  });

  it("shows hover state when not answered", () => {
    const cls = getMatchItemClass("left", "cat", {
      correctAnswerId: "",
      selectedLeftItem: null,
      selectedRightItem: null,
      answered: false,
    });
    expect(cls).toContain("hover:border-gray-500");
  });

  it("does not highlight a right item when the correct pair is missing its separator", () => {
    const cls = getMatchItemClass("right", "cat", {
      correctAnswerId: "cat",
      selectedLeftItem: null,
      selectedRightItem: "cat",
      answered: true,
    });
    expect(cls).not.toContain("border-green-500");
  });

  it("does not treat an empty item as matching a missing right half", () => {
    const cls = getMatchItemClass("right", "", {
      correctAnswerId: "cat",
      selectedLeftItem: null,
      selectedRightItem: "",
      answered: true,
    });
    expect(cls).not.toContain("border-green-500");
  });
});

describe("drawMatchLines", () => {
  function buildContainer() {
    const container = document.createElement("div");
    container.innerHTML = `
      <svg data-match-svg></svg>
      <button data-match-left="cat">cat</button>
      <button data-match-right="feline">feline</button>
      <button data-match-right="">empty</button>
    `;
    document.body.appendChild(container);
    return container;
  }

  it("draws no path when the correct answer's right half is missing", () => {
    // jsdom has no getTotalLength; stub it so a path drawn by mistake reaches
    // the count assertion instead of throwing inside makeMatchPath.
    Object.defineProperty(SVGElement.prototype, "getTotalLength", {
      configurable: true,
      value: () => 0,
    });
    const container = buildContainer();
    drawMatchLines(container, "cat", null, "green", "red");
    const svg = container.querySelector("[data-match-svg]") as SVGSVGElement;
    expect(svg.querySelectorAll("path").length).toBe(0);
    container.remove();
  });
});

describe("getTrueFalseButtonClass", () => {
  const tfAnswers = [
    { id: "t", text: "true" },
    { id: "f", text: "false" },
  ];

  it("highlights correct answer green when results revealed", () => {
    const cls = getTrueFalseButtonClass("t", {
      correctAnswerId: "t",
      selectedAnswerId: "t",
      answered: true,
      answers: tfAnswers,
    });
    expect(cls).toContain("border-green-400");
    expect(cls).toContain("bg-green-950");
  });

  it("highlights wrong selection red when results revealed", () => {
    const cls = getTrueFalseButtonClass("f", {
      correctAnswerId: "t",
      selectedAnswerId: "f",
      answered: true,
      answers: tfAnswers,
    });
    expect(cls).toContain("border-red-400");
    expect(cls).toContain("bg-red-950");
  });

  it("shows faded neutral for unselected non-correct answer after reveal", () => {
    const cls = getTrueFalseButtonClass("f", {
      correctAnswerId: "t",
      selectedAnswerId: "t",
      answered: true,
      answers: tfAnswers,
    });
    expect(cls).toContain("border-gray-700");
    expect(cls).toContain("opacity-50");
  });

  it("shows violet for selected answer pre-result", () => {
    const cls = getTrueFalseButtonClass("t", {
      correctAnswerId: "",
      selectedAnswerId: "t",
      answered: true,
      answers: tfAnswers,
    });
    expect(cls).toContain("border-violet-400");
    expect(cls).toContain("bg-violet-950");
  });

  it("shows emerald hover state for true button when unanswered", () => {
    const cls = getTrueFalseButtonClass("t", {
      correctAnswerId: "",
      selectedAnswerId: null,
      answered: false,
      answers: tfAnswers,
    });
    expect(cls).toContain("border-emerald-800");
    expect(cls).toContain("hover:border-emerald-600");
  });

  it("shows rose hover state for false button when unanswered", () => {
    const cls = getTrueFalseButtonClass("f", {
      correctAnswerId: "",
      selectedAnswerId: null,
      answered: false,
      answers: tfAnswers,
    });
    expect(cls).toContain("border-rose-800");
    expect(cls).toContain("hover:border-rose-600");
  });

  it("shows muted gray for unselected answered button (no correct revealed)", () => {
    const cls = getTrueFalseButtonClass("f", {
      correctAnswerId: "",
      selectedAnswerId: "t",
      answered: true,
      answers: tfAnswers,
    });
    expect(cls).toContain("border-gray-700");
    expect(cls).toContain("text-gray-500");
  });
});
