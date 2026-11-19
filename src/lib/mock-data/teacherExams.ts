import { inDays } from "@/lib/format";
import type { Rubric, TeacherExam } from "@/types/teacher";

const lv = (a: number, b: number, c: number, d: number) => [
  { label: "Exceeds", points: a, descriptor: "Consistently accurate with clear reasoning" }, { label: "Meets", points: b, descriptor: "Mostly accurate; reasoning present" },
  { label: "Approaching", points: c, descriptor: "Partly accurate; reasoning incomplete" }, { label: "Beginning", points: d, descriptor: "Needs support to attempt" }];
export const RUBRIC_SEED: Rubric[] = [
  { id: "rub-word", name: "Fraction word problems", subjectId: "sub-math", createdAt: inDays(-20), criteria: [
    { id: "c1", name: "Choosing the operation", description: "Identifies whether to add, subtract, multiply or divide", weight: 30, objectiveId: "lo-frac-word", bloom: "Apply", levels: lv(3, 2, 1, 0) },
    { id: "c2", name: "Accuracy of calculation", description: "Correct common denominators and simplification", weight: 40, objectiveId: "lo-frac-add", bloom: "Apply", levels: lv(4, 3, 2, 1) },
    { id: "c3", name: "Explaining the reasoning", description: "Shows working and explains each step", weight: 30, objectiveId: "lo-frac-word", bloom: "Analyse", levels: lv(3, 2, 1, 0) } ] },
  { id: "rub-story", name: "Short story writing", subjectId: "sub-eng", createdAt: inDays(-40), criteria: [
    { id: "c1", name: "Narrative arc", description: "Clear beginning, turning point and ending", weight: 40, objectiveId: "lo-story", bloom: "Create", levels: lv(8, 6, 4, 2) },
    { id: "c2", name: "Voice & vocabulary", description: "Varied sentences and vivid word choice", weight: 35, objectiveId: "lo-story", bloom: "Create", levels: lv(7, 5, 3, 1) },
    { id: "c3", name: "Conventions", description: "Spelling, grammar and punctuation", weight: 25, objectiveId: "lo-story", bloom: "Apply", levels: lv(5, 4, 2, 1) } ] },
];
export const EXAM_SEED: TeacherExam[] = [
  { id: "ex-term2-math", title: "Term 2 Mathematics — Unit 3 Test", classIds: ["cls-8b", "cls-8a"], paper: "Fractions & Linear Equations (40 marks)", startsAt: inDays(13, 9, 0), durationMin: 60, maxMarks: 40, accommodations: ["Extra 10 minutes (2 students)", "Reader support (1 student)"], status: "scheduled" },
  { id: "ex-frac-mid", title: "Fractions mid-chapter check", classIds: ["cls-8b"], paper: "Fractions mid-chapter (20 marks)", startsAt: inDays(-6, 11, 0), durationMin: 30, maxMarks: 20, accommodations: [], status: "results-in-review", resultNote: "Marks entered; awaiting your approval before release.",
    results: [{ studentId: "stu-ananya", marks: 17 }, { studentId: "stu-kabir", marks: 9 }, { studentId: "stu-zoya", marks: 15 }, { studentId: "stu-dev", marks: 19 }, { studentId: "stu-isha", marks: 14 }] },
];
