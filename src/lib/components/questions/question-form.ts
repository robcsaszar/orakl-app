import type { MediaCredit } from "@orakl/shared";

/** A category the question form offers in its select. */
export interface QuestionFormCategory {
  id: string;
  name: string;
  icon?: string;
  count: number;
}

/** A stored question as the form edits it (the `GET /api/custom-questions/:id` shape). */
export interface QuestionFormQuestion {
  id: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  type: "text_choice" | "true_false" | "image_matching";
  question: { text: string; media?: { url: string; credit?: MediaCredit } };
  correctAnswer: string;
  incorrectAnswers: string[];
  matchItems?: { left: string[]; right: string[] };
  /** Signed /media/ path for the stored image; the canonical URL never resolves on its own. */
  previewUrl?: string;
  source?: { url: string; label?: string };
  postAnswerNote?: string;
  metadata?: { tags?: string[] };
}
