import type { ID } from "./index";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export interface AttendanceMark { studentId: ID; status: AttendanceStatus; note?: string }
/** `period` is "daily", a period id (p1..p7) or "live:<meetingId>" for live-class snapshots. */
export interface AttendanceSession { id: ID; classId: ID; date: string; period: string; marks: AttendanceMark[]; submittedBy: string; submittedAt: string; source: "teacher" | "live-class" }
export interface AttendanceDay { date: string; status: AttendanceStatus | "holiday" | "weekend" | "not-taken" | "future"; holidayName?: string; periods: { period: string; status: AttendanceStatus }[]; note?: string }
export interface AttendanceSummary { present: number; absent: number; late: number; excused: number; workingDays: number; recorded: number; percent: number | null; from: string; to: string }
