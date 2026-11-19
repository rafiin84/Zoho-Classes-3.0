import type { TimetableEntry } from "@/types/academic";
import { DAYS } from "@/types/academic";
import type { AllocationAudit, AllocationPreview, AssignOp, Conflict, ConflictPreview, EntryPatch, LeaveRecord, ReportsData, StaffProfile, Suggestion, SuggestedEntry, WorkspaceSnapshot } from "@/types/timetable";
import { ROOMS } from "../mock-data/academic";
import { TEACHERS, teacherName } from "../mock-data/core";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { track } from "../analytics";
import { store, ctx, sameEntries, auditAdd } from "./timetableStore";
import { detectConflicts, gapsOf, workloadOf, suggestFor, HARD_KINDS, TEACHING, isFreeClass, isFreeRoom, isFreeTeacher, teacherUnavailableReason, periodsOf, periodLabel, dayLabel, isActive, effTeacher } from "../timetable/engine";
import { timetableService } from "./timetableService";

const slotId = (classId: string, d: number, p: string) => `tt-${classId}-${d}-${p}`;
const newHard = (before: Conflict[], after: Conflict[]) => after.filter((c) => !before.some((b) => b.id === c.id) && HARD_KINDS.includes(c.kind));

/** Validates + commits a draft change. Hard conflicts introduced require a recorded override reason. */
function commit(next: TimetableEntry[], by: string, action: AllocationAudit["action"], detail: string, reason?: string) {
  const before = detectConflicts(store.draft, ctx()), after = detectConflicts(next, ctx());
  const hard = newHard(before, after);
  if (hard.length && !reason?.trim()) throw new ServiceError(`This change creates ${hard.length} conflict(s). A reason is required to override.`, "validation");
  store.draft = next;
  auditAdd(by, hard.length ? "override" : action, detail, reason?.trim() || undefined, hard.map((c) => c.message));
  track("timetable_allocation_changed", { action, overridden: hard.length > 0 });
  return { overridden: hard.length };
}
const upsert = (list: TimetableEntry[], op: AssignOp) => {
  const next = structuredClone(list); const ex = next.find((e) => e.classId === op.classId && e.dayOfWeek === op.dayOfWeek && e.periodId === op.periodId);
  if (ex) Object.assign(ex, { subjectId: op.subjectId, teacherId: op.teacherId, roomId: op.roomId, status: "regular", substituteTeacherId: undefined });
  else next.push({ id: slotId(op.classId, op.dayOfWeek, op.periodId), academicYearId: "ay-2026-27", dayOfWeek: op.dayOfWeek, periodId: op.periodId, classId: op.classId, subjectId: op.subjectId, teacherId: op.teacherId, roomId: op.roomId, status: "regular" });
  return next;
};
const moveList = (list: TimetableEntry[], id: string, d: number, p: string) => {
  const next = structuredClone(list); const e = next.find((x) => x.id === id); if (!e) throw new ServiceError("That period no longer exists.", "validation");
  const other = next.find((x) => x.id !== id && x.classId === e.classId && x.dayOfWeek === d && x.periodId === p);
  if (other) { other.dayOfWeek = e.dayOfWeek; other.periodId = e.periodId; }
  e.dayOfWeek = d; e.periodId = p; return { next, e, swapped: !!other };
};
const patchList = (list: TimetableEntry[], id: string, patch: EntryPatch) => {
  let next = structuredClone(list); const e = next.find((x) => x.id === id); if (!e) throw new ServiceError("That period no longer exists.", "validation");
  if (patch.dayOfWeek && patch.periodId) next = moveList(next, id, patch.dayOfWeek, patch.periodId).next;
  const t = next.find((x) => x.id === id)!; if (patch.teacherId) { t.teacherId = patch.teacherId; t.substituteTeacherId = undefined; t.status = "regular"; } if (patch.roomId) t.roomId = patch.roomId; if (patch.subjectId) t.subjectId = patch.subjectId;
  return next;
};
const cl = (id: string) => id.replace("cls-", "").toUpperCase();

