import type { RosterRow } from "@/types/teacher";
import type { Classroom } from "@/types";
import { CLASSROOMS, STUDENTS, TEACHERS, subjectById } from "../mock-data/core";
import { simulate } from "./latency";
import { simulateAsync } from "./teacherSim";
import { learningProfileService } from "./learningProfileService";
import { assignmentService } from "./assignmentService";
import { DEMO_NOW } from "../format";

/** Light synthetic rosters so Priya's 8A and 7A classes are not empty. IDs are class-local; 8B uses the shared STUDENTS. */
const SYNTH_NAMES: Record<string, string[]> = {
  "cls-8a": ["Aditi Verma", "Harsh Vora", "Lakshmi Pai", "Imran Sheikh", "Neha Bhatt", "Yash Kulkarni"],
  "cls-7a": ["Bhavna Reddy", "Chirag Shah", "Diya Thomas", "Eshan Gupta", "Fatima Noor"],
};
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const COLORS = ["#5146E5", "#7044D8", "#1D6FB8", "#12805C", "#9A5B00", "#C0262D"];
export interface RosterStudent { id: string; name: string; color: string; classId: string; synthetic: boolean; pendingBaseline: boolean }
export const rosterStudents = (classId: string): RosterStudent[] => {
  const real = STUDENTS.filter((s) => s.classId === classId).map((s) => ({ id: s.id, name: s.displayName, color: s.avatarColor, classId, synthetic: false, pendingBaseline: s.status === "pending-baseline" }));
  const synth = (SYNTH_NAMES[classId] ?? []).map((n, i) => ({ id: `stu-${classId.slice(4)}-${i + 1}`, name: n, color: COLORS[i % COLORS.length], classId, synthetic: true, pendingBaseline: false }));
  return [...real, ...synth];
};
export const nameOf = (id: string) => { const s = STUDENTS.find((x) => x.id === id); if (s) return s.displayName; for (const [cls, names] of Object.entries(SYNTH_NAMES)) { const i = Number(/-(\d+)$/.exec(id)?.[1] ?? 0) - 1; if (id.startsWith(`stu-${cls.slice(4)}-`) && names[i]) return names[i]; } return id; };

export interface ClassSummary extends Classroom { label: string; subjects: { id: string; name: string; color: string }[]; studentCount: number; courseIds: string[]; avgMath: number; attentionCount: number }
export interface AttentionItem { studentId: string; name: string; classId: string; reasons: string[]; severity: "high" | "medium" | "low"; gapId?: string; gapLabel?: string }

async function buildRoster(classId: string): Promise<RosterRow[]> {
  const [profiles, remedial] = await Promise.all([learningProfileService.all(), learningProfileService.allRemedial()]);
  return rosterStudents(classId).map((s): RosterRow => {
    const p = profiles.find((x) => x.studentId === s.id); const h = hash(s.id);
    const estimated = !p || !p.objectives.length;
    const mastery = p && Object.keys(p.subjectMastery).length ? p.subjectMastery : s.pendingBaseline ? {} : { "sub-math": 55 + (h % 38) };
    const gaps = (p?.gaps ?? []).map((g) => ({ id: g.id, label: g.label, severity: g.severity }));
    const rem = remedial.find((r) => r.studentId === s.id && r.status !== "completed");
    const attention: string[] = [];
    gaps.filter((g) => g.severity !== "low").forEach((g) => attention.push(`${g.severity === "high" ? "High" : "Medium"} gap: ${g.label}`));
    if (s.pendingBaseline) attention.push("Baseline assessment not completed");
    if (p && p.weeklyGoalMinutes && p.weeklyMinutes < p.weeklyGoalMinutes * 0.5 && !s.pendingBaseline && p.objectives.length) attention.push(`Low weekly activity (${p.weeklyMinutes} of ${p.weeklyGoalMinutes} min)`);
    return { studentId: s.id, name: s.name, color: s.color, classId, mathMastery: mastery["sub-math"] ?? 0, mastery, streak: p?.streak.current ?? (h % 6), weeklyMinutes: p?.weeklyMinutes ?? 40 + (h % 70), weeklyGoal: p?.weeklyGoalMinutes ?? 120, gaps, remedial: rem ? { id: rem.id, status: rem.status } : undefined, estimated, attention };
  });
}

export const teacherInsightService = {
  classes: (teacherId: string) => simulateAsync(async (): Promise<ClassSummary[]> => {
    const t = TEACHERS.find((x) => x.id === teacherId); if (!t) return [];
    const out: ClassSummary[] = [];
    const rosters = await Promise.all(t.classIds.map((id) => buildRoster(id)));
    for (const [i, id] of t.classIds.entries()) {
      const c = CLASSROOMS.find((x) => x.id === id)!; const roster = rosters[i];
      out.push({ ...c, label: c.name, subjects: t.subjectIds.map((s) => subjectById(s)), studentCount: roster.length, courseIds: id === "cls-8b" ? ["crs-fractions"] : [], avgMath: roster.length ? Math.round(roster.reduce((a, r) => a + r.mathMastery, 0) / roster.length) : 0, attentionCount: roster.filter((r) => r.attention.length).length });
    }
    return out;
  }),
  roster: (classId: string) => simulateAsync(() => buildRoster(classId)),
  attention: (teacherId: string) => simulateAsync(async (): Promise<AttentionItem[]> => {
    const t = TEACHERS.find((x) => x.id === teacherId); const items: AttentionItem[] = [];
    const [subs, asgs, rosters] = await Promise.all([assignmentService.allSubmissions(), assignmentService.list(), Promise.all((t?.classIds ?? []).map(async (cid) => [cid, await buildRoster(cid)] as const))]);
    for (const [cid, rs] of rosters) for (const r of rs) {
      const reasons = [...r.attention];
      subs.filter((s) => s.studentId === r.studentId && s.status === "overdue" && asgs.find((a) => a.id === s.assignmentId)?.teacherId === teacherId).forEach((s) => reasons.push(`Overdue: ${asgs.find((a) => a.id === s.assignmentId)?.title}`));
      if (reasons.length) { const g = r.gaps.find((x) => x.severity !== "low"); items.push({ studentId: r.studentId, name: r.name, classId: cid, reasons, severity: r.gaps.some((x) => x.severity === "high") ? "high" : reasons.length > 1 ? "medium" : "low", gapId: g?.id, gapLabel: g?.label }); }
    }
    return items.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - { high: 0, medium: 1, low: 2 }[b.severity]));
  }),
  /** Submissions awaiting teacher review (status "submitted") on this teacher's assignments. Overview, Assessments and Workspace all use this one list. */
  gradingQueue: (teacherId: string) => simulateAsync(async () => {
    const asgs = (await assignmentService.list()).filter((a) => a.teacherId === teacherId); const subs = await assignmentService.allSubmissions();
    return subs.filter((s) => s.status === "submitted" && asgs.some((a) => a.id === s.assignmentId)).map((s) => ({ submission: s, assignment: asgs.find((a) => a.id === s.assignmentId)!, studentName: nameOf(s.studentId) }));
  }),
};
export const isPast = (iso: string) => new Date(iso).getTime() < DEMO_NOW.getTime();
