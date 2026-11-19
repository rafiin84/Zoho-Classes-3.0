import type { AITeacherDraft, AITeacherRecord, AITeacherTarget, AITeacherUsage } from "@/types/teacher";
import { AI_TEACHER_SEED } from "../mock-data/aiTeachers";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { notificationService } from "./notificationService";

/**
 * AI Teachers are institution-governed entities, DISTINCT from a student's personal AI Tutor.
 * Single source of truth: teacher, institution and government screens all read/write here, so approval changes status for everyone.
 * An AI Teacher is only "deployed" when status === "approved" AND it has at least one active assignment (see `isDeployed`).
 */
const items: AITeacherRecord[] = structuredClone(AI_TEACHER_SEED);
const find = (id: string) => { const t = items.find((x) => x.id === id); if (!t) throw new ServiceError("AI Teacher not found", "unavailable"); return t; };
const log = (t: AITeacherRecord, text: string) => t.history.unshift({ at: new Date().toISOString(), text });

export const isDeployed = (t: AITeacherRecord) => t.status === "approved" && t.assignments.some((a) => a.status === "active");

export const aiTeacherService = {
  list: (filter: { status?: AITeacherRecord["status"]; ownerType?: AITeacherRecord["ownerType"] } = {}) =>
    simulate(() => items.filter((t) => (!filter.status || t.status === filter.status) && (!filter.ownerType || t.ownerType === filter.ownerType)), { failKey: "aiTeachers" }),
  get: (id: string) => simulate(() => items.find((t) => t.id === id) ?? null),
  create: (draft: AITeacherDraft) => simulate(() => {
    if (!draft.name.trim()) throw new ServiceError("Give the AI Teacher a name.", "validation");
    if (items.some((t) => t.name.toLowerCase() === draft.name.trim().toLowerCase() && t.status !== "retired")) throw new ServiceError("An AI Teacher with this name already exists.", "validation");
    const t: AITeacherRecord = { id: uid("ait"), kind: "ai-teacher", ...draft, name: draft.name.trim(), status: "draft", version: "v0.1", usage: 0, rating: 0, assignments: [], createdAt: new Date().toISOString(), feedback: [], concerns: [], history: [{ at: new Date().toISOString(), text: `Draft created by ${draft.owner}` }] };
    items.unshift(t); return t;
  }),
  update: (id: string, patch: Partial<AITeacherDraft>) => simulate(() => {
    const t = find(id); if (t.status === "awaiting-approval") throw new ServiceError("Withdraw the approval request before editing.", "validation");
    Object.assign(t, patch); if (t.status === "approved") { t.status = "awaiting-approval"; t.submittedAt = new Date().toISOString(); log(t, "Edited after approval — re-approval required"); } else log(t, "Draft edited"); return t;
  }),
  submitForApproval: (id: string) => simulate(() => {
    const t = find(id); if (!["draft", "rejected"].includes(t.status)) throw new ServiceError("Only a draft can be submitted for approval.", "validation");
    if (!t.sources.length) throw new ServiceError("Add at least one approved source before submitting.", "validation");
    t.status = "awaiting-approval"; t.submittedAt = new Date().toISOString(); t.rejectionReason = undefined; log(t, "Submitted for institution approval");
    notificationService.push({ role: "institution", category: "governance", title: `AI Teacher '${t.name}' awaiting approval`, body: `Submitted by ${t.owner}`, href: "/institution/governance" });
    return t;
  }),
  approve: (id: string, by: string) => simulate(() => {
    const t = find(id); if (t.status !== "awaiting-approval") throw new ServiceError("Nothing to approve — this AI Teacher is not awaiting approval.", "validation");
    t.status = "approved"; t.approvedBy = by; t.approvedAt = new Date().toISOString(); log(t, `Approved by ${by}`);
    notificationService.push({ role: "teacher", category: "governance", title: `AI Teacher '${t.name}' approved`, body: "It can now be assigned to a class.", href: "/teacher/ai-teachers" });
    return t;
  }),
  reject: (id: string, reason: string) => simulate(() => {
    const t = find(id); if (!reason.trim()) throw new ServiceError("A reason is required.", "validation");
    t.status = "rejected"; t.rejectionReason = reason; t.assignments = []; log(t, `Rejected: ${reason}`); return t;
  }),
  suspend: (id: string, reason = "Suspended pending review") => simulate(() => { const t = find(id); t.status = "suspended"; t.suspendedReason = reason; t.assignments.forEach((a) => (a.status = "paused")); log(t, `Suspended: ${reason}`); return t; }),
  reinstate: (id: string) => simulate(() => { const t = find(id); if (t.status !== "suspended") throw new ServiceError("Only suspended AI Teachers can be reinstated.", "validation"); t.status = "approved"; t.suspendedReason = undefined; log(t, "Reinstated"); return t; }),
  retire: (id: string) => simulate(() => { const t = find(id); t.status = "retired"; t.assignments = []; log(t, "Retired"); return t; }),
  assign: (id: string, target: AITeacherTarget) => simulate(() => {
    const t = find(id);
    if (t.status !== "approved") throw new ServiceError("This AI Teacher is not approved yet, so it cannot be deployed to students.", "permission");
    if (!target.functions.length) throw new ServiceError("Select at least one permitted function.", "validation");
    if (t.assignments.some((a) => a.targetId === target.targetId)) throw new ServiceError("Already assigned to this target.", "validation");
    t.assignments.push({ id: uid("aas"), ...target, status: "active", assignedAt: new Date().toISOString() }); log(t, `Assigned to ${target.targetLabel}`); return t;
  }),
  unassign: (id: string, assignmentId: string) => simulate(() => { const t = find(id); const a = t.assignments.find((x) => x.id === assignmentId); t.assignments = t.assignments.filter((x) => x.id !== assignmentId); if (a) log(t, `Unassigned from ${a.targetLabel}`); return t; }),
  pauseAssignment: (id: string, assignmentId: string, paused: boolean) => simulate(() => { const t = find(id); const a = t.assignments.find((x) => x.id === assignmentId); if (a) { a.status = paused ? "paused" : "active"; log(t, `${paused ? "Paused" : "Resumed"} for ${a.targetLabel}`); } return t; }),
  updateVersion: (id: string) => simulate(() => { const t = find(id); const n = Number(t.version.replace(/[^0-9.]/g, "").split(".")[1] ?? 0) + 1; t.version = `${t.version.split(".")[0]}.${n}`; t.updateAvailable = undefined; log(t, `Updated to ${t.version}`); return t; }),
  reportConcern: (id: string, text: string, by: string) => simulate(() => { const t = find(id); if (text.trim().length < 10) throw new ServiceError("Describe the concern in at least 10 characters.", "validation"); t.concerns.unshift({ id: uid("con"), text, by, at: new Date().toISOString(), status: "open" }); log(t, "Concern reported"); return t; }),
  usage: (id: string): Promise<AITeacherUsage> => simulate(() => {
    const t = find(id); const base = Math.max(1, Math.round(t.usage / 40));
    return { sessions: t.usage, students: Math.round(t.usage / 14), weekly: [0.8, 1, 1.1, 0.9, 1.2, 0.4, 0.6].map((k) => Math.round(base * k)), topTopics: t.usage ? [{ label: t.subject === "Mathematics" ? "Unlike fractions" : "Chapter revision", count: Math.round(t.usage / 9) }, { label: "Homework help", count: Math.round(t.usage / 14) }, { label: "Exam preparation", count: Math.round(t.usage / 22) }] : [], avgRating: t.rating, escalations: Math.round(t.usage / 300) };
  }),
};
