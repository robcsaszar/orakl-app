import type { Question } from "@orakl/protocol";

/** One field that differs between two versions of a question. */
export type QuestionChange =
  | { kind: "value"; label: string; before: string; after: string }
  | { kind: "list"; label: string; removed: string[]; added: string[] };

function pairs(q: Question): string[] {
  if (q.type !== "image_matching") return [];
  return q.matchItems.left.map(
    (l, i) => `${l} — ${q.matchItems.right[i] ?? ""}`,
  );
}

function listChange(
  label: string,
  before: readonly string[],
  after: readonly string[],
): QuestionChange | null {
  const removed = before.filter((v) => !after.includes(v));
  const added = after.filter((v) => !before.includes(v));
  if (removed.length === 0 && added.length === 0) return null;
  return { kind: "list", label, removed, added };
}

/**
 * What an edit changed, field by field, from `before` to `after`. Empty when
 * the two versions read the same (a save without changes).
 */
export function diffQuestions(
  before: Question,
  after: Question,
): QuestionChange[] {
  const out: QuestionChange[] = [];
  const value = (label: string, b: string, a: string) => {
    if (b !== a) out.push({ kind: "value", label, before: b, after: a });
  };
  value("Question", before.question.text, after.question.text);
  value("Category", before.category, after.category);
  value("Difficulty", before.difficulty, after.difficulty);
  value(
    "Image",
    before.question.media?.url ?? "",
    after.question.media?.url ?? "",
  );
  value("Source", before.source?.url ?? "", after.source?.url ?? "");
  value(
    "Post-answer note",
    before.postAnswerNote ?? "",
    after.postAnswerNote ?? "",
  );
  if (before.type === "image_matching" || after.type === "image_matching") {
    const change = listChange("Pairs", pairs(before), pairs(after));
    if (change) out.push(change);
    value(
      "Correct pair",
      before.correctAnswer.replace("|", " — "),
      after.correctAnswer.replace("|", " — "),
    );
  } else {
    value("Correct answer", before.correctAnswer, after.correctAnswer);
    const change = listChange(
      "Wrong answers",
      before.incorrectAnswers,
      after.incorrectAnswers,
    );
    if (change) out.push(change);
  }
  return out;
}
