import { DEMO_NOW } from "@/lib/format";
import type { TimetableEntry, Room, Marksheet } from "@/types/academic";
import { PERIODS } from "@/types/academic";

export const ROOMS: Room[] = [
  { id: "rm-8b", name: "Room 8B", kind: "classroom", capacity: 40 }, { id: "rm-8a", name: "Room 8A", kind: "classroom", capacity: 40 }, { id: "rm-7a", name: "Room 7A", kind: "classroom", capacity: 40 },
  { id: "rm-9c", name: "Room 9C", kind: "classroom", capacity: 40 }, { id: "rm-sci", name: "Science Lab", kind: "lab", capacity: 30 }, { id: "rm-cs", name: "Computer Lab 1", kind: "lab", capacity: 32 }, { id: "rm-hall", name: "Seminar Hall", kind: "hall", capacity: 120 },
];
const T = (day: number, period: string, classId: string, subjectId: string, teacherId: string, roomId: string, extra: Partial<TimetableEntry> = {}): TimetableEntry => ({ id: `tt-${classId}-${day}-${period}`, academicYearId: "ay-2026-27", dayOfWeek: day, periodId: period, classId, subjectId, teacherId, roomId, status: "regular", ...extra });
// Grade 8B weekly pattern
const b8 = ["sub-math", "sub-sci", "sub-eng", "sub-math", "sub-soc"];
const t8: Record<string, string> = { "sub-math": "tch-priya", "sub-sci": "tch-daniel", "sub-eng": "tch-farah", "sub-soc": "tch-arjun", "sub-cs": "tch-leela" };
const grid8b: TimetableEntry[] = [];
for (let d = 1; d <= 5; d++) {
  const subs = d === 3 ? ["sub-cs", "sub-math", "sub-sci", "sub-eng", "sub-hin", "sub-soc"] : [...b8, d % 2 ? "sub-cs" : "sub-hin"];
  ["p1", "p2", "p3", "p4", "p5", "p6"].forEach((p, i) => { const s = subs[i % subs.length]; grid8b.push(T(d, p, "cls-8b", s, t8[s] ?? "tch-farah", s === "sub-sci" ? "rm-sci" : s === "sub-cs" ? "rm-cs" : "rm-8b")); });
}
// Other classes (so teachers have personal timetables) + the seeded Daniel clash on Tue P4 (8B Science in lab vs 9C Science)
const other: TimetableEntry[] = [
  T(1, "p3", "cls-8a", "sub-math", "tch-priya", "rm-8a"), T(2, "p1", "cls-8a", "sub-math", "tch-priya", "rm-8a"), T(3, "p5", "cls-7a", "sub-math", "tch-priya", "rm-7a"), T(4, "p2", "cls-7a", "sub-math", "tch-priya", "rm-7a"), T(5, "p4", "cls-8a", "sub-math", "tch-priya", "rm-8a"),
  T(2, "p4", "cls-9c", "sub-sci", "tch-daniel", "rm-9c", { note: "Conflict: same teacher also scheduled in Grade 8B" }),
  T(1, "p5", "cls-9c", "sub-sci", "tch-daniel", "rm-sci"), T(4, "p3", "cls-9c", "sub-sci", "tch-daniel", "rm-sci"),
  T(1, "p1", "cls-8a", "sub-eng", "tch-farah", "rm-8a"), T(3, "p2", "cls-8a", "sub-eng", "tch-farah", "rm-8a"),
  T(2, "p5", "cls-7a", "sub-soc", "tch-arjun", "rm-7a"), T(4, "p5", "cls-5a", "sub-cs", "tch-leela", "rm-cs"),
];
export const TIMETABLE_SEED: TimetableEntry[] = [...grid8b, ...other];
export const PERIOD_IDS = PERIODS.filter((p) => p.kind === "teaching").map((p) => p.id);

const ms = (studentId: string, exam: string, rows: [string, string, number, number, number, string][], status: Marksheet["publicationStatus"], published?: string): Marksheet => {
  const subjects = rows.map(([subjectId, subjectName, internal, external, max, grade]) => ({ subjectId, subjectName, maxMarks: max, internal, external, total: internal + external, grade, status: "pass" as const }));
  const tot = subjects.reduce((a, s) => a + s.total, 0), mx = subjects.reduce((a, s) => a + s.maxMarks, 0);
  return { id: `ms-${studentId}-${exam}`, studentId, institutionId: "inst-greenfield", examId: exam, examLabel: exam === "t1" ? "Term 1 Examination" : "Term 2 Examination", academicYearId: "ay-2026-27", classLabel: "Grade 8 · B", subjects, totalObtained: tot, totalMax: mx, percentage: Math.round((tot / mx) * 1000) / 10, gpa: 8.6, result: "Pass", publicationStatus: status, publishedAt: published, reference: `DEMO-MS-${studentId.slice(4, 8).toUpperCase()}-${exam.toUpperCase()}`, version: 1, revaluation: { status: "none" } };
};
export const MARKSHEETS_SEED: Marksheet[] = [
  ms("stu-ananya", "t1", [["sub-math", "Mathematics", 18, 62, 100, "A"], ["sub-sci", "Science", 19, 70, 100, "A+"], ["sub-eng", "English", 17, 64, 100, "A"], ["sub-soc", "Social Science", 16, 60, 100, "B+"], ["sub-cs", "Computer Science", 19, 68, 100, "A+"]], "published", new Date(DEMO_NOW.getTime() - 40 * 864e5).toISOString()),
  ms("stu-ananya", "t2", [["sub-math", "Mathematics", 17, 0, 100, "—"], ["sub-sci", "Science", 18, 0, 100, "—"]], "draft"),
  ms("stu-kabir", "t1", [["sub-math", "Mathematics", 11, 36, 100, "C"], ["sub-sci", "Science", 15, 56, 100, "B+"], ["sub-eng", "English", 14, 52, 100, "B"], ["sub-soc", "Social Science", 13, 50, 100, "B"], ["sub-cs", "Computer Science", 16, 60, 100, "A"]], "published", new Date(DEMO_NOW.getTime() - 40 * 864e5).toISOString()),
  ms("stu-vihaan", "t1", [["sub-math", "Mathematics", 18, 66, 100, "A"], ["sub-sci", "Science", 17, 60, 100, "A"], ["sub-eng", "English", 19, 70, 100, "A+"]], "published", new Date(DEMO_NOW.getTime() - 40 * 864e5).toISOString()),
];
