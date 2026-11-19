import type { Question, QuestionType, AnswerValue } from "@/types/exams";

export type RenderMode = "attempt" | "preview" | "review";
export interface QResult { correct: boolean | "partial" | "manual"; got: number }
export interface RendererProps<Q extends Question = Question> {
  question: Q; value: AnswerValue | undefined; onChange: (v: AnswerValue | undefined) => void; mode: RenderMode; disabled?: boolean;
  /** Review mode: auto-marked outcome for this question. */
  result?: QResult; /** Teacher/preview contexts that may show the answer key (needs the full question with `answer` fields). */ showKey?: boolean; idPrefix: string;
}
export interface RendererDef<Q extends Question = Question> {
  type: QuestionType; label: string; description: string; icon: string;
  Component: (p: RendererProps<Q>) => React.ReactElement;
  /** Returns an error message if the answer is malformed (e.g. unanswered blank or over word limit); null when fine. Unanswered is NOT an error (use `isAnswered`). */
  validate: (q: Q, v: AnswerValue | undefined) => string | null;
  /** Human-readable answer key for review/preview, or null when the question is manually marked. */
  keyText: (q: Q) => string | null;
}
