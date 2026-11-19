import type { AttendanceSession, AttendanceStatus } from "@/types/attendance";
import { STUDENTS, CLASSROOMS } from "./core";

export const HOLIDAYS: Record<string, string> = { "2026-10-02": "Gandhi Jayanti", "2026-10-20": "Dussehra break (demo)", "2026-11-09": "Festival holiday (demo)", "2026-11-14": "Children's Day programme" };
export const SCHOOL_START = "2026-08-03";
export const isoDay = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
export const isWeekend = (iso: string) => { const d = new Date(iso + "T00:00:00Z").getUTCDay(); return d === 0 || d === 6; };
export const TODAY = "2026-11-19";

const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
const PROFILE: Record<string, { absent: number; late: number; excused: number }> = { "stu-ananya": { absent: 0.015, late: 0.03, excused: 0.02 }, "stu-kabir": { absent: 0.07, late: 0.08, excused: 0.02 }, "stu-vihaan": { absent: 0.01, late: 0.01, excused: 0.01 } };
const dflt = { absent: 0.03, late: 0.04, excused: 0.02 };
const pick = (sid: string, date: string): AttendanceStatus => { const r = hash(sid + date), p = PROFILE[sid] ?? dflt; return r < p.absent ? "absent" : r < p.absent + p.excused ? "excused" : r < p.absent + p.excused + p.late ? "late" : "present"; };

const PERIODS = ["p1", "p2", "p3", "p4", "p5", "p6"];
export function buildAttendanceSeed(): AttendanceSession[] {
  const out: AttendanceSession[] = []; const end = new Date(TODAY + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() - 1);
  for (let d = new Date(SCHOOL_START + "T00:00:00Z"); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = isoDay(d); if (isWeekend(date) || HOLIDAYS[date]) continue;
    const recent = (end.getTime() - d.getTime()) / 864e5 < 14;
    for (const c of CLASSROOMS) {
      const roster = STUDENTS.filter((s) => s.classId === c.id); if (!roster.length) continue;
      const daily = roster.map((s) => ({ studentId: s.id, status: pick(s.id, date) }));
      const teacher = c.teacherId;
      out.push({ id: `att-${c.id}-${date}-daily`, classId: c.id, date, period: "daily", marks: daily, submittedBy: teacher, submittedAt: `${date}T09:00:00+05:30`, source: "teacher" });
      if (recent) PERIODS.forEach((p, i) => out.push({ id: `att-${c.id}-${date}-${p}`, classId: c.id, date, period: p, submittedBy: teacher, submittedAt: `${date}T0${Math.min(9, 8 + i)}:30:00+05:30`, source: "teacher",
        marks: daily.map((m) => ({ studentId: m.studentId, status: m.status === "late" && i > 0 ? "present" : m.status === "absent" || m.status === "excused" ? m.status : hash(m.studentId + date + p) < 0.015 ? "absent" : m.status })) }));
    }
  }
  return out;
}