function computeAllocation(): AllocationPreview {
    const work = structuredClone(store.draft); const proposed: SuggestedEntry[] = [];
    for (const g of gapsOf(work, store.requirements)) {
      const rq = store.requirements.find((r) => r.classId === g.classId && r.subjectId === g.subjectId)!;
      for (let i = 0; i < g.missing; i++) {
        const cands = DAYS.flatMap((d) => TEACHING.map((p) => ({ d: d.n, p }))).map((s) => ({ ...s, load: work.filter((e) => e.classId === g.classId && e.subjectId === g.subjectId && e.dayOfWeek === s.d).length }))
          .sort((a, b) => a.load - b.load || a.d - b.d || TEACHING.indexOf(a.p) - TEACHING.indexOf(b.p));
        let placed = false;
        for (const s of cands) {
          if (!isFreeClass(work, g.classId, s.d, s.p)) continue;
          const t = TEACHERS.filter((x) => x.subjectIds.includes(g.subjectId) && x.status === "active").sort((a, b) => periodsOf(work, a.id) / a.workloadLimit - periodsOf(work, b.id) / b.workloadLimit)
            .find((x) => isFreeTeacher(work, x.id, s.d, s.p) && !teacherUnavailableReason(ctx(), x.id, s.d, s.p) && periodsOf(work, x.id) < x.workloadLimit && work.filter((e) => e.teacherId === x.id && e.dayOfWeek === s.d && isActive(e)).length < (store.profiles.find((p) => p.teacherId === x.id)?.maxPerDay ?? 6));
          const room = ROOMS.find((r) => (rq.roomKind === "lab" ? r.kind === "lab" : r.kind === "classroom" && (r.name.includes(cl(g.classId)) || r.name.endsWith(cl(g.classId)))) && isFreeRoom(work, r.id, s.d, s.p)) ?? ROOMS.find((r) => r.kind === rq.roomKind && isFreeRoom(work, r.id, s.d, s.p));
          if (!t || !room) continue;
          const entry: TimetableEntry = { id: slotId(g.classId, s.d, s.p), academicYearId: "ay-2026-27", dayOfWeek: s.d, periodId: s.p, classId: g.classId, subjectId: g.subjectId, teacherId: t.id, roomId: room.id, status: "regular" };
          work.push(entry); proposed.push({ id: entry.id, entry, reason: `${t.displayName} is qualified and free (${periodsOf(work, t.id)}/${t.workloadLimit}); ${room.name} is free; spreads ${g.subjectId.replace("sub-", "")} across days.` }); placed = true; break;
        }
        if (!placed) break;
      }
    }
    return { proposed, remaining: gapsOf(work, store.requirements) };
  }

