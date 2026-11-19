import type { Assignment, AssignmentSubmission } from "@/types";
import { ASSIGNMENTS } from "../mock-data/content";
import { simulate } from "./latency";
import { uid } from "../utils";
import { inDays } from "../format";
import { track } from "../analytics";

const assignments: Assignment[] = structuredClone(ASSIGNMENTS);
const subs: AssignmentSubmission[] = [
  { id: "sub-a1", assignmentId: "asg-story", studentId: "stu-ananya", status: "graded", text: "The lights went out at 7:42 PM…", attachments: [], submittedAt: inDays(-4, 18), marks: 17, feedback: "Lovely turning point and a vivid ending. Work on varying sentence length.", releaseStatus: "released", resubmissions: 0 },
  { id: "sub-a2", assignmentId: "asg-linear", studentId: "stu-ananya", status: "submitted", attachments: [{ name: "linear-set.jpg", kind: "image" }], submittedAt: inDays(-8, 16), draftAiMarks: 26, marks: undefined, releaseStatus: "unreleased", resubmissions: 0 },
  { id: "sub-a3", assignmentId: "asg-story", studentId: "stu-kabir", status: "submitted", text: "It was dark and then…", attachments: [], submittedAt: inDays(-3, 15), draftAiMarks: 11, releaseStatus: "unreleased", resubmissions: 0 },
  { id: "sub-a4", assignmentId: "asg-linear", studentId: "stu-kabir", status: "overdue", attachments: [], releaseStatus: "unreleased", resubmissions: 0 },
];
const statusFor = (a: Assignment, studentId: string): AssignmentSubmission => subs.find((s) => s.assignmentId === a.id && s.studentId === studentId) ?? { id: `virt-${a.id}-${studentId}`, assignmentId: a.id, studentId, status: new Date(a.dueAt) < new Date("2026-11-19T10:30:00+05:30") ? "overdue" : "todo", attachments: [], releaseStatus: "unreleased", resubmissions: 0 };

export const assignmentService = {
  forStudent: (studentId: string) => simulate(() => assignments.map((a) => { const s = statusFor(a, studentId); // marks stay hidden until released
    return { assignment: a, submission: { ...s, marks: s.releaseStatus === "released" ? s.marks : undefined, feedback: s.releaseStatus === "released" ? s.feedback : undefined, draftAiMarks: undefined } }; })),
  get: (id: string, studentId: string) => simulate(() => { const a = assignments.find((x) => x.id === id)!; const s = statusFor(a, studentId); return { assignment: a, submission: { ...s, marks: s.releaseStatus === "released" ? s.marks : undefined, feedback: s.releaseStatus === "released" ? s.feedback : undefined, draftAiMarks: undefined } }; }),
  saveDraft: (assignmentId: string, studentId: string, text: string, attachments: { name: string; kind: string }[]) => simulate(() => { let s = subs.find((x) => x.assignmentId === assignmentId && x.studentId === studentId); if (!s) { s = { id: uid("sub"), assignmentId, studentId, status: "draft", attachments: [], releaseStatus: "unreleased", resubmissions: 0 }; subs.push(s); } s.text = text; s.attachments = attachments; if (s.status === "todo") s.status = "draft"; return true; }, { ms: 150 }),
  submit: (assignmentId: string, studentId: string, text: string, attachments: { name: string; kind: string }[]) => simulate(() => { let s = subs.find((x) => x.assignmentId === assignmentId && x.studentId === studentId); if (!s) { s = { id: uid("sub"), assignmentId, studentId, status: "submitted", attachments: [], releaseStatus: "unreleased", resubmissions: 0 }; subs.push(s); } else if (s.status === "returned") s.resubmissions++; s.text = text; s.attachments = attachments; s.status = "submitted"; s.submittedAt = new Date().toISOString(); track("assignment_submitted", { assignmentId }); return s; }),
  // teacher side
  list: () => simulate(() => assignments),
  create: (a: Omit<Assignment, "id">) => simulate(() => { const n = { ...a, id: uid("asg") }; assignments.unshift(n); return n; }),
  submissionsFor: (assignmentId: string) => simulate(() => subs.filter((s) => s.assignmentId === assignmentId)),
  allSubmissions: () => simulate(() => subs),
  /** Teacher grading: marks stay hidden from students until released. */
  grade: (submissionId: string, marks: number, feedback: string, release: boolean) => simulate(() => { const s = subs.find((x) => x.id === submissionId)!; s.marks = marks; s.feedback = feedback; s.status = release ? "graded" : "returned"; s.releaseStatus = release ? "released" : "unreleased"; return s; }),
};
