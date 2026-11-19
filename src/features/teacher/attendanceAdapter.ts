// Seam over the shared attendanceService so Overview and Attendance screens agree, and student/parent views update.
import { attendanceService } from "@/lib/api/attendanceService";
import type { AttendanceStatus } from "@/types/attendance";
export type Mark = "P" | "A" | "L" | "E";
const toStatus: Record<Mark, AttendanceStatus> = { P: "present", A: "absent", L: "late", E: "excused" };
const toMark: Record<AttendanceStatus, Mark> = { present: "P", absent: "A", late: "L", excused: "E" };
export const attendanceAdapter = {
  /** Returns marks if this class/period has been submitted for the date, else null. */
  async get(classId: string, date: string, period: string): Promise<Record<string, Mark> | null> {
    const r = await attendanceService.forClass(classId, date);
    const s = r.periods.find((x) => x.period === period) ?? (period === "daily" ? r.daily : null);
    return s ? Object.fromEntries(s.marks.map((m) => [m.studentId, toMark[m.status]])) : null;
  },
  async submit(classId: string, date: string, period: string, marks: Record<string, Mark>, by = "teacher") {
    await attendanceService.submit(classId, date, period, Object.entries(marks).map(([studentId, m]) => ({ studentId, status: toStatus[m] })), by); return true;
  },
};