export const staffAllocationService = {
  workspace: () => simulate<WorkspaceSnapshot>(() => {
    const conflicts = detectConflicts(store.draft, ctx()); const dirty = !sameEntries(store.draft, store.published);
    return { entries: store.draft, conflicts, workload: workloadOf(store.draft, TEACHERS), gaps: gapsOf(store.draft, store.requirements), meta: { version: store.version, publishedAt: store.publishedAt, hasDraftChanges: dirty, draftConflictCount: conflicts.length, draftErrorCount: conflicts.filter((c) => c.severity === "error").length, status: dirty ? "draft-ahead" : "published" } };
  }),
  requirements: () => simulate(() => store.requirements),
  /** Live check used by the assign dialog before submitting. */
  previewAssign: (op: AssignOp) => simulate<ConflictPreview>(() => { const before = detectConflicts(store.draft, ctx()); const hard = newHard(before, detectConflicts(upsert(store.draft, op), ctx())); return { newConflicts: hard, requiresReason: hard.length > 0 }; }, { ms: 60 }),
  previewMove: (entryId: string, d: number, p: string) => simulate<ConflictPreview>(() => { const before = detectConflicts(store.draft, ctx()); const hard = newHard(before, detectConflicts(moveList(store.draft, entryId, d, p).next, ctx())); return { newConflicts: hard, requiresReason: hard.length > 0 }; }, { ms: 60 }),
  /** Edit an existing period (possibly to a new slot) or create a new one in a single audited commit. */
  replace: (entryId: string | undefined, op: AssignOp, by: string, reason?: string) => simulate(() => commit(upsert(entryId ? store.draft.filter((e) => e.id !== entryId) : store.draft, op), by, entryId ? "move" : "assign", `${entryId ? "Updated" : "Assigned"} ${op.subjectId.replace("sub-", "")} for ${cl(op.classId)} (${teacherName(op.teacherId)}) at ${dayLabel(op.dayOfWeek)} ${periodLabel(op.periodId)}.`, reason)),
  previewReplace: (entryId: string | undefined, op: AssignOp) => simulate<ConflictPreview>(() => { const base = entryId ? store.draft.filter((e) => e.id !== entryId) : store.draft; const before = detectConflicts(store.draft, ctx()); const hard = newHard(before, detectConflicts(upsert(base, op), ctx())); return { newConflicts: hard, requiresReason: hard.length > 0 }; }, { ms: 60 }),
  assign: (op: AssignOp, by: string, reason?: string) => simulate(() => commit(upsert(store.draft, op), by, "assign", `Assigned ${op.subjectId.replace("sub-", "")} to ${cl(op.classId)} for ${teacherName(op.teacherId)} on ${dayLabel(op.dayOfWeek)} ${periodLabel(op.periodId)}.`, reason)),
  move: (entryId: string, d: number, p: string, by: string, reason?: string) => simulate(() => { const { next, e, swapped } = moveList(store.draft, entryId, d, p); return commit(next, by, "move", `Moved ${cl(e.classId)} ${e.subjectId.replace("sub-", "")} to ${dayLabel(d)} ${periodLabel(p)}${swapped ? " (swapped with the existing period)" : ""}.`, reason); }),
  unassign: (entryId: string, by: string) => simulate(() => { const e = store.draft.find((x) => x.id === entryId); if (!e) throw new ServiceError("That period no longer exists.", "validation"); const next = store.draft.filter((x) => x.id !== entryId); return commit(next, by, "unassign", `Cleared ${cl(e.classId)} ${e.subjectId.replace("sub-", "")} on ${dayLabel(e.dayOfWeek)} ${periodLabel(e.periodId)}.`); }),
  suggestionsFor: (entryId: string) => simulate<Suggestion[]>(() => { const e = store.draft.find((x) => x.id === entryId); return e ? suggestFor(e, store.draft, ctx()) : []; }),
  applySuggestion: (s: Suggestion, by: string, reason?: string) => simulate(() => commit(patchList(store.draft, s.entryId, s.patch), by, "suggestion-applied", `Applied suggestion “${s.label}”.`, reason)),
  resetDraft: (by: string) => simulate(() => { store.draft = structuredClone(store.published); auditAdd(by, "reset", "Discarded draft changes and restored the published timetable."); return true; }),
  /** Deterministic rule-based suggestion preview (no optimisation engine). Nothing is applied until an administrator confirms. */
  suggestAllocation: () => simulate<AllocationPreview>(computeAllocation),
  applyAllocation: (ids: string[], by: string) => simulate(() => {
    const prev = detectConflicts(store.draft, ctx()); const add = ids.map((id) => id); const next = structuredClone(store.draft);
    // Recompute against current draft so stale previews cannot create conflicts silently.
    const fresh = computeAllocation().proposed.filter((p) => add.includes(p.id));
    fresh.forEach((p) => { if (!next.some((e) => e.classId === p.entry.classId && e.dayOfWeek === p.entry.dayOfWeek && e.periodId === p.entry.periodId)) next.push(p.entry); });
    if (newHard(prev, detectConflicts(next, ctx())).length) throw new ServiceError("The draft changed since the preview; regenerate the suggestion.", "validation");
    store.draft = next; auditAdd(by, "auto-allocation", `Applied ${fresh.length} rule-based suggested period(s) to the draft (reviewed by administrator).`); track("timetable_allocation_changed", { action: "auto-allocation", count: fresh.length });
    return fresh.length;
  }),
  // ---- Staff profiles, availability, leave ----
  profiles: () => simulate<StaffProfile[]>(() => store.profiles),
  setAvailability: (teacherId: string, dayOfWeek: number, periodId: string, kind: "blocked" | "preferred" | null, by: string) => simulate(() => {
    const p = store.profiles.find((x) => x.teacherId === teacherId); if (!p) throw new ServiceError("Unknown staff profile.", "validation");
    p.slots = p.slots.filter((s) => !(s.dayOfWeek === dayOfWeek && s.periodId === periodId)); if (kind) p.slots.push({ dayOfWeek, periodId, kind });
    auditAdd(by, "availability", `${teacherName(teacherId)}: ${dayLabel(dayOfWeek)} ${periodLabel(periodId)} set to ${kind ?? "available"}.`); return p;
  }, { ms: 60 }),
  requestLeave: (teacherId: string, l: { from: string; to: string; reason: string }, by: string, autoApprove = false) => simulate(() => {
    if (l.to < l.from) throw new ServiceError("The end date cannot be before the start date.", "validation");
    const p = store.profiles.find((x) => x.teacherId === teacherId); if (!p) throw new ServiceError("Unknown staff profile.", "validation");
    const rec: LeaveRecord = { id: uid("lv"), teacherId, ...l, status: autoApprove ? "approved" : "requested" }; p.leaves.push(rec);
    auditAdd(by, "leave", `${teacherName(teacherId)} leave ${l.from} to ${l.to} (${rec.status}).`, l.reason); return rec;
  }),
  decideLeave: (leaveId: string, status: "approved" | "rejected", by: string) => simulate(() => { for (const p of store.profiles) { const l = p.leaves.find((x) => x.id === leaveId); if (l) { l.status = status; auditAdd(by, "leave", `${status === "approved" ? "Approved" : "Rejected"} leave for ${teacherName(l.teacherId)} (${l.from} to ${l.to}).`); return l; } } throw new ServiceError("Leave request not found.", "validation"); }),
  /** Candidates who could cover a period (published timetable): qualified, free, available. */
  substituteCandidates: (entryId: string) => simulate(() => { const e = store.published.find((x) => x.id === entryId); if (!e) return []; return TEACHERS.filter((t) => t.id !== e.teacherId && t.status === "active").map((t) => ({ teacherId: t.id, name: teacherName(t.id), qualified: t.subjectIds.includes(e.subjectId), free: isFreeTeacher(store.published, t.id, e.dayOfWeek, e.periodId) && !teacherUnavailableReason(ctx(), t.id, e.dayOfWeek, e.periodId), load: `${periodsOf(store.published, t.id)}/${t.workloadLimit}` })).sort((a, b) => Number(b.qualified && b.free) - Number(a.qualified && a.free)); }),
  audit: () => simulate(() => store.audit),
  workload: (source: "draft" | "published" = "published") => simulate(() => workloadOf(source === "draft" ? store.draft : store.published, TEACHERS)),
  reports: (source: "draft" | "published" = "draft") => simulate<ReportsData>(() => {
    const list = source === "draft" ? store.draft : store.published; const act = list.filter(isActive);
    const conflicts = detectConflicts(list, ctx()); const classIds = [...new Set(store.requirements.map((r) => r.classId))];
    return {
      byTeacher: TEACHERS.map((t) => { const m = act.filter((e) => e.teacherId === t.id); return { teacherId: t.id, periods: m.length, classes: new Set(m.map((e) => e.classId)).size, subjects: new Set(m.map((e) => e.subjectId)).size }; }),
      coverage: classIds.map((c) => { const rs = store.requirements.filter((r) => r.classId === c); const required = rs.reduce((a, r) => a + r.periodsPerWeek, 0); const missing = gapsOf(list, rs).reduce((a, g) => a + g.missing, 0); return { classId: c, required, assigned: required - missing, fulfilledPct: required ? Math.round(((required - missing) / required) * 100) : 100 }; }),
      unassigned: gapsOf(list, store.requirements).reduce((a, g) => a + g.missing, 0), conflictCount: conflicts.filter((c) => c.kind !== "unfulfilled").length,
      substitutes: list.filter((e) => e.substituteTeacherId).map((e) => ({ entryId: e.id, label: `${cl(e.classId)} ${e.subjectId.replace("sub-", "")} · ${dayLabel(e.dayOfWeek)} ${periodLabel(e.periodId)} (${teacherName(e.teacherId)})`, substituteId: effTeacher(e) })),
      rooms: ROOMS.map((r) => { const used = act.filter((e) => e.roomId === r.id).length; const cap = TEACHING.length * 5; return { roomId: r.id, name: r.name, used, capacity: cap, pct: Math.round((used / cap) * 100) }; }),
      history: store.audit.slice(0, 30),
    };
  }),
  timetable: timetableService,
};
