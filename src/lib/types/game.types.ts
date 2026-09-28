import type { PlayerStatus } from "@orakl/protocol";
import type { QuestionType } from "@orakl/shared";
import type { Difficulty } from "../../../data/game.settings.js";

export type { PlayerStatus };

export interface LobbyPlayer {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  ready: boolean;
  status: PlayerStatus;
  role: "player" | "observer";
  isEditing?: boolean;
  editedNickname?: string;
  /** True only for the curator's own row (playing curator, ADR 0019). */
  isCurator?: true;
}

export interface CuratorPlayer {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  status: PlayerStatus;
  role?: "player" | "observer";
  hasAnswered?: boolean;
  /** True only for the curator's own row (playing curator, ADR 0019). */
  isCurator?: true;
}

export interface CuratorQuestion {
  questionIndex: number;
  totalQuestions: number;
  text: string;
  categoryId: string;
  difficulty?: Difficulty;
  questionType?: QuestionType;
  answers: { id: string; text: string }[];
  matchItems?: { left: string[]; right: string[] };
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video";
}

/** Question sent to player client — no isCorrect field (anti-cheat) */
export interface GameQuestion {
  /** Live `questions` table id — see GameQuestionMessage in @orakl/protocol's ws.ts. */
  questionId: string;
  questionIndex: number;
  totalQuestions: number;
  text: string;
  categoryId: string;
  difficulty?: Difficulty;
  questionType?: QuestionType;
  answers: { id: string; text: string }[];
  matchItems?: { left: string[]; right: string[] };
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "video";
  timeRemaining: number;
  serverTs: number;
}
