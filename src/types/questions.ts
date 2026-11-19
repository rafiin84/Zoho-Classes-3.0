import type { ID, ISODate } from "./index";

export const BLOOM = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"] as const;
export type Bloom = (typeof BLOOM)[number];
export const BLOOM_HELP: Record<Bloom, string> = {
  Remember: "Recall facts, terms, definitions.", Understand: "Explain ideas in own words, interpret, summarise.", Apply: "Use a method or rule in a new situation.",
  Analyse: "Break into parts, compare, find relationships or causes.", Evaluate: "Judge, justify or critique using criteria.", Create: "Design, compose or propose something new.",
};
export const DIFFICULTY = ["Easy", "Medium", "Hard"] as const;
export type Difficulty = (typeof DIFFICULTY)[number];
export const QTYPES = [
  { id: "mcq", label: "MCQ" }, { id: "multi", label: "Multiple select" }, { id: "tf", label: "True / False" }, { id: "fill", label: "Fill in the blank" },
  { id: "match", label: "Matching" }, { id: "short", label: "Short answer" }, { id: "long", label: "Long answer" }, { id: "essay", label: "Essay" },
  { id: "diagram", label: "Image / diagram" }, { id: "structured", label: "Structured response" },
] as const;
export type QType = (typeof QTYPES)[number]["id"];
export const qTypeLabel = (t: QType) => QTYPES.find((x) => x.id === t)?.label ?? t;
export const isObjective = (t: QType) => ["mcq", "multi", "tf", "fill", "match"].includes(t);
export type QStatus = "draft" | "in-review" | "approved" | "rejected" | "archived";
export type ShareTier = "private" | "department" | "institution" | "marketplace";
export const SHARE_TIERS: { id: ShareTier; label: string; help: string }[] = [
  { id: "private", label: "Private", help: "Only you" }, { id: "department", label: "Department", help: "Colleagues in your department" },
  { id: "institution", label: "Institution", help: "All staff at your institution" }, { id: "marketplace", label: "Marketplace (licensed)", help: "Offered under licence; needs institution approval" },
];

export interface QVersion { v: number; at: ISODate; by: string; note: string; stem: string; marks: number }
export interface QUsage { paperId: ID; paperTitle: string; at: ISODate }
export interface Question {
  id: ID; subjectId: string; gradeId: string; chapterId: string; objectiveIds: string[]; type: QType; stem: string; options?: string[];
  /** MCQ: index; multi: indexes; tf: true/false; fill/match/short..: model answer text */
  answer: string; explanation: string; rubric?: { criterion: string; marks: number }[]; marks: number; difficulty: Difficulty; bloom: Bloom; language: string;
  tags: string[]; authorId: ID; authorName: string; departmentId: string; status: QStatus; share: ShareTier; source: string; aiGenerated: boolean; ambiguityFlags?: string[];
  version: number; versions: QVersion[]; usage: QUsage[]; createdAt: ISODate; updatedAt: ISODate; reviewNote?: string;
}
export type QuestionInput = Pick<Question, "subjectId" | "gradeId" | "chapterId" | "objectiveIds" | "type" | "stem" | "answer" | "explanation" | "marks" | "difficulty" | "bloom" | "language" | "tags" | "source"> & { options?: string[]; rubric?: Question["rubric"] };

export interface AIGenParams { objectiveIds: string[]; source: string; types: QType[]; count: number; marks: number; difficulty: Difficulty; bloom: Bloom; subjectId: string; gradeId: string }

/* ---------- Papers ---------- */
export type PaperStatus = "draft" | "in-review" | "approved" | "published" | "archived";
export interface Blueprint {
  id: ID; name: string; totalMarks: number; bloomMarks: Record<Bloom, number>; difficultyPct: Record<Difficulty, number>; typeMix: Partial<Record<QType, number>>; language: string; accessibility: string; builtIn?: boolean;
}
export interface PaperQuestion { qid: ID; section: string; marks: number; snapshot: Question }
export interface PaperVersion { v: number; at: ISODate; by: string; note: string; questionIds: ID[] }
export interface Paper {
  id: ID; title: string; subjectId: string; gradeId: string; chapterIds: string[]; objectiveIds: string[]; totalMarks: number; durationMin: number; academicYearId: string; term: string; examType: string;
  instructions: string; blueprint: Blueprint; mode: "manual" | "bank" | "ai"; questions: PaperQuestion[]; status: PaperStatus; ownerId: ID; ownerName: string; version: number; versions: PaperVersion[];
  restrictedTo: "owner" | "department" | "institution"; createdAt: ISODate; updatedAt: ISODate; approvedBy?: string; publishedAt?: ISODate; reviewNote?: string;
}
export interface PaperCheck { key: string; ok: boolean; level: "error" | "warn"; text: string }
