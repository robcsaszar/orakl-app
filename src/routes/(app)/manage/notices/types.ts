/** One row of `GET /api/manage/notices`. */
export interface Notice {
  id: string;
  createdAt: string;
  decidedAt: string | null;
  status: "open" | "disabled" | "restored" | "rejected";
  kind: "dsa" | "dmca";
  notifierName: string;
  notifierEmail: string;
  reason: string;
  rightOrLaw: string;
  workIdentified: string | null;
  signature: string | null;
  questionId: string | null;
  questionRef: string;
  excerpt: string | null;
  /** The notice recorded a stored image. */
  hasImage: boolean;
  /** That image sits in quarantine. */
  imageDisabled: boolean;
  previewUrl: string | null;
  ageHours: number;
  overdue: boolean;
  actions: Array<{
    at: string;
    by: string | null;
    action: string;
    statement: string;
  }>;
}
