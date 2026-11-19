import type { AttendanceSession, AttendanceMark, AttendanceDay, AttendanceSummary, AttendanceStatus } from "@/types/attendance";
import { buildAttendanceSeed, HOLIDAYS, isWeekend, isoDay, TODAY, SCHOOL_START } from "../mock-data/attendance";
import { STUDENTS, CLASSROOMS } from "../mock-data/core";
import { simulate } from "./latency";
import { uid } from "../utils";
import { notificationService } from "./notificationService";

const sessions: AttendanceSession[] = buildAttendanceSeed();
const classOf = (studentId: string) => STUDENTS.find((s) => s.id === studentId)?.classId;
const dailyMark = (studentId: string, date: string): { status: AttendanceStatus; periods: AttendanceDay["periods"]; note?: string } | null => {
  const cid = classOf(studentId); const all = sessions.filter((s) => s.classId === cid && s.date === date && !s.period.startsWith("live:"));
  const daily = all.find((s) => s.period === "daily"); const periods = all.filter((s) => s.period !== "daily").map((s) => ({ period: s.period, status: s.marks.find((m) => m.studentId === studentId)?.status as AttendanceStatus })).filter((p) => p.status).sort((a, b) => a.period.localeCompare(b.period));
  const m = daily?.marks.find((x) => x.studentId === studentId);
  if (m) return { status: m.status, periods, note: m.note };
  if (periods.length) { const absent = periods.filter((p) => p.status === "absent").length; return { status: absent === periods.length ? "absent" : periods[0].status === "late" ? "late" : "present", periods }; }
  return null;
};
function summarise(studentId: string, from: string, to: string): AttendanceSummary {
  let present = 0, absent = 0, late = 0, excused = 0, workingDays = 0;
  for (let d = new Date(from + "T00:00:00Z"); isoDay(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = isoDay(d); if (isWeekend(date) || HOLIDAYS[date] || date > TODAY) continue; workingDays++;
    const m = dailyMark(studentId, date); if (!m) continue;
    if (m.status === "present") present++; else if (m.status === "late") late++; else if (m.status === "absent") absent++; else excused++;
  }
  const recorded = present + late + absent + excused;
  return { present, absent, late, excused, workingDays, recorded, percent: recorded ? Math.round(((present + late + excused) / recorded) * 1000) / 10 : null, from, to };
}

/** Shared by the student/parent attendance screens and the teacher register. Teacher submissions are immediately visible to students and parents. */
export const attendanceService = {
  roster: (classId: string) => simulate(() => STUDENTS.filter((s) => s.classId === classId).map((s) => ({ id: s.id, name: s.displayName, color: s.avatarColor }))),
  /** Everything recorded for a class on a date: the daily register and any period registers. `taken` is false until a teacher submits. */
  forClass: (classId: string, date: string) => simulate(() => {
    const day = sessions.filter((s) => s.classId === classId && s.date === date); const daily = day.find((s) => s.period === "daily");
    return { classId, date, taken: !!daily, daily: daily ?? null, periods: day.filter((s) => s.period !== "daily" && !s.period.startsWith("live:")), live: day.filter((s) => s.period.startsWith("live:")), roster: STUDENTS.filter((s) => s.classId === classId).map((s) => ({ id: s.id, name: s.displayName })) };
  }),
  /** Month calendar + summary. `month` is "YYYY-MM". */
  forStudent: (studentId: string, month: string) => simulate(() => {
    const [y, mo] = month.split("-").map(Number); const days: AttendanceDay[] = []; const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    for (let i = 1; i <= last; i++) {
      const date = `${month}-${String(i).padStart(2, "0")}`;
      if (isWeekend(date)) { days.push({ date, status: "weekend", periods: [] }); continue; }
      if (HOLIDAYS[date]) { days.push({ date, status: "holiday", holidayName: HOLIDAYS[date], periods: [] }); continue; }
      if (date > TODAY) { days.push({ date, status: "future", periods: [] }); continue; }
      const m = dailyMark(studentId, date); days.push(m ? { date, status: m.status, periods: m.periods, note: m.note } : { date, status: "not-taken", periods: [] });
    }
    const monthEnd = `${month}-${String(last).padStart(2, "0")}`;
    return { month, days, summary: summarise(studentId, `${month}-01`, monthEnd > TODAY ? TODAY : monthEnd), term: summarise(studentId, SCHOOL_START, TODAY), today: dailyMark(studentId, TODAY) };
  }),
  summaryFor: (studentId: string, from: string, to: string) => simulate(() => summarise(studentId, from, to)),
  /** period: "daily" | "p1".."p7". Replaces any existing register for that class/date/period. */
  submit: (classId: string, date: string, period: string, marks: AttendanceMark[], submittedBy = "teacher") => simulate(() => {
    const i = sessions.findIndex((s) => s.classId === classId && s.date === date && s.period === period); if (i >= 0) sessions.splice(i, 1);
    const s: AttendanceSession = { id: uid("att"), classId, date, period, marks, submittedBy, submittedAt: new Date().toISOString(), source: "teacher" }; sessions.push(s);
    marks.filter((m) => m.status === "absent").forEach((m) => { const st = STUDENTS.find((x) => x.id === m.studentId); if (st?.parentIds.length) notificationService.push({ role: "parent", childId: st.id, category: "academic", title: `${st.displayName.split(" ")[0]} was marked absent`, body: `${date} · ${period === "daily" ? "Daily register" : period.toUpperCase()}`, href: "/parent/attendance", private: true }); });
    return s;
  }, { ms: 400 }),
  /** Live-class snapshot (called by liveClassService when a class ends). */
  recordLive: (meetingId: string, classIds: string[], present: { id: string; minutes: number }[], submittedBy: string) => {
    const date = TODAY;
    classIds.forEach((classId) => {
      const roster = STUDENTS.filter((s) => s.classId === classId); const period = `live:${meetingId}`;
      const i = sessions.findIndex((s) => s.classId === classId && s.period === period); if (i >= 0) sessions.splice(i, 1);
      sessions.push({ id: uid("att"), classId, date, period, submittedBy, submittedAt: new Date().toISOString(), source: "live-class", marks: roster.map((s) => { const p = present.find((x) => x.id === s.id); return { studentId: s.id, status: !p ? "absent" : p.minutes < 10 ? "late" : "present", note: p ? `${p.minutes} min in class` : "Did not join" }; }) });
    });
  },
  liveSessions: (classId?: string) => simulate(() => sessions.filter((s) => s.period.startsWith("live:") && (!classId || s.classId === classId))),
  summaryForInstitution: () => simulate(() => {
    const byClass = CLASSROOMS.filter((c) => STUDENTS.some((s) => s.classId === c.id)).map((c) => {
      const roster = STUDENTS.filter((s) => s.classId === c.id); const today = sessions.find((s) => s.classId === c.id && s.date === TODAY && s.period === "daily");
      const month = roster.map((s) => summarise(s.id, "2026-11-01", TODAY)); const rec = month.reduce((a, m) => a + m.recorded, 0), ok = month.reduce((a, m) => a + m.present + m.late + m.excused, 0);
      return { classId: c.id, label: c.name, students: roster.length, takenToday: !!today, presentToday: today ? today.marks.filter((m) => m.status !== "absent").length : null, absentToday: today ? today.marks.filter((m) => m.status === "absent").length : null, monthPercent: rec ? Math.round((ok / rec) * 1000) / 10 : null };
    });
    const taken = byClass.filter((c) => c.takenToday); const students = taken.reduce((a, c) => a + c.students, 0), present = taken.reduce((a, c) => a + (c.presentToday ?? 0), 0);
    return { date: TODAY, classes: byClass.length, takenToday: taken.length, pendingToday: byClass.length - taken.length, percentToday: students ? Math.round((present / students) * 1000) / 10 : null, byClass, lowAttendance: STUDENTS.map((s) => ({ studentId: s.id, name: s.displayName, classId: s.classId, percent: summarise(s.id, SCHOOL_START, TODAY).percent })).filter((x) => x.percent !== null && x.percent < 90).sort((a, b) => (a.percent ?? 0) - (b.percent ?? 0)) };
  }),
};
