import { AI_TEACHERS } from "./core";
import { ago } from "@/lib/format";
import type { AITeacherRecord, AITeacherAssignment } from "@/types/teacher";

const classLabel: Record<string, string> = { "cls-8b": "Grade 8 · B", "cls-8a": "Grade 8 · A", "cls-7a": "Grade 7 · A", "cls-9c": "Grade 9 · C" };
const asg = (id: string, classId: string, by: string): AITeacherAssignment => ({
  id: `asg-${id}-${classId}`, targetType: "class", targetId: classId, targetLabel: classLabel[classId] ?? classId, functions: ["Answer questions", "Teach"], availability: "school-hours", status: "active", assignedAt: ago(20000), assignedBy: by,
});
const fb = (id: string, student: string, rating: number, comment: string, m: number) => ({ id, student, rating, comment, at: ago(m) });

const seeded: AITeacherRecord[] = AI_TEACHERS.map((t) => ({
  id: t.id, kind: "ai-teacher", name: t.name, subject: t.subject ?? "General", grade: t.grade, languages: t.languages, personality: t.personality, avatarColor: t.avatarColor,
  status: t.status, owner: t.owner, ownerType: t.ownerType, version: t.version, usage: t.usage, rating: t.rating, sources: t.sources, tools: t.tools,
  assignments: t.status === "approved" ? t.classes.map((c) => asg(t.id, c, t.owner)) : [], createdAt: ago(60000),
  submittedAt: t.status === "awaiting-approval" ? ago(500) : undefined, approvedBy: t.status === "approved" ? (t.ownerType === "government" ? "Karuvana State Education Dept." : "Principal's Office") : undefined,
  approvedAt: t.status === "approved" ? ago(40000) : undefined,
  feedback: t.status === "approved" ? [fb(`${t.id}-f1`, "Grade 8 student", 5, "Explained it step by step and didn't rush me.", 900), fb(`${t.id}-f2`, "Grade 7 student", 4, "Good, but I wanted one more example.", 3000)] : [],
  concerns: [], history: [{ at: ago(60000), text: "Created" }, ...(t.status === "approved" ? [{ at: ago(40000), text: "Approved for deployment" }] : [])],
}));

const extra: AITeacherRecord[] = [
  { id: "ait-gov-gyan", kind: "ai-teacher", name: "Gyan", subject: "Social Science", grade: "Grades 6–8", languages: ["English", "Hindi", "Tamil"], personality: "Story-led and balanced; presents multiple viewpoints", avatarColor: "#3B3AA8",
    status: "approved", owner: "Karuvana State Education Dept.", ownerType: "government", version: "v1.0", usage: 6240, rating: 4.5, sources: ["Karuvana Social Science Grade 7 & 8 (State Textbooks)"], tools: ["Answer questions", "Teach"],
    assignments: [], createdAt: ago(80000), approvedBy: "Karuvana State Education Dept.", approvedAt: ago(70000), feedback: [fb("gyan-f1", "Grade 8 student", 5, "The timeline stories made history easier.", 1500)], concerns: [], history: [{ at: ago(80000), text: "Published statewide" }] },
  { id: "ait-inst-sahay", kind: "ai-teacher", name: "Sahay", subject: "English", grade: "Grades 5–7", languages: ["English"], personality: "Encouraging writing coach; asks questions before giving answers", avatarColor: "#12805C",
    status: "suspended", owner: "Greenfield International School", ownerType: "institution", version: "v0.9", usage: 410, rating: 3.9, sources: ["Greenfield Writing Handbook"], tools: ["Give feedback", "Answer questions"],
    assignments: [], createdAt: ago(50000), approvedBy: "Principal's Office", approvedAt: ago(45000), suspendedReason: "Paused by institution pending review of a feedback-tone concern.",
    feedback: [fb("sahay-f1", "Grade 6 student", 3, "Feedback felt a bit blunt.", 4000)], concerns: [{ id: "con-1", text: "Feedback on a student story felt too blunt.", by: "Farah Siddiqui", at: ago(6000), status: "open" }], history: [{ at: ago(6000), text: "Suspended by institution" }] },
  { id: "ait-priya-coach", kind: "ai-teacher", name: "Fraction Coach", subject: "Mathematics", grade: "Grade 8", languages: ["English"], personality: "Calm, uses visual models first", avatarColor: "#7044D8",
    status: "draft", owner: "Priya Nair", ownerType: "teacher", ownerId: "tch-priya", version: "v0.1", usage: 0, rating: 0, sources: ["Fractions & Decimals, Made Friendly (course)"], tools: ["Answer questions", "Create practice tests"],
    assignments: [], createdAt: ago(1500), feedback: [], concerns: [], history: [{ at: ago(1500), text: "Draft created by Priya Nair" }] },
];
export const AI_TEACHER_SEED: AITeacherRecord[] = [...seeded, ...extra];
export const AI_TEACHER_TOOLS = ["Answer questions", "Teach", "Give feedback", "Create practice tests", "Explain mistakes", "Recommend resources"];
export const AI_TEACHER_SOURCES = ["Karuvana Maths Grade 8 (State Textbook)", "Fractions & Decimals, Made Friendly (course)", "Science Explorer Grade 8", "Greenfield Writing Handbook", "Vasant Grade 8", "Teacher-uploaded worksheets (Priya Nair)"];
