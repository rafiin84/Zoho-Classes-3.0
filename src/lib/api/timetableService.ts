import type { TimetableEntry, Room } from "@/types/academic";
import type { AcademicCalendar, ChangeProposal, ChangeRequest, ChangeAffected, Conflict, TimetableMeta, TimetableVersion } from "@/types/timetable";
import { ROOMS } from "../mock-data/academic";
import { STUDENTS, TEACHERS, teacherName } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { notificationService } from "./notificationService";
import { store, ctx, sameEntries, auditAdd } from "./timetableStore";
import { detectConflicts, effTeacher, periodLabel, dayLabel } from "../timetable/engine";

const classLabel = (id: string) => id.replace("cls-", "Grade ").toUpperCase();

/** Apply a change request to a list of entries (pure on the clone it is given). */
function applyChange(list: TimetableEntry[], r: ChangeRequest): { list: TimetableEntry[]; before?: TimetableEntry; touched?: TimetableEntry } {
  const next = structuredClone(list);
  if (r.kind === "special") {
    if (!r.special || !r.dayOfWeek || !r.periodId || !r.teacherId || !r.roomId) throw new ServiceError("A special session needs a class, day, period, teacher and room.", "validation");
    const e: TimetableEntry = { id: uid("tt-sp"), academicYearId: "ay-2026-27", dayOfWeek: r.dayOfWeek, periodId: r.periodId, classId: r.special.classId, subjectId: r.special.subjectId, teacherId: r.teacherId, roomId: r.roomId, status: "special", note: r.special.title };
    next.push(e); return { list: next, touched: e };
  }
  const e = next.find((x) => x.id === r.entryId); if (!e) throw new ServiceError("That period no longer exists.", "validation");
  const before = structuredClone(e);
  if (r.kind === "move") { if (!r.dayOfWeek || !r.periodId) throw new ServiceError("Choose a day and period.", "validation"); e.dayOfWeek = r.dayOfWeek; e.periodId = r.periodId; e.status = "regular"; e.note = `Rescheduled from ${dayLabel(before.dayOfWeek)} ${periodLabel(before.periodId)}`; }
  if (r.kind === "teacher") { if (!r.teacherId) throw new ServiceError("Choose a teacher.", "validation"); e.teacherId = r.teacherId; e.substituteTeacherId = undefined; e.status = "regular"; }
  if (r.kind === "room") { if (!r.roomId) throw new ServiceError("Choose a room.", "validation"); e.roomId = r.roomId; }
  if (r.kind === "cancel") { e.status = "cancelled"; e.note = r.reason; }
  if (r.kind === "substitute") { if (!r.substituteTeacherId) throw new ServiceError("Choose a substitute.", "validation"); e.substituteTeacherId = r.substituteTeacherId; e.status = "substituted"; e.note = `Substitute for ${teacherName(e.teacherId)}`; }
  return { list: next, before, touched: e };
}

