// Seed for calendar, staff availability, period requirements and audit history. ALL FICTIONAL DEMO DATA.
import { ago } from "@/lib/format";
import type { AcademicCalendar, AllocationAudit, PeriodRequirement, StaffProfile } from "@/types/timetable";

export const CALENDAR: AcademicCalendar = {
  yearId: "ay-2026-27", label: "2026–27", workingDays: [1, 2, 3, 4, 5], weekStart: "2026-11-16",
  terms: [
    { id: "t1", label: "Term 1", start: "2026-06-01", end: "2026-09-30", kind: "term" },
    { id: "t1-exam", label: "Term 1 examinations", start: "2026-09-21", end: "2026-09-30", kind: "exam-window" },
    { id: "t2", label: "Term 2", start: "2026-10-12", end: "2027-01-22", kind: "term" },
    { id: "t2-exam", label: "Term 2 examinations", start: "2027-01-11", end: "2027-01-22", kind: "exam-window" },
  ],
  holidays: [
    { id: "h1", date: "2026-11-12", label: "Diwali break" }, { id: "h2", date: "2026-11-26", label: "Founders' Day" },
    { id: "h3", date: "2026-12-25", label: "Christmas Day" }, { id: "h4", date: "2027-01-01", label: "New Year's Day" },
  ],
};

export const PROFILES_SEED: StaffProfile[] = [
  { teacherId: "tch-priya", slots: [{ dayOfWeek: 5, periodId: "p7", kind: "blocked" }, { dayOfWeek: 1, periodId: "p1", kind: "preferred" }], leaves: [], maxPerDay: 6, note: "Mathematics coordinator, Tuesday P7 remedial clinic." },
  { teacherId: "tch-daniel", slots: [{ dayOfWeek: 1, periodId: "p7", kind: "blocked" }, { dayOfWeek: 2, periodId: "p1", kind: "preferred" }], leaves: [], maxPerDay: 6, note: "Travels between North and Lakeside campuses; needs a buffer after P2." },
  { teacherId: "tch-farah", slots: [{ dayOfWeek: 3, periodId: "p7", kind: "blocked" }], leaves: [], maxPerDay: 6 },
  { teacherId: "tch-arjun", slots: [], leaves: [{ id: "lv-arjun-1", teacherId: "tch-arjun", from: "2026-11-20", to: "2026-11-20", reason: "Medical appointment", status: "approved" }], maxPerDay: 5 },
  { teacherId: "tch-leela", slots: [{ dayOfWeek: 5, periodId: "p6", kind: "preferred" }, { dayOfWeek: 5, periodId: "p7", kind: "blocked" }], leaves: [{ id: "lv-leela-1", teacherId: "tch-leela", from: "2026-11-30", to: "2026-12-02", reason: "Conference", status: "requested" }], maxPerDay: 5 },
  { teacherId: "tch-sameer", slots: [], leaves: [{ id: "lv-sameer-1", teacherId: "tch-sameer", from: "2026-11-09", to: "2026-12-18", reason: "Extended medical leave", status: "approved" }], maxPerDay: 6 },
];

/** 8B requirements are derived from the seeded grid (fully fulfilled); these are the others. */
export const REQUIREMENTS_OTHER: PeriodRequirement[] = [
  { id: "rq-8a-math", classId: "cls-8a", subjectId: "sub-math", periodsPerWeek: 3, roomKind: "classroom" },
  { id: "rq-8a-eng", classId: "cls-8a", subjectId: "sub-eng", periodsPerWeek: 2, roomKind: "classroom" },
  { id: "rq-8a-sci", classId: "cls-8a", subjectId: "sub-sci", periodsPerWeek: 2, roomKind: "lab" },
  { id: "rq-8a-cs", classId: "cls-8a", subjectId: "sub-cs", periodsPerWeek: 1, roomKind: "lab" },
  { id: "rq-7a-math", classId: "cls-7a", subjectId: "sub-math", periodsPerWeek: 2, roomKind: "classroom" },
  { id: "rq-7a-soc", classId: "cls-7a", subjectId: "sub-soc", periodsPerWeek: 1, roomKind: "classroom" },
  { id: "rq-7a-eng", classId: "cls-7a", subjectId: "sub-eng", periodsPerWeek: 2, roomKind: "classroom" },
  { id: "rq-9c-sci", classId: "cls-9c", subjectId: "sub-sci", periodsPerWeek: 3, roomKind: "lab" },
  { id: "rq-5a-cs", classId: "cls-5a", subjectId: "sub-cs", periodsPerWeek: 1, roomKind: "lab" },
];

export const AUDIT_SEED: AllocationAudit[] = [
  { id: "au-1", at: ago(60 * 24 * 9), by: "Timetable office", action: "publish", detail: "Published Term 2 timetable v1 (opening week)." },
  { id: "au-2", at: ago(60 * 24 * 3), by: "Timetable office", action: "leave", detail: "Approved leave for Arjun Menon on 20 Nov 2026 (Medical appointment).", reason: "Leave approved; substitute still to be assigned." },
];
