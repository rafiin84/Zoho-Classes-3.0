import type { ID, ISODate } from "./index";

export interface Period { id: string; label: string; start: string; end: string; kind: "teaching" | "break" }
export const PERIODS: Period[] = [
  { id: "p1", label: "Period 1", start: "08:30", end: "09:15", kind: "teaching" }, { id: "p2", label: "Period 2", start: "09:15", end: "10:00", kind: "teaching" },
  { id: "brk1", label: "Short break", start: "10:00", end: "10:15", kind: "break" },
  { id: "p3", label: "Period 3", start: "10:15", end: "11:00", kind: "teaching" }, { id: "p4", label: "Period 4", start: "11:00", end: "11:45", kind: "teaching" },
  { id: "lunch", label: "Lunch", start: "11:45", end: "12:30", kind: "break" },
  { id: "p5", label: "Period 5", start: "12:30", end: "13:15", kind: "teaching" }, { id: "p6", label: "Period 6", start: "13:15", end: "14:00", kind: "teaching" }, { id: "p7", label: "Period 7", start: "14:00", end: "14:45", kind: "teaching" },
];
export const DAYS = [{ n: 1, short: "Mon", label: "Monday" }, { n: 2, short: "Tue", label: "Tuesday" }, { n: 3, short: "Wed", label: "Wednesday" }, { n: 4, short: "Thu", label: "Thursday" }, { n: 5, short: "Fri", label: "Friday" }];

export interface Room { id: string; name: string; kind: "classroom" | "lab" | "hall"; capacity: number }
export interface TimetableEntry { id: ID; academicYearId: string; dayOfWeek: number; periodId: string; classId: ID; subjectId: string; teacherId: ID; roomId: string; status: "regular" | "cancelled" | "substituted" | "special" | "live-online"; meetingId?: ID; substituteTeacherId?: ID; note?: string; overrideReason?: string }
export interface Timetable { id: ID; label: string; status: "draft" | "published"; publishedAt?: ISODate; version: number }

export type ResultStatus = "draft" | "in-review" | "approved" | "published" | "withheld";
export interface MarksheetSubjectResult { subjectId: string; subjectName: string; maxMarks: number; internal: number; external: number; practical?: number; total: number; grade: string; status: "pass" | "fail" | "absent" | "exempt" | "withheld" | "incomplete"; remarks?: string }
export interface Marksheet {
  id: ID; studentId: ID; institutionId: ID; examId: string; examLabel: string; academicYearId: string; classLabel: string; subjects: MarksheetSubjectResult[];
  totalObtained: number; totalMax: number; percentage: number; gpa?: number; result: "Pass" | "Fail" | "Withheld"; publicationStatus: ResultStatus; publishedAt?: ISODate;
  reference: string; version: number; correctionNote?: string; revaluation?: { status: "none" | "requested" | "in-review" | "completed"; subjectId?: string };
  /** Set when a corrected version has been published; superseded sheets are never shown to students/parents. */ supersededBy?: ID; termId?: string;
}
