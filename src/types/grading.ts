import type { ID, ISODate } from "./index";

/** AI-assisted grading contracts. Every AI value is a DRAFT until a teacher approves it; students only ever receive released marks. */
export type SubmissionFormat = "mcq" | "short" | "essay" | "handwritten" | "pdf" | "numerical" | "diagram" | "audio-video" | "project" | "coding";
export const FORMAT_LABEL: Record<SubmissionFormat, string> = {
  mcq: "MCQ / objective", short: "Short answer", essay: "Essay / long answer", handwritten: "Handwritten", pdf: "PDF / document", numerical: "Numerical working",
  diagram: "Diagram / image", "audio-video": "Audio / video", project: "Project / practical", coding: "Coding / structured",
};
export type GradingStatus = "ai-drafted" | "approved" | "overridden" | "rejected" | "released";

export interface McqAnswer { q: string; selected: string; correct: string; marks: number; max: number; explanation: string; partial?: boolean }
export interface RubricCriterion { id: string; name: string; max: number; score: number; quote?: string; comment: string; /** model-answer / key points matched */ matched?: string[] }
export interface MathStep { n: number; text: string; status: "correct" | "method" | "error"; marks: number; max: number; issue?: string }
export interface DocPage { page: number; section: string; extract: string; note?: string }
export interface MediaSegment { t: string; text: string }
export interface Artefact { name: string; kind: string; note?: string }
export interface EvaluatorNote { name: string; role: string; score: number; feedback: string }
export interface TestCase { name: string; passed: boolean; detail?: string }

export interface GradingEvidence {
  /** deterministic answer-key scoring (MCQ/objective) — not AI */
  answers?: McqAnswer[];
  criteria?: RubricCriterion[];
  modelAnswer?: string;
  studentText?: string;
  /** handwritten */
  imageLabel?: string; transcription?: string; originalTranscription?: string; ocrConfidence?: number; contentReviewed?: boolean;
  pages?: DocPage[]; steps?: MathStep[]; segments?: MediaSegment[]; mediaLabel?: string; artefacts?: Artefact[]; evaluators?: EvaluatorNote[]; tests?: TestCase[]; code?: string;
  imageObservations?: string[]; keyPoints?: { point: string; found: boolean }[];
}
export interface AuditEntry { id: ID; at: ISODate; actor: string; kind: "ai-suggestion" | "auto-score" | "teacher-edit" | "approve" | "override" | "reject" | "re-evaluate" | "release" | "bulk-approve" | "moderation"; text: string; marks?: number }

export interface GradingItem {
  id: ID; assessmentId: ID; assessmentTitle: string; classId: ID; className: string; studentId: ID; studentName: string; teacherId: ID; subjectId: string;
  format: SubmissionFormat; maxMarks: number; submittedAt: ISODate; status: GradingStatus;
  /** deterministic auto-score (MCQ) */ autoMarks?: number;
  /** AI-suggested marks; undefined for handwritten until content reviewed */ suggestedMarks?: number; finalMarks?: number;
  confidence: number; flags: string[]; moderationNote?: string; moderated?: boolean;
  suggestedFeedback: string; finalFeedback?: string; evidence: GradingEvidence; audit: AuditEntry[];
  assignmentSubmissionId?: ID; releasedAt?: ISODate; rejectReason?: string; overrideReason?: string; reEvalCount: number;
}
export interface ReviewPolicy {
  confidenceThreshold: number; bulkApprovalEnabled: boolean; requireReasonOnOverride: true; /** never auto-publish: fixed */ autoRelease: false;
  moderationSamplePct: number; updatedBy: string;
}
export interface GradingFilters { assessmentId?: ID; classId?: ID; teacherId?: ID }
