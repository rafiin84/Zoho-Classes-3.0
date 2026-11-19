// Internal mutable store shared by timetableService and staffAllocationService (not a public API).
import type { TimetableEntry } from "@/types/academic";
import type { AllocationAudit, ChangeProposal, PeriodRequirement, StaffProfile, TimetableVersion } from "@/types/timetable";
import { TIMETABLE_SEED, ROOMS } from "../mock-data/academic";
import { TEACHERS } from "../mock-data/core";
import { CALENDAR, PROFILES_SEED, REQUIREMENTS_OTHER, AUDIT_SEED } from "../mock-data/staffAllocation";
import type { Ctx } from "../timetable/engine";

/** The foundation seed has accidental double-bookings; normalise it so the ONLY seeded clash is Daniel's Tue P4 (8B Science vs 9C Science). */
function normalise(seed: TimetableEntry[]): TimetableEntry[] {
  const list = structuredClone(seed);
  const move = (id: string, periodId: string) => { const e = list.find((x) => x.id === id); if (e) { e.periodId = periodId; e.id = e.id.replace(/-p\d$/, `-${periodId}`); } };
  move("tt-cls-8a-2-p1", "p6"); move("tt-cls-8a-5-p4", "p6"); move("tt-cls-7a-2-p5", "p6");
  const p2 = list.find((x) => x.id === "tt-cls-8b-2-p2"), p4 = list.find((x) => x.id === "tt-cls-8b-2-p4");
  if (p2 && p4) { Object.assign(p2, { subjectId: "sub-math", teacherId: "tch-priya", roomId: "rm-8b" }); Object.assign(p4, { subjectId: "sub-sci", teacherId: "tch-daniel", roomId: "rm-sci", note: "Conflict: Daniel Okafor is also scheduled for Grade 9 · C Science in this period." }); }
  return list;
}
const base = normalise(TIMETABLE_SEED);
const req8b: PeriodRequirement[] = (() => {
  const m = new Map<string, number>(); base.filter((e) => e.classId === "cls-8b").forEach((e) => m.set(e.subjectId, (m.get(e.subjectId) ?? 0) + 1));
  return [...m.entries()].map(([subjectId, n]) => ({ id: `rq-8b-${subjectId}`, classId: "cls-8b", subjectId, periodsPerWeek: n, roomKind: subjectId === "sub-sci" || subjectId === "sub-cs" ? "lab" as const : "classroom" as const }));
})();

export const store = {
  published: structuredClone(base) as TimetableEntry[],
  draft: structuredClone(base) as TimetableEntry[],
  version: 1,
  publishedAt: AUDIT_SEED[0].at as string | undefined,
  history: [] as TimetableVersion[],
  audit: structuredClone(AUDIT_SEED) as AllocationAudit[],
  proposals: [] as ChangeProposal[],
  profiles: structuredClone(PROFILES_SEED) as StaffProfile[],
  requirements: [...req8b, ...structuredClone(REQUIREMENTS_OTHER)] as PeriodRequirement[],
  calendar: structuredClone(CALENDAR),
};
export const ctx = (): Ctx => ({ profiles: store.profiles, requirements: store.requirements, teachers: TEACHERS, rooms: ROOMS, weekStart: store.calendar.weekStart });
export const sameEntries = (a: TimetableEntry[], b: TimetableEntry[]) => JSON.stringify([...a].sort((x, y) => x.id.localeCompare(y.id))) === JSON.stringify([...b].sort((x, y) => x.id.localeCompare(y.id)));
let n = 0;
export const auditAdd = (by: string, action: AllocationAudit["action"], detail: string, reason?: string, conflicts?: string[]) => { store.audit.unshift({ id: `au-${Date.now()}-${n++}`, at: new Date().toISOString(), by, action, detail, reason, conflicts }); };