function describe(r: ChangeRequest, before?: TimetableEntry, touched?: TimetableEntry): string {
  const who = before ? `${classLabel(before.classId)} ${before.subjectId.replace("sub-", "")} (${dayLabel(before.dayOfWeek)} ${periodLabel(before.periodId)})` : "";
  switch (r.kind) {
    case "move": return `Move ${who} to ${dayLabel(r.dayOfWeek!)} ${periodLabel(r.periodId!)}`;
    case "teacher": return `Reassign ${who} to ${teacherName(r.teacherId!)}`;
    case "room": return `Change room for ${who} to ${ROOMS.find((x) => x.id === r.roomId)?.name}`;
    case "cancel": return `Cancel ${who}`;
    case "substitute": return `Substitute ${teacherName(r.substituteTeacherId!)} for ${who}`;
    default: return `Special session “${r.special?.title}” for ${classLabel(r.special!.classId)} on ${dayLabel(r.dayOfWeek!)} ${periodLabel(r.periodId!)}${touched ? "" : ""}`;
  }
}
function affectedOf(r: ChangeRequest, before?: TimetableEntry, touched?: TimetableEntry): ChangeAffected {
  const classIds = new Set<string>(), teacherIds = new Set<string>(), roomIds = new Set<string>();
  [before, touched].forEach((e) => { if (!e) return; classIds.add(e.classId); [e.teacherId, e.substituteTeacherId].forEach((t) => t && teacherIds.add(t)); roomIds.add(e.roomId); });
  const students = STUDENTS.filter((s) => classIds.has(s.classId)).length;
  return { classIds: [...classIds], teacherIds: [...teacherIds], roomIds: [...roomIds], students: Math.max(students, classIds.size * 30) };
}
/** Conflicts introduced by applying the request to the live (published) timetable. */
function introduced(r: ChangeRequest) {
  const before = detectConflicts(store.published, ctx()).map((c) => c.id);
  const res = applyChange(store.published, r);
  const after = detectConflicts(res.list, ctx());
  return { ...res, conflicts: after.filter((c) => !before.includes(c.id) && c.kind !== "unfulfilled") as Conflict[] };
}
function notifyChange(summary: string, aff: ChangeAffected) {
  notificationService.push({ role: "student", category: "academic", title: "Timetable updated", body: summary, href: "/student/timetable" });
  STUDENTS.filter((s) => aff.classIds.includes(s.classId) && s.parentIds.length).forEach((s) => notificationService.push({ role: "parent", childId: s.id, category: "academic", title: "Timetable updated", body: summary, href: "/parent/timetable" }));
  aff.teacherIds.forEach((t) => notificationService.push({ role: "teacher", recipientId: t, category: "academic", title: "Your timetable changed", body: summary, href: "/teacher/timetable" }));
}

