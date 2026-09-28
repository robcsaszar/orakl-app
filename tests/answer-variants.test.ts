import {
  type AnswerStyleState,
  isTrueAnswerText,
  splitMatchPair,
} from "@orakl/client-core";
import { describe, expect, it } from "vitest";
import {
  isFalseAnswerText,
  resolveAnswerState,
  resolveMatchItemState,
} from "../src/lib/answer-variants";

const base: AnswerStyleState = {
  correctAnswerId: "",
  selectedAnswerId: null,
  answered: false,
};

describe("resolveAnswerState", () => {
  it("returns 'correct' when answerId matches correctAnswerId", () => {
    expect(resolveAnswerState("a1", { ...base, correctAnswerId: "a1" })).toBe(
      "correct",
    );
  });

  it("returns 'incorrect' when answer is selected but a different answer is correct", () => {
    expect(
      resolveAnswerState("a2", {
        ...base,
        correctAnswerId: "a1",
        selectedAnswerId: "a2",
      }),
    ).toBe("incorrect");
  });

  it("returns 'dimmed' for unselected wrong answer after reveal", () => {
    expect(
      resolveAnswerState("a3", {
        ...base,
        correctAnswerId: "a1",
        selectedAnswerId: "a2",
      }),
    ).toBe("dimmed");
  });

  it("returns 'selected' when answer is chosen but correct not yet revealed", () => {
    expect(resolveAnswerState("a1", { ...base, selectedAnswerId: "a1" })).toBe(
      "selected",
    );
  });

  it("returns 'answered' when question is answered but this answer is not selected", () => {
    expect(
      resolveAnswerState("a2", {
        ...base,
        selectedAnswerId: "a1",
        answered: true,
      }),
    ).toBe("answered");
  });

  it("returns 'idle' when nothing selected and question not yet answered", () => {
    expect(resolveAnswerState("a1", base)).toBe("idle");
  });
});

describe("splitMatchPair", () => {
  it("splits a normal pair into left and right halves", () => {
    expect(splitMatchPair("Athens|Greece")).toEqual(["Athens", "Greece"]);
  });

  it("returns an empty right half when the right side is empty", () => {
    expect(splitMatchPair("Athens|")).toEqual(["Athens", ""]);
  });

  it("returns an empty right half when the separator is missing", () => {
    expect(splitMatchPair("Athens")).toEqual(["Athens", ""]);
  });

  it("splits on the first separator only, ignoring later ones", () => {
    expect(splitMatchPair("a|b|c")).toEqual(["a", "b"]);
  });
});

describe("isTrueAnswerText", () => {
  it("returns true for 'true'", () => {
    expect(isTrueAnswerText("true")).toBe(true);
  });

  it("returns true for 'TRUE'", () => {
    expect(isTrueAnswerText("TRUE")).toBe(true);
  });

  it("returns true for 'True'", () => {
    expect(isTrueAnswerText("True")).toBe(true);
  });

  it("returns false for 'false'", () => {
    expect(isTrueAnswerText("false")).toBe(false);
  });

  it("returns false for ' true' (untrimmed)", () => {
    expect(isTrueAnswerText(" true")).toBe(false);
  });
});

describe("isFalseAnswerText", () => {
  it("returns true for 'false'", () => {
    expect(isFalseAnswerText("false")).toBe(true);
  });

  it("returns true for 'FALSE'", () => {
    expect(isFalseAnswerText("FALSE")).toBe(true);
  });

  it("returns true for 'False'", () => {
    expect(isFalseAnswerText("False")).toBe(true);
  });

  it("returns false for 'true'", () => {
    expect(isFalseAnswerText("true")).toBe(false);
  });

  it("returns false for ' false' (untrimmed)", () => {
    expect(isFalseAnswerText(" false")).toBe(false);
  });
});

describe("resolveMatchItemState", () => {
  const revealed = {
    selectedLeftItem: null,
    selectedRightItem: null,
    answered: true,
  };

  it("marks the right-column half of the pair correct", () => {
    expect(
      resolveMatchItemState("right", "Greece", {
        ...revealed,
        correctAnswerId: "Athens|Greece",
      }),
    ).toBe("correct");
  });

  it("does not mark an empty right item correct when the separator is missing", () => {
    expect(
      resolveMatchItemState("right", "", {
        ...revealed,
        correctAnswerId: "cat",
      }),
    ).not.toBe("correct");
  });
});
