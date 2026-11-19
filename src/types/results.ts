import type { ID, ISODate } from "./index";
import type { ResultStatus } from "./academic";

export interface GradeBoundary { grade: string; min: number; points: number }
export interface GradingScheme {
  id: ID; name: string; passPercent: number; internalMax: number; externalMax: number; rounding: "nearest" | "up" | "down" | "none";
  boundaries: GradeBoundary[]; gpaScale: number; cgpaNote: string;
}
export interface ResultBatch { id: ID; examId: string; examLabel: string; academicYearId: string; termId: string; classLabel: string; schemeId: ID; status: ResultStatus; history: { at: ISODate; by: string; text: string }[]; reviewNote?: string }
export interface RevalRequest { id: ID; sheetId: ID; studentId: ID; subjectId: string; subjectName: string; reason: string; status: "requested" | "in-review" | "accepted" | "rejected"; at: ISODate; originalTotal: number; newTotal?: number; note?: string }
export interface MarkIssue { sheetId: ID; studentId: ID; subjectId: string; kind: "missing" | "range"; message: string }
export type SubjectPatch = { internal?: number; external?: number; status?: "pass" | "absent" | "exempt" | "withheld" | "incomplete" };
