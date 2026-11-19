import type { ID, ISODate } from "./index";

export type QuestionType = "mcq" | "multi" | "tf" | "fill" | "matching" | "ordering" | "short" | "long" | "numerical" | "file";
/** Answer payload per question type: mcq → option index; multi → sorted indexes; tf → boolean; fill → string[] (one per blank);
 *  matching → Record<left, right>; ordering → string[] (student's order); short/long → string; numerical → string; file → mock attachments. */
export type AnswerValue = number | number[] | boolean | string | string[] | Record<string, string> | { name: string; kind: string }[];

interface QBase { id: ID; type: QuestionType; prompt: string; marks: number; topic?: string; hint?: string; explanation?: string }
export interface McqQ extends QBase { type: "mcq"; options: string[]; answer?: number }
export interface MultiQ extends QBase { type: "multi"; options: string[]; answer?: number[] }
export interface TfQ extends QBase { type: "tf"; answer?: boolean }
export interface FillQ extends QBase { type: "fill"; /** prompt uses ____ for each blank */ answer?: string[][] }
export interface MatchQ extends QBase { type: "matching"; pairs: { left: string; right: string }[]; /** shuffled display order of rights */ rightOrder?: string[] }
export interface OrderQ extends QBase { type: "ordering"; /** items in the CORRECT order (display is shuffled deterministically) */ items: string[]; answer?: string[] }
export interface ShortQ extends QBase { type: "short"; maxWords: number; keywords?: string[]; sample?: string }
export interface LongQ extends QBase { type: "long"; maxWords: number; rubric?: { criterion: string; marks: number }[]; sample?: string }
export interface NumQ extends QBase { type: "numerical"; unit?: string; answer?: number; tolerance?: number }
export interface FileQ extends QBase { type: "file"; accept: string[]; maxFiles: number }
export type Question = McqQ | MultiQ | TfQ | FillQ | MatchQ | OrderQ | ShortQ | LongQ | NumQ | FileQ;

export type ExamKind = "exam" | "unit-test" | "practice";
export interface Exam {
  id: ID; title: string; subjectId: string; kind: ExamKind; classIds: ID[]; teacherId: ID; teacherName: string; courseId?: ID;
  opensAt: ISODate; closesAt: ISODate; durationMinutes: number; /** 0 = untimed (practice) */
  instructions: string[]; totalMarks: number; questions: Question[]; resultsReleased: boolean; marksheetExamId?: string; allowRetake: boolean; shuffle?: boolean; cancelled?: boolean;
}
export interface ExamAttempt {
  id: ID; examId: ID; studentId: ID; status: "in-progress" | "submitted" | "graded"; startedAt: ISODate; submittedAt?: ISODate; answers: Record<ID, AnswerValue>; flagged: ID[];
  remainingSeconds: number; score?: number; maxScore?: number; locked: boolean; autosavedAt?: ISODate; attemptNo: number; perQuestion?: Record<ID, { correct: boolean | "partial" | "manual"; got: number }>;
}
export type ExamState = "upcoming" | "available" | "in-progress" | "submitted" | "results" | "closed" | "cancelled";
export interface ExamView { exam: Exam; attempt?: ExamAttempt; attempts: number; state: ExamState; resultVisible: boolean }
