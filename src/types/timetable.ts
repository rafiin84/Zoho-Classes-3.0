import type { ID, ISODate } from "./index";
import type { TimetableEntry } from "./academic";

/** Academic calendar, staff availability, allocation, conflicts and change-management contracts (Academic Ops · timetable). */
export interface AcademicTerm { id: string; label: string; start: string; end: string; kind: "term" | "exam-window" }
export interface Holiday { id: string; date: string; label: string }
export interface AcademicCalendar { yearId: string; label: string; terms: AcademicTerm[]; holidays: Holiday[]; workingDays: number[]; weekStart: string }

export interface LeaveRecord { id: ID; teacherId: ID; from: string; to: string; reason: string; status: "requested" | "approved" | "rejected" }
export interface AvailabilitySlot { dayOfWeek: number; periodId: string; kind: "blocked" | "preferred" }
export interface StaffProfile { teacherId: ID; slots: AvailabilitySlot[]; leaves: LeaveRecord[]; maxPerDay: number; note?: string }
export interface PeriodRequirement { id: ID; classId: ID; subjectId: string; periodsPerWeek: number; roomKind: "classroom" | "lab" }

export type ConflictKind = "teacher-double" | "class-double" | "room-double" | "teacher-unavailable" | "qualification" | "workload" | "unfulfilled";
export interface Conflict {
  id: string; kind: ConflictKind; severity: "error" | "warning"; message: string; entryIds: ID[];
  teacherId?: ID; classId?: ID; subjectId?: string; dayOfWeek?: number; periodId?: string;
}
export interface EntryPatch { teacherId?: ID; roomId?: string; dayOfWeek?: number; periodId?: string; subjectId?: string }
export interface Suggestion { id: string; kind: "teacher" | "slot" | "room"; label: string; detail: string; entryId: ID; patch: EntryPatch }

export interface AssignOp { classId: ID; dayOfWeek: number; periodId: string; subjectId: string; teacherId: ID; roomId: string }
export interface ConflictPreview { newConflicts: Conflict[]; requiresReason: boolean }

export type AuditAction = "assign" | "move" | "unassign" | "override" | "publish" | "reset" | "suggestion-applied" | "auto-allocation" | "substitute" | "leave" | "availability" | "change-proposed" | "change-approved" | "change-rejected";
export interface AllocationAudit { id: ID; at: ISODate; by: string; action: AuditAction; detail: string; reason?: string; conflicts?: string[] }

export interface TimetableVersion { version: number; publishedAt: ISODate; publishedBy: string; note: string; entries: TimetableEntry[]; acknowledgedConflicts: number }
export interface TimetableMeta { version: number; publishedAt?: ISODate; hasDraftChanges: boolean; draftConflictCount: number; draftErrorCount: number; status: "published" | "draft-ahead" }

export type ChangeKind = "move" | "teacher" | "room" | "cancel" | "substitute" | "special";
export interface ChangeRequest {
  kind: ChangeKind; entryId?: ID; reason: string;
  dayOfWeek?: number; periodId?: string; teacherId?: ID; roomId?: string; substituteTeacherId?: ID;
  /** For "special" sessions */
  special?: { classId: ID; subjectId: string; title: string };
}
export interface ChangeAffected { classIds: ID[]; teacherIds: ID[]; roomIds: string[]; students: number }
export interface ChangeProposal {
  id: ID; request: ChangeRequest; proposedBy: string; proposedByRole: "teacher" | "institution"; createdAt: ISODate; status: "proposed" | "approved" | "rejected";
  summary: string; affected: ChangeAffected; conflicts: Conflict[]; before?: TimetableEntry; decidedAt?: ISODate; decidedBy?: string; decisionNote?: string;
}

export interface TeacherWorkload { teacherId: ID; periods: number; limit: number; pct: number; byDay: number[]; substitutions: number; classCount: number; flag: "over" | "balanced" | "under" }
export interface Gap { classId: ID; subjectId: string; required: number; assigned: number; missing: number }
export interface SuggestedEntry { id: string; entry: TimetableEntry; reason: string }
export interface AllocationPreview { proposed: SuggestedEntry[]; remaining: Gap[] }
export interface WorkspaceSnapshot { entries: TimetableEntry[]; conflicts: Conflict[]; workload: TeacherWorkload[]; gaps: Gap[]; meta: TimetableMeta }
export interface ReportsData {
  byTeacher: { teacherId: ID; periods: number; classes: number; subjects: number }[]; coverage: { classId: ID; fulfilledPct: number; assigned: number; required: number }[];
  unassigned: number; conflictCount: number; substitutes: { entryId: ID; label: string; substituteId: ID }[];
  rooms: { roomId: string; name: string; used: number; capacity: number; pct: number }[]; history: AllocationAudit[];
}
