import type { Role } from "@/types";

export interface DemoScenario {
  id: string; label: string; role: Role; description: string;
  studentId: string; childId: string; teacherId: string; institutionId: string; startSlug: string;
  /** hints other features may read: e.g. 'teacher-conflict' makes the timetable show a pre-seeded clash */
  flags: string[];
}
export const SCENARIOS: DemoScenario[] = [
  { id: "student-thriving", label: "Student · thriving, active streak", role: "student", description: "Ananya Rao, Grade 8B — 12-day streak, strong in science.", studentId: "stu-ananya", childId: "stu-ananya", teacherId: "tch-priya", institutionId: "inst-greenfield", startSlug: "home", flags: ["thriving"] },
  { id: "student-gap", label: "Student · maths gap + remedial plan", role: "student", description: "Kabir Mehta, Grade 8B — fractions gap with an active remedial path.", studentId: "stu-kabir", childId: "stu-kabir", teacherId: "tch-priya", institutionId: "inst-greenfield", startSlug: "home", flags: ["maths-gap"] },
  { id: "student-new", label: "Student · new enrollee, baseline pending", role: "student", description: "Meera Iyer, Grade 8B — just joined; mandatory baseline pending.", studentId: "stu-meera", childId: "stu-meera", teacherId: "tch-priya", institutionId: "inst-greenfield", startSlug: "home", flags: ["new-student", "baseline-pending"] },
  { id: "teacher-doubts", label: "Teacher · pending doubts & grading queue", role: "teacher", description: "Priya Nair — open doubts and AI-graded submissions waiting for review.", studentId: "stu-ananya", childId: "stu-ananya", teacherId: "tch-priya", institutionId: "inst-greenfield", startSlug: "overview", flags: ["pending-doubts"] },
  { id: "teacher-conflict", label: "Teacher · timetable conflict to resolve", role: "teacher", description: "Daniel Okafor — double-booked in Period 4 on Tuesday.", studentId: "stu-ananya", childId: "stu-ananya", teacherId: "tch-daniel", institutionId: "inst-greenfield", startSlug: "timetable", flags: ["timetable-conflict"] },
  { id: "institution-declining", label: "Institution · branch with declining engagement", role: "institution", description: "Lakeside Campus engagement dipped 14% this month.", studentId: "stu-ananya", childId: "stu-ananya", teacherId: "tch-priya", institutionId: "inst-greenfield", startSlug: "overview", flags: ["declining-branch"] },
  { id: "government-low-baseline", label: "Government · district with low baseline coverage", role: "government", description: "Nilgiri Hills district has 41% baseline coverage.", studentId: "stu-ananya", childId: "stu-ananya", teacherId: "tch-priya", institutionId: "inst-greenfield", startSlug: "overview", flags: ["low-baseline"] },
  { id: "parent-fee-reply", label: "Parent · fee installment + new teacher reply", role: "parent", description: "Rohan Rao — Term 2 installment due, new reply from Mrs. Nair.", studentId: "stu-ananya", childId: "stu-ananya", teacherId: "tch-priya", institutionId: "inst-greenfield", startSlug: "home", flags: ["fee-due", "teacher-reply"] },
];
export const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
