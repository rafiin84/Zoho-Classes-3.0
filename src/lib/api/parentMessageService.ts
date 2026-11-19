import type { ParentConversation, ParentMessage, ParentRecipient } from "@/types/parentMessages";
import { TEACHERS, STUDENTS, CLASSROOMS, SUBJECTS, teacherName } from "../mock-data/core";
import { TIMETABLE_SEED } from "../mock-data/academic";
import { ago } from "../format";
import { simulate, ServiceError } from "./latency";
import { notificationService } from "./notificationService";
import { uid } from "../utils";

/** Parent–teacher messaging ONLY. Separate from staff chat and student doubts. */
const M = (id: string, role: "parent" | "teacher", authorId: string, authorName: string, text: string, min: number, readT = true, readP = true, attachments: ParentMessage["attachments"] = []): ParentMessage => ({ id, authorRole: role, authorId, authorName, text, at: ago(min), attachments, readByParent: readP, readByTeacher: readT });
const convs: ParentConversation[] = [
  { id: "pc-1", childId: "stu-ananya", parentId: "par-rohan", teacherId: "tch-priya", teacherName: teacherName("tch-priya"), teacherRole: "Class teacher · Mathematics", subjectId: "sub-math", topic: "How is Ananya doing with fractions?", status: "open", createdAt: ago(3000), updatedAt: ago(90), messages: [
    M("pm1", "parent", "par-rohan", "Rohan Rao", "Hello Mrs. Nair, Ananya says dividing fractions is tricky. Is there something we can practise at home?", 3000),
    M("pm2", "teacher", "tch-priya", teacherName("tch-priya"), "Hello Mr. Rao. Ananya is doing well overall. Dividing by a fraction is the one idea to revisit: the 'flip and multiply' rule. I've added a short practice set to her Learn tab, about 10 minutes, twice this week would be plenty.", 90, true, false) ] },
  { id: "pc-2", childId: "stu-ananya", parentId: "par-rohan", teacherId: "tch-farah", teacherName: teacherName("tch-farah"), teacherRole: "English teacher", subjectId: "sub-eng", topic: "Short story feedback", status: "open", createdAt: ago(7000), updatedAt: ago(6200), messages: [
    M("pm3", "parent", "par-rohan", "Rohan Rao", "Thank you for the feedback on the story. Could Ananya resubmit with a longer ending?", 7000),
    M("pm4", "teacher", "tch-farah", teacherName("tch-farah"), "Of course. Resubmissions are open until Friday. I'd love to see a more varied sentence rhythm in the ending.", 6200) ] },
  { id: "pc-3", childId: "stu-vihaan", parentId: "par-rohan", teacherId: "tch-leela", teacherName: teacherName("tch-leela"), teacherRole: "Class teacher · Grade 5A", subjectId: "sub-cs", topic: "Football trials permission", status: "open", createdAt: ago(1500), updatedAt: ago(1100), messages: [
    M("pm5", "parent", "par-rohan", "Rohan Rao", "Vihaan would like to attend the Saturday football trials. Do I need to sign a form?", 1500),
    M("pm6", "teacher", "tch-leela", teacherName("tch-leela"), "A consent slip is sent home on Friday. Please sign and send it back on Monday.", 1100) ] },
];

const teachersOfChild = (childId: string) => {
  const st = STUDENTS.find((s) => s.id === childId); if (!st) return [];
  const cls = CLASSROOMS.find((c) => c.id === st.classId); const out = new Map<string, ParentRecipient>();
  if (cls) { const t = TEACHERS.find((x) => x.id === cls.teacherId); if (t) out.set(t.id, { teacherId: t.id, name: teacherName(t.id), role: `Class teacher · ${cls.name}`, subjectId: t.subjectIds[0], permitted: true }); }
  TIMETABLE_SEED.filter((e) => e.classId === st.classId).forEach((e) => { if (out.has(e.teacherId)) return; const t = TEACHERS.find((x) => x.id === e.teacherId); if (t) out.set(t.id, { teacherId: t.id, name: teacherName(t.id), role: `${SUBJECTS.find((s) => s.id === e.subjectId)?.name} teacher`, subjectId: e.subjectId, permitted: true }); });
  TEACHERS.filter((t) => t.classIds.includes(st.classId)).forEach((t) => { if (!out.has(t.id)) out.set(t.id, { teacherId: t.id, name: teacherName(t.id), role: `${t.departmentName} teacher`, subjectId: t.subjectIds[0], permitted: true }); });
  return [...out.values()];
};

