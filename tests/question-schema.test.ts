import { DifficultySchema, isHttpsUrl, QuestionSchema } from "@orakl/shared";
import { Either, Schema } from "effect";
import { describe, expect, it } from "vitest";

const baseTextChoice = {
  id: "q1",
  type: "text_choice" as const,
  category: "Science",
  difficulty: "easy" as const,
  question: { text: "What is H2O?" },
  correctAnswer: "Water",
  incorrectAnswers: ["Fire", "Earth", "Air"],
  metadata: { source: "custom" as const },
  createdAt: "2026-01-01T00:00:00Z",
};

describe("QuestionSchema", () => {
  it("parses valid text_choice question", () => {
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(QuestionSchema)(baseTextChoice),
      ),
    ).toBe(true);
  });
  it("rejects unknown question type", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(QuestionSchema)({
          ...baseTextChoice,
          type: "unknown_type",
        }),
      ),
    ).toBe(true);
  });
  it("rejects invalid difficulty", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(QuestionSchema)({
          ...baseTextChoice,
          difficulty: "legendary",
        }),
      ),
    ).toBe(true);
  });
  it("parses valid true_false question", () => {
    const q = {
      ...baseTextChoice,
      type: "true_false",
      correctAnswer: "true",
      incorrectAnswers: ["false"],
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });
  it("parses valid image_matching question", () => {
    const q = {
      ...baseTextChoice,
      type: "image_matching",
      question: {
        text: "Match",
        media: { type: "image", url: "https://example.com/img.png" },
      },
      correctAnswer: "Paris|France",
      incorrectAnswers: ["London|Germany", "Berlin|Spain", "Rome|UK"],
      matchItems: {
        left: ["Paris", "London", "Berlin", "Rome"],
        right: ["France", "Germany", "Spain", "UK"],
      },
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });
});

describe("QuestionSchema runtime validation", () => {
  it("decodeUnknownEither rejects malformed question missing required fields", () => {
    const bad = { type: "text_choice", id: "x" };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(bad))).toBe(
      true,
    );
  });

  it("decodeUnknownSync throws on invalid question", () => {
    expect(() =>
      Schema.decodeUnknownSync(QuestionSchema)({ type: "text_choice" }),
    ).toThrow();
  });
});

