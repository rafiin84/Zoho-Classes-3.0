// Deterministic timetable rules. Pure functions: no randomness, no optimisation engine. Used by services and by UI previews.
import type { Teacher } from "@/types";
import type { Room, TimetableEntry } from "@/types/academic";
import { PERIODS, DAYS } from "@/types/academic";
import type { Conflict, ConflictKind, Gap, PeriodRequirement, StaffProfile, TeacherWorkload, EntryPatch, Suggestion } from "@/types/timetable";

export const TEACHING = PERIODS.filter((p) => p.kind === "teaching").map((p) => p.id);
export const HARD_KINDS: ConflictKind[] = ["teacher-double", "class-double", "room-double", "teacher-unavailable", "qualification", "workload"];
export const effTeacher = (e: TimetableEntry) => e.substituteTeacherId ?? e.teacherId;
export const isActive = (e: TimetableEntry) => e.status !== "cancelled";
export const slotKey = (d: number, p: string) => `${d}|${p}`;
export const periodLabel = (id: string) => PERIODS.find((p) => p.id === id)?.label ?? id;
export const dayLabel = (n: number) => DAYS.find((d) => d.n === n)?.label ?? String(n);

export interface Ctx { profiles: StaffProfile[]; requirements: PeriodRequirement[]; teachers: Teacher[]; rooms: Room[]; weekStart: string }
const dateOf = (weekStart: string, day: number) => { const d = new Date(`${weekStart}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + day - 1); return d.toISOString().slice(0, 10); };

export function teacherUnavailableReason(ctx: Ctx, teacherId: string, day: number, period: string): string | null {
  const t = ctx.teachers.find((x) => x.id === teacherId); const pr = ctx.profiles.find((x) => x.teacherId === teacherId);
  if (t?.status === "on-leave") return "is on extended leave";
  const date = dateOf(ctx.weekStart, day);
  if (pr?.leaves.some((l) => l.status === "approved" && l.from <= date && date <= l.to)) return `has approved leave on ${date}`;
  if (pr?.slots.some((s) => s.kind === "blocked" && s.dayOfWeek === day && s.periodId === period)) return "has blocked this period in their availability";
  return null;
}

export function periodsOf(entries: TimetableEntry[], teacherId: string) { return entries.filter((e) => e.teacherId === teacherId && isActive(e)).length; }

export function detectConflicts(entries: TimetableEntry[], ctx: Ctx): Conflict[] {
  const out: Conflict[] = []; const act = entries.filter(isActive);
  const tname = (id: string) => ctx.teachers.find((t) => t.id === id)?.displayName ?? id;
  const cname = (id: string) => id.replace("cls-", "").toUpperCase();
  const group = (keyFn: (e: TimetableEntry) => string | null) => { const m = new Map<string, TimetableEntry[]>(); act.forEach((e) => { const k = keyFn(e); if (k) m.set(k, [...(m.get(k) ?? []), e]); }); return [...m.entries()].filter(([, v]) => v.length > 1); };
  for (const [k, v] of group((e) => (effTeacher(e) ? `${effTeacher(e)}|${slotKey(e.dayOfWeek, e.periodId)}` : null))) {
    const e = v[0];
    out.push({ id: `teacher-double:${k}`, kind: "teacher-double", severity: "error", entryIds: v.map((x) => x.id), teacherId: effTeacher(e), dayOfWeek: e.dayOfWeek, periodId: e.periodId,
      message: `${tname(effTeacher(e))} is double-booked on ${dayLabel(e.dayOfWeek)} ${periodLabel(e.periodId)}: ${v.map((x) => `${cname(x.classId)} ${x.subjectId.replace("sub-", "")}`).join(" vs ")}.` });
  }
  for (const [k, v] of group((e) => `${e.classId}|${slotKey(e.dayOfWeek, e.periodId)}`)) {
    const e = v[0]; out.push({ id: `class-double:${k}`, kind: "class-double", severity: "error", entryIds: v.map((x) => x.id), classId: e.classId, dayOfWeek: e.dayOfWeek, periodId: e.periodId, message: `Class ${cname(e.classId)} has ${v.length} sessions on ${dayLabel(e.dayOfWeek)} ${periodLabel(e.periodId)}.` });
  }
  for (const [k, v] of group((e) => `${e.roomId}|${slotKey(e.dayOfWeek, e.periodId)}`)) {
    const e = v[0]; const r = ctx.rooms.find((x) => x.id === e.roomId);
    out.push({ id: `room-double:${k}`, kind: "room-double", severity: "error", entryIds: v.map((x) => x.id), dayOfWeek: e.dayOfWeek, periodId: e.periodId, message: `${r?.name ?? e.roomId} is booked by ${v.length} classes on ${dayLabel(e.dayOfWeek)} ${periodLabel(e.periodId)}.` });
  }
  for (const e of act) {
    const tid = effTeacher(e); if (!tid) continue;
    const why = teacherUnavailableReason(ctx, tid, e.dayOfWeek, e.periodId);
    if (why) out.push({ id: `teacher-unavailable:${e.id}`, kind: "teacher-unavailable", severity: "error", entryIds: [e.id], teacherId: tid, classId: e.classId, dayOfWeek: e.dayOfWeek, periodId: e.periodId, message: `${tname(tid)} ${why} (${cname(e.classId)} ${e.subjectId.replace("sub-", "")}, ${dayLabel(e.dayOfWeek)} ${periodLabel(e.periodId)}).` });
    const t = ctx.teachers.find((x) => x.id === tid);
    if (t && !t.subjectIds.includes(e.subjectId)) out.push({ id: `qualification:${e.id}`, kind: "qualification", severity: "error", entryIds: [e.id], teacherId: tid, classId: e.classId, subjectId: e.subjectId, dayOfWeek: e.dayOfWeek, periodId: e.periodId, message: `${tname(tid)} is not listed as qualified for ${e.subjectId.replace("sub-", "")} (${cname(e.classId)}, ${dayLabel(e.dayOfWeek)} ${periodLabel(e.periodId)}).` });
  }
  for (const t of ctx.teachers) {
    const n = periodsOf(entries, t.id);
    if (n > t.workloadLimit) out.push({ id: `workload:${t.id}`, kind: "workload", severity: "error", entryIds: act.filter((e) => e.teacherId === t.id).map((e) => e.id), teacherId: t.id, message: `${t.displayName} has ${n} periods/week against a limit of ${t.workloadLimit}.` });
  }
  for (const g of gapsOf(entries, ctx.requirements)) {
    out.push({ id: `unfulfilled:${g.classId}|${g.subjectId}`, kind: "unfulfilled", severity: "warning", entryIds: [], classId: g.classId, subjectId: g.subjectId, message: `${cname(g.classId)} ${g.subjectId.replace("sub-", "")}: ${g.assigned} of ${g.required} required periods assigned (${g.missing} missing).` });
  }
  return out;
}

export function gapsOf(entries: TimetableEntry[], reqs: PeriodRequirement[]): Gap[] {
  return reqs.map((r) => { const assigned = entries.filter((e) => e.classId === r.classId && e.subjectId === r.subjectId && e.teacherId && isActive(e)).length; return { classId: r.classId, subjectId: r.subjectId, required: r.periodsPerWeek, assigned, missing: Math.max(0, r.periodsPerWeek - assigned) }; }).filter((g) => g.missing > 0);
}

export function workloadOf(entries: TimetableEntry[], teachers: Teacher[]): TeacherWorkload[] {
  const rows = teachers.map((t) => {
    const mine = entries.filter((e) => e.teacherId === t.id && isActive(e));
    const byDay = DAYS.map((d) => mine.filter((e) => e.dayOfWeek === d.n).length);
    return { teacherId: t.id, periods: mine.length, limit: t.workloadLimit, pct: Math.round((mine.length / t.workloadLimit) * 100), byDay, substitutions: entries.filter((e) => e.substituteTeacherId === t.id).length, classCount: new Set(mine.map((e) => e.classId)).size, flag: "balanced" as TeacherWorkload["flag"] };
  });
  const avg = rows.reduce((a, r) => a + r.pct, 0) / (rows.length || 1);
  return rows.map((r) => ({ ...r, flag: r.pct > 100 ? "over" : r.pct > avg + 20 ? "over" : r.pct < avg - 20 ? "under" : "balanced" }));
}

export const isFreeTeacher = (entries: TimetableEntry[], teacherId: string, day: number, period: string, ignoreId?: string) => !entries.some((e) => e.id !== ignoreId && isActive(e) && effTeacher(e) === teacherId && e.dayOfWeek === day && e.periodId === period);
export const isFreeRoom = (entries: TimetableEntry[], roomId: string, day: number, period: string, ignoreId?: string) => !entries.some((e) => e.id !== ignoreId && isActive(e) && e.roomId === roomId && e.dayOfWeek === day && e.periodId === period);
export const isFreeClass = (entries: TimetableEntry[], classId: string, day: number, period: string, ignoreId?: string) => !entries.some((e) => e.id !== ignoreId && e.classId === classId && e.dayOfWeek === day && e.periodId === period);

export function suggestFor(entry: TimetableEntry, entries: TimetableEntry[], ctx: Ctx): Suggestion[] {
  const out: Suggestion[] = []; const sug = (kind: Suggestion["kind"], label: string, detail: string, patch: EntryPatch) => out.push({ id: `${kind}:${entry.id}:${JSON.stringify(patch)}`, kind, label, detail, entryId: entry.id, patch });
  for (const t of ctx.teachers) {
    if (t.id === entry.teacherId || !t.subjectIds.includes(entry.subjectId)) continue;
    if (!isFreeTeacher(entries, t.id, entry.dayOfWeek, entry.periodId, entry.id) || teacherUnavailableReason(ctx, t.id, entry.dayOfWeek, entry.periodId)) continue;
    if (periodsOf(entries, t.id) >= t.workloadLimit) continue;
    sug("teacher", `Assign ${t.displayName}`, `${t.departmentName} · ${periodsOf(entries, t.id)}/${t.workloadLimit} periods, free ${dayLabel(entry.dayOfWeek)} ${periodLabel(entry.periodId)}`, { teacherId: t.id });
  }
  let n = 0;
  for (const d of DAYS) for (const p of TEACHING) {
    if (n >= 3) break; if (d.n === entry.dayOfWeek && p === entry.periodId) continue;
    const tid = effTeacher(entry);
    if (isFreeClass(entries, entry.classId, d.n, p, entry.id) && (!tid || (isFreeTeacher(entries, tid, d.n, p, entry.id) && !teacherUnavailableReason(ctx, tid, d.n, p))) && isFreeRoom(entries, entry.roomId, d.n, p, entry.id)) { sug("slot", `Move to ${d.short} ${periodLabel(p)}`, "Class, teacher and room are all free", { dayOfWeek: d.n, periodId: p }); n++; }
  }
  const cur = ctx.rooms.find((r) => r.id === entry.roomId);
  for (const r of ctx.rooms.filter((x) => x.id !== entry.roomId && x.kind === (cur?.kind ?? "classroom"))) if (isFreeRoom(entries, r.id, entry.dayOfWeek, entry.periodId, entry.id)) sug("room", `Use ${r.name}`, `${r.kind}, capacity ${r.capacity}, free at this time`, { roomId: r.id });
  return out.slice(0, 8);
}