export const parentMessageService = {
  /** Conversations for ONE child only. */
  forParent: (parentId: string, childId: string) => simulate(() => convs.filter((c) => c.parentId === parentId && c.childId === childId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  /** Teacher inbox: every conversation addressed to this teacher (for the `parent-messages` screen). */
  forTeacher: (teacherId: string) => simulate(() => convs.filter((c) => c.teacherId === teacherId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  get: (id: string) => simulate(() => convs.find((c) => c.id === id) ?? null),
  /** Permitted recipients for a child (class teacher + subject teachers), plus a few clearly explained unauthorised ones. */
  recipientsFor: (childId: string) => simulate((): ParentRecipient[] => {
    const permitted = teachersOfChild(childId); const ids = new Set(permitted.map((p) => p.teacherId));
    const blocked: ParentRecipient[] = TEACHERS.filter((t) => !ids.has(t.id)).slice(0, 2).map((t) => ({ teacherId: t.id, name: teacherName(t.id), role: `${t.departmentName} teacher`, permitted: false, reason: "Doesn't teach this child's class. Contact the class teacher or school office instead." }));
    blocked.push({ teacherId: "office", name: "Principal's office", role: "Administration", permitted: false, reason: "Use the school office or request a meeting through the class teacher. Direct messages to administration aren't part of this prototype." });
    return [...permitted, ...blocked];
  }),
  /** Parent sends a message (starts a new conversation or replies in one). Shows up in the teacher inbox. */
  send: (p: { parentId: string; childId: string; teacherId: string; topic?: string; text: string; attachments?: ParentMessage["attachments"]; conversationId?: string; authorName?: string }) => simulate(() => {
    if (!teachersOfChild(p.childId).some((t) => t.teacherId === p.teacherId)) throw new ServiceError("You can only message teachers of the selected child.", "permission");
    const text = p.text.trim(); if (!text) throw new ServiceError("Write a message first.", "validation");
    let c = p.conversationId ? convs.find((x) => x.id === p.conversationId) : undefined;
    const rec = teachersOfChild(p.childId).find((t) => t.teacherId === p.teacherId)!;
    if (!c) { c = { id: uid("pc"), childId: p.childId, parentId: p.parentId, teacherId: p.teacherId, teacherName: rec.name, teacherRole: rec.role, subjectId: rec.subjectId, topic: p.topic?.trim() || text.slice(0, 60), status: "open", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] }; convs.unshift(c); }
    c.messages.push({ id: uid("pm"), authorRole: "parent", authorId: p.parentId, authorName: p.authorName ?? "Rohan Rao", text, at: new Date().toISOString(), attachments: p.attachments ?? [], readByParent: true, readByTeacher: false });
    c.updatedAt = new Date().toISOString(); c.status = "open";
    notificationService.push({ role: "teacher", category: "communication", title: "New parent message", body: `About ${STUDENTS.find((s) => s.id === p.childId)?.displayName}: ${c.topic}`, href: "/teacher/parent-messages" });
    return c;
  }, { ms: 400 }),
  /** Teacher reply. Notifies the parent for that child only. */
  reply: (conversationId: string, teacherId: string, text: string, attachments: ParentMessage["attachments"] = []) => simulate(() => {
    const c = convs.find((x) => x.id === conversationId); if (!c) throw new ServiceError("Conversation not found.", "unavailable");
    c.messages.push({ id: uid("pm"), authorRole: "teacher", authorId: teacherId, authorName: teacherName(teacherId), text, at: new Date().toISOString(), attachments, readByParent: false, readByTeacher: true });
    c.updatedAt = new Date().toISOString();
    notificationService.push({ role: "parent", childId: c.childId, category: "communication", title: `${teacherName(teacherId)} replied to your message`, body: c.topic, href: "/parent/messages", private: true });
    return c;
  }),
  markRead: (conversationId: string, by: "parent" | "teacher" = "teacher") => simulate(() => { const c = convs.find((x) => x.id === conversationId); c?.messages.forEach((m) => { if (by === "teacher") m.readByTeacher = true; else m.readByParent = true; }); return true; }, { ms: 50 }),
  setStatus: (conversationId: string, status: "open" | "closed") => simulate(() => { const c = convs.find((x) => x.id === conversationId); if (c) c.status = status; return c ?? null; }),
  unreadForParent: (childId: string) => simulate(() => convs.filter((c) => c.childId === childId).reduce((n, c) => n + c.messages.filter((m) => m.authorRole === "teacher" && !m.readByParent).length, 0)),
  unreadForTeacher: (teacherId: string) => simulate(() => convs.filter((c) => c.teacherId === teacherId).reduce((n, c) => n + c.messages.filter((m) => m.authorRole === "parent" && !m.readByTeacher).length, 0)),
};
