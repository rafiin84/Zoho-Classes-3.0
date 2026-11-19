import type { Rubric, RubricCriterion, TeacherExam } from "@/types/teacher";
import { EXAM_SEED, RUBRIC_SEED } from "../mock-data/teacherExams";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { notificationService } from "./notificationService";

/** Teacher-local exam scheduling + rubric library. (The campus exam service is separate and not depended on here.) */
const exams: TeacherExam[] = structuredClone(EXAM_SEED);
const rubrics: Rubric[] = structuredClone(RUBRIC_SEED);

export const teacherExamService = {
  listExams: () => simulate(() => [...exams].sort((a, b) => a.startsAt.localeCompare(b.startsAt))),
  createExam: (e: Omit<TeacherExam, "id" | "status">) => simulate(() => {
    if (!e.classIds.length) throw new ServiceError("Select at least one class.", "validation");
    const s = new Date(e.startsAt).getTime(), end = s + e.durationMin * 60000;
    const clash = exams.find((x) => x.status !== "completed" && x.classIds.some((c) => e.classIds.includes(c)) && s < new Date(x.startsAt).getTime() + x.durationMin * 60000 && end > new Date(x.startsAt).getTime());
    if (clash) throw new ServiceError(`Overlaps “${clash.title}” for the same class.`, "validation");
    const n: TeacherExam = { ...e, id: uid("ex"), status: "scheduled" }; exams.push(n);
    notificationService.push({ role: "student", category: "academic", title: "Exam scheduled", body: e.title, href: "/student/exams" }); return n;
  }),
  cancelExam: (id: string) => simulate(() => { const i = exams.findIndex((x) => x.id === id); if (i >= 0) exams.splice(i, 1); return true; }),
  approveResults: (id: string) => simulate(() => { const x = exams.find((e) => e.id === id)!; x.status = "results-approved"; x.resultNote = "Approved by teacher. Hand over to the institution for publication."; return x; }),
  listRubrics: () => simulate(() => rubrics),
  saveRubric: (r: Omit<Rubric, "id" | "createdAt"> & { id?: string }) => simulate(() => {
    const total = r.criteria.reduce((a, c) => a + c.weight, 0);
    if (total !== 100) throw new ServiceError(`Criterion weights must total 100% (currently ${total}%).`, "validation");
    if (r.id) { const x = rubrics.find((q) => q.id === r.id); if (x) { Object.assign(x, r); return x; } }
    const n: Rubric = { ...r, id: uid("rub"), createdAt: new Date().toISOString() }; rubrics.unshift(n); return n;
  }),
  duplicateRubric: (id: string) => simulate(() => { const x = rubrics.find((q) => q.id === id)!; const n: Rubric = { ...structuredClone(x), id: uid("rub"), name: `${x.name} (copy)`, createdAt: new Date().toISOString() }; rubrics.unshift(n); return n; }),
  deleteRubric: (id: string) => simulate(() => { const i = rubrics.findIndex((q) => q.id === id); if (i >= 0) rubrics.splice(i, 1); return true; }),
};
export type { RubricCriterion };
