import type { DoubtThread, DoubtStatus, DoubtMessage } from "@/types";
import { DOUBTS } from "../mock-data/engagement";
import { simulate } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { notificationService } from "./notificationService";

const threads: DoubtThread[] = structuredClone(DOUBTS);

export const doubtService = {
  forStudent: (studentId: string) => simulate(() => threads.filter((t) => t.studentId === studentId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  forTeacher: (teacherId: string) => simulate(() => threads.filter((t) => t.teacherId === teacherId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  all: () => simulate(() => threads),
  get: (id: string) => simulate(() => threads.find((t) => t.id === id) ?? null),
  create: (p: { studentId: string; teacherId: string; title: string; text: string; subjectId: string; courseId?: string; lessonId?: string; questionId?: string; context?: string; kind?: DoubtMessage["kind"]; attachments?: DoubtMessage["attachments"]; escalatedFromTutor?: boolean }) => simulate(() => {
    const now = new Date().toISOString();
    const t: DoubtThread = { id: uid("dbt"), studentId: p.studentId, teacherId: p.teacherId, courseId: p.courseId, lessonId: p.lessonId, questionId: p.questionId, title: p.title, context: p.context, subjectId: p.subjectId, status: "open", createdAt: now, updatedAt: now, escalatedFromTutor: p.escalatedFromTutor,
      messages: [{ id: uid("dm"), authorId: p.studentId, authorRole: "student", text: p.text, at: now, kind: p.kind ?? "text", attachments: p.attachments ?? [] }] };
    threads.unshift(t);
    notificationService.push({ role: "teacher", category: "communication", title: "New doubt from a student", body: p.title, href: "/teacher/doubts" });
    track("doubt_submitted", { threadId: t.id });
    return t;
  }),
  reply: (id: string, authorRole: "student" | "teacher", authorId: string, text: string, kind: DoubtMessage["kind"] = "text", attachments: DoubtMessage["attachments"] = []) => simulate(() => {
    const t = threads.find((x) => x.id === id)!;
    t.messages.push({ id: uid("dm"), authorId, authorRole, text, at: new Date().toISOString(), kind, attachments });
    t.updatedAt = new Date().toISOString();
    t.status = authorRole === "teacher" ? "answered" : "follow-up";
    if (authorRole === "teacher") notificationService.push({ role: "student", recipientId: t.studentId, category: "communication", title: "Your teacher replied to your doubt", body: t.title, href: `/student/doubts/${t.id}` });
    else notificationService.push({ role: "teacher", category: "communication", title: "Follow-up on a doubt", body: t.title, href: "/teacher/doubts" });
    return t;
  }),
  setStatus: (id: string, status: DoubtStatus) => simulate(() => { const t = threads.find((x) => x.id === id)!; t.status = status; t.updatedAt = new Date().toISOString(); if (status === "resolved") track("doubt_resolved", { id }); return t; }),
  reassign: (id: string, teacherId: string) => simulate(() => { const t = threads.find((x) => x.id === id)!; t.teacherId = teacherId; return t; }),
};