export const timetableService = {
  // ---- Read API consumed by Student / Parent screens: PUBLISHED data only. ----
  all: () => simulate(() => store.published),
  forClass: (classId: string) => simulate(() => store.published.filter((e) => e.classId === classId)),
  forTeacher: (teacherId: string) => simulate(() => store.published.filter((e) => e.teacherId === teacherId || e.substituteTeacherId === teacherId)),
  forRoom: (roomId: string) => simulate(() => store.published.filter((e) => e.roomId === roomId)),
  rooms: () => simulate<Room[]>(() => ROOMS),
  calendar: () => simulate<AcademicCalendar>(() => store.calendar),
  // ---- Staff API (timetable office / teachers): draft-aware. ----
  allDraftAware: () => simulate(() => store.draft),
  meta: () => simulate<TimetableMeta>(() => { const c = detectConflicts(store.draft, ctx()); const dirty = !sameEntries(store.draft, store.published); return { version: store.version, publishedAt: store.publishedAt, hasDraftChanges: dirty, draftConflictCount: c.length, draftErrorCount: c.filter((x) => x.severity === "error").length, status: dirty ? "draft-ahead" : "published" }; }),
  publishedConflicts: () => simulate(() => detectConflicts(store.published, ctx())),
  versions: () => simulate<TimetableVersion[]>(() => store.history.map((h) => ({ ...h, entries: [] }))),
  /** Publish the draft. Unresolved conflicts must be explicitly acknowledged; warnings and errors are both counted. */
  publishDraft: (opts: { acknowledge: boolean; note: string; by: string }) => simulate(() => {
    const conflicts = detectConflicts(store.draft, ctx());
    if (conflicts.length && !opts.acknowledge) throw new ServiceError(`${conflicts.length} unresolved conflict(s) must be acknowledged before publishing.`, "validation");
    if (sameEntries(store.draft, store.published)) throw new ServiceError("The draft is identical to the published timetable. Nothing to publish.", "validation");
    store.history.unshift({ version: store.version, publishedAt: store.publishedAt ?? new Date().toISOString(), publishedBy: "Timetable office", note: "Superseded by v" + (store.version + 1), entries: structuredClone(store.published), acknowledgedConflicts: 0 });
    store.version += 1; store.published = structuredClone(store.draft); store.publishedAt = new Date().toISOString();
    auditAdd(opts.by, "publish", `Published timetable v${store.version} with ${conflicts.length} acknowledged conflict(s).`, opts.note || undefined, conflicts.map((c) => c.id));
    const body = `Timetable v${store.version} is now published${opts.note ? `: ${opts.note}` : "."}`;
    notificationService.push({ role: "student", category: "academic", title: "New timetable published", body, href: "/student/timetable" });
    ["stu-ananya", "stu-vihaan"].forEach((c) => notificationService.push({ role: "parent", childId: c, category: "academic", title: "New timetable published", body, href: "/parent/timetable" }));
    TEACHERS.forEach((t) => notificationService.push({ role: "teacher", recipientId: t.id, category: "academic", title: "New timetable published", body, href: "/teacher/timetable" }));
    track("timetable_allocation_changed", { action: "publish", version: store.version, conflicts: conflicts.length });
    return { version: store.version };
  }),
  /** Substitution on the live timetable (and draft mirror). Notifies affected people. */
  assignSubstitute: (entryId: string, substituteId: string, by: string, reason: string) => simulate(() => {
    if (!reason.trim()) throw new ServiceError("A reason is required for a substitution.", "validation");
    const req: ChangeRequest = { kind: "substitute", entryId, substituteTeacherId: substituteId, reason };
    const { list, before, touched, conflicts } = introduced(req);
    if (conflicts.some((c) => c.kind === "teacher-double" || c.kind === "teacher-unavailable")) throw new ServiceError(`${teacherName(substituteId)} is not free for that period.`, "validation");
    store.published = list; try { store.draft = applyChange(store.draft, req).list; } catch { /* draft may differ */ }
    auditAdd(by, "substitute", `${describe(req, before)}.`, reason); track("timetable_allocation_changed", { action: "substitute", entryId });
    notifyChange(describe(req, before), affectedOf(req, before, touched)); return touched!;
  }),
  // ---- Change communication flow: propose -> affected + conflicts -> admin approves -> published timetable + notifications + history ----
  proposals: () => simulate<ChangeProposal[]>(() => store.proposals),
  previewChange: (req: ChangeRequest) => simulate(() => { const { before, touched, conflicts } = introduced(req); return { summary: describe(req, before, touched), affected: affectedOf(req, before, touched), conflicts }; }),
  proposeChange: (req: ChangeRequest, by: string, role: "teacher" | "institution") => simulate(() => {
    if (req.reason.trim().length < 5) throw new ServiceError("Give a reason (at least 5 characters) so approvers understand the change.", "validation");
    const { before, touched, conflicts } = introduced(req);
    const p: ChangeProposal = { id: uid("chg"), request: req, proposedBy: by, proposedByRole: role, createdAt: new Date().toISOString(), status: "proposed", summary: describe(req, before, touched), affected: affectedOf(req, before, touched), conflicts, before };
    store.proposals.unshift(p); auditAdd(by, "change-proposed", p.summary, req.reason);
    notificationService.push({ role: "institution", category: "academic", title: "Timetable change awaiting approval", body: p.summary, href: "/institution/timetable" });
    return p;
  }),
  decideChange: (id: string, decision: "approved" | "rejected", by: string, note: string, acknowledgeConflicts = false) => simulate(() => {
    const p = store.proposals.find((x) => x.id === id); if (!p) throw new ServiceError("Proposal not found.", "validation");
    if (p.status !== "proposed") throw new ServiceError("This proposal has already been decided.", "validation");
    if (decision === "approved") {
      const { list, conflicts } = introduced(p.request);
      if (conflicts.length && !acknowledgeConflicts) throw new ServiceError(`This change creates ${conflicts.length} conflict(s). Acknowledge them to approve.`, "validation");
      store.history.unshift({ version: store.version, publishedAt: store.publishedAt ?? new Date().toISOString(), publishedBy: "Timetable office", note: `Before approved change: ${p.summary}`, entries: structuredClone(store.published), acknowledgedConflicts: conflicts.length });
      store.version += 1; store.publishedAt = new Date().toISOString(); store.published = list;
      try { store.draft = applyChange(store.draft, p.request).list; } catch { /* keep draft */ }
      notifyChange(p.summary, p.affected); track("timetable_allocation_changed", { action: "change-approved", kind: p.request.kind });
    }
    p.status = decision; p.decidedAt = new Date().toISOString(); p.decidedBy = by; p.decisionNote = note;
    auditAdd(by, decision === "approved" ? "change-approved" : "change-rejected", p.summary, note || undefined);
    return p;
  }),
  effectiveTeacher: effTeacher,
};