describe("QuestionSchema — unimplemented types", () => {
  const base = {
    id: "q2",
    category: "Music",
    difficulty: "medium" as const,
    correctAnswer: "Answer",
    incorrectAnswers: ["A", "B", "C"],
    metadata: { source: "custom" as const },
    createdAt: "2026-01-01T00:00:00Z",
  };
  const withMedia = {
    question: {
      text: "Q?",
      media: { type: "image", url: "https://x.com/a.png" },
    },
  };

  it("parses valid image_choice question", () => {
    const q = { ...base, type: "image_choice", ...withMedia };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects image_choice missing required media", () => {
    const q = { ...base, type: "image_choice", question: { text: "Q?" } };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("parses valid finish_line question", () => {
    const q = { ...base, type: "finish_line", ...withMedia };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects finish_line missing required media", () => {
    const q = { ...base, type: "finish_line", question: { text: "Q?" } };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("parses valid audio_identify question", () => {
    const q = {
      ...base,
      type: "audio_identify",
      question: {
        text: "Q?",
        media: { type: "audio", url: "https://x.com/a.mp3" },
      },
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects audio_identify missing required media", () => {
    const q = { ...base, type: "audio_identify", question: { text: "Q?" } };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("parses valid sequence_order question", () => {
    const q = {
      ...base,
      type: "sequence_order",
      question: { text: "Order these" },
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("parses valid estimate_range question with acceptableRange", () => {
    const q = {
      ...base,
      type: "estimate_range",
      question: { text: "Estimate?" },
      metadata: { source: "custom" as const, acceptableRange: 10 },
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects estimate_range missing acceptableRange", () => {
    const q = {
      ...base,
      type: "estimate_range",
      question: { text: "Estimate?" },
    };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("parses valid fill_blank question", () => {
    const q = { ...base, type: "fill_blank", question: { text: "Fill ___" } };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("parses valid matching_pairs question", () => {
    const q = {
      ...base,
      type: "matching_pairs",
      question: { text: "Match these" },
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("parses valid progressive_reveal question with revealSteps", () => {
    const q = {
      ...base,
      type: "progressive_reveal",
      ...withMedia,
      metadata: { source: "custom" as const, revealSteps: 3 },
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects progressive_reveal missing revealSteps", () => {
    const q = { ...base, type: "progressive_reveal", ...withMedia };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects progressive_reveal missing required media", () => {
    const q = {
      ...base,
      type: "progressive_reveal",
      question: { text: "Q?" },
      metadata: { source: "custom" as const, revealSteps: 3 },
    };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });
});

describe("QuestionSchema — source and postAnswerNote (map #912)", () => {
  it("accepts a question with neither field", () => {
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(QuestionSchema)(baseTextChoice),
      ),
    ).toBe(true);
  });

  it("accepts a valid https source and note", () => {
    const q = {
      ...baseTextChoice,
      source: { url: "https://example.com/citation", label: "Example" },
      postAnswerNote: "A short explanation.",
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("accepts a source with no label", () => {
    const q = {
      ...baseTextChoice,
      source: { url: "https://example.com/citation" },
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects a non-https source URL", () => {
    const q = {
      ...baseTextChoice,
      source: { url: "http://example.com/citation" },
    };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects a source URL with no scheme at all", () => {
    const q = {
      ...baseTextChoice,
      source: { url: "not-a-url" },
    };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects a postAnswerNote over 160 characters", () => {
    const q = {
      ...baseTextChoice,
      postAnswerNote: "a".repeat(161),
    };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("accepts a postAnswerNote at exactly 160 characters", () => {
    const q = {
      ...baseTextChoice,
      postAnswerNote: "a".repeat(160),
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });
});

describe("QuestionSchema — source.url and source.label caps", () => {
  it("rejects a source URL over 2048 characters", () => {
    const q = {
      ...baseTextChoice,
      source: { url: `https://example.com/${"a".repeat(2048)}` },
    };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("rejects a source label over 200 characters", () => {
    const q = {
      ...baseTextChoice,
      source: {
        url: "https://example.com/citation",
        label: "a".repeat(201),
      },
    };
    expect(Either.isLeft(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });

  it("accepts a source label at exactly 200 characters", () => {
    const q = {
      ...baseTextChoice,
      source: {
        url: "https://example.com/citation",
        label: "a".repeat(200),
      },
    };
    expect(Either.isRight(Schema.decodeUnknownEither(QuestionSchema)(q))).toBe(
      true,
    );
  });
});

describe("isHttpsUrl", () => {
  it("accepts a well-formed https URL", () => {
    expect(isHttpsUrl("https://example.com/citation")).toBe(true);
  });

  it("rejects http", () => {
    expect(isHttpsUrl("http://example.com")).toBe(false);
  });

  it("accepts a schemeless-authority https URL the same way the schema does", () => {
    // WHATWG URL parsing accepts this (protocol "https:") — the whole point
    // of sharing one validator is that the form agrees with the schema here.
    expect(isHttpsUrl("https:evil")).toBe(true);
  });

  it("rejects an unparsable string", () => {
    expect(isHttpsUrl("not-a-url")).toBe(false);
  });
});

describe("DifficultySchema", () => {
  it("accepts easy/medium/hard", () => {
    expect(
      Either.isRight(Schema.decodeUnknownEither(DifficultySchema)("easy")),
    ).toBe(true);
    expect(
      Either.isRight(Schema.decodeUnknownEither(DifficultySchema)("medium")),
    ).toBe(true);
    expect(
      Either.isRight(Schema.decodeUnknownEither(DifficultySchema)("hard")),
    ).toBe(true);
  });
  it("rejects all and unknown values", () => {
    expect(
      Either.isLeft(Schema.decodeUnknownEither(DifficultySchema)("all")),
    ).toBe(true);
    expect(
      Either.isLeft(Schema.decodeUnknownEither(DifficultySchema)("extreme")),
    ).toBe(true);
  });
});
