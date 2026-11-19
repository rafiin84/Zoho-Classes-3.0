import type { BranchMetrics, BranchRecord, DepartmentRecord, DirectoryPerson, HierarchyNode, Membership, ScheduledReport, PersonKind } from "@/types/institution";
import { BRANCH_SEED, DEPT_SEED, HIERARCHY, MEMBERSHIPS, METRICS_BASE, PEOPLE, CLASS_ROWS, SUBJECT_SCORES, TREND, TREND_DECLINING, TREND_MONTHS, TEACHER_ACTIVITY, REPORT_DEFS, objectiveGaps } from "../mock-data/institution";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { recordAudit } from "./governanceService";
import { INSTITUTIONS } from "../mock-data/core";

export interface Ctx { inst: string; branch: string; year: string; declining: boolean }
const branches: BranchRecord[] = structuredClone(BRANCH_SEED);
const depts: DepartmentRecord[] = structuredClone(DEPT_SEED);
const people: DirectoryPerson[] = structuredClone(PEOPLE);
const memberships: Membership[] = structuredClone(MEMBERSHIPS);
const trees: Record<string, HierarchyNode> = structuredClone(HIERARCHY);
const scheduled: ScheduledReport[] = [
  { id: "sr-1", name: "Weekly branch performance", cadence: "Weekly · Monday 8:00", recipients: "Principal, branch heads", state: "active", next: "2026-11-23" },
  { id: "sr-2", name: "Monthly fee collections", cadence: "Monthly · 1st", recipients: "Finance staff", state: "paused", next: "2026-12-01" },
];
let transitioned = false;
const yearFactor = (y: string) => (y === "ay-2025-26" ? 0.96 : 1);

const instBranches = (inst: string) => branches.filter((b) => b.institutionId === inst && b.status === "active");
export function metricsFor(ctx: Ctx): BranchMetrics[] {
  return instBranches(ctx.inst).filter((b) => ctx.branch === "all" || b.id === ctx.branch).map((b) => {
    const m = structuredClone(METRICS_BASE[b.id] ?? { branchId: b.id, engagement: 65, engagementDelta: 0, attendance: 90, completion: 60, avgScore: 68, support: 40, aiUsage: 800, interventions: 3 });
    const f = yearFactor(ctx.year);
    m.engagement = Math.round(m.engagement * f); m.avgScore = Math.round(m.avgScore * f); m.completion = Math.round(m.completion * f);
    if (b.id === "br-lakeside" && ctx.declining && ctx.year === "ay-2026-27") { m.engagement = 64; m.engagementDelta = -14; m.interventions += 3; }
    return m;
  });
}
const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0);
const bName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

export const institutionService = {
  /** ---- Overview ---- */
  overview: (ctx: Ctx) => simulate(() => {
    const ms = metricsFor(ctx), bs = instBranches(ctx.inst).filter((b) => ctx.branch === "all" || b.id === ctx.branch);
    const students = bs.reduce((s, b) => s + b.students, 0), teachers = bs.reduce((s, b) => s + b.teachers, 0);
    const lake = ms.find((m) => m.branchId === "br-lakeside");
    const alerts = [
      ...(lake && lake.engagementDelta <= -10 ? [{ id: "al-lake", tone: "danger" as const, text: `Lakeside Campus engagement fell ${Math.abs(lake.engagementDelta)}% this month (71 → ${lake.engagement}).`, branchId: "br-lakeside" }] : []),
      ...(ms.some((m) => m.completion < 60) ? [{ id: "al-comp", tone: "warning" as const, text: "Course completion is below 60% in at least one branch.", branchId: ms.find((m) => m.completion < 60)!.branchId }] : []),
      { id: "al-grade", tone: "warning" as const, text: "3 marksheet sets and 2 AI Teacher requests wait in Governance approvals.", branchId: "" },
    ];
    const recs = [
      ...(lake && lake.engagementDelta <= -10 ? [{ id: "rc-1", text: "Review Grade 9 · C mathematics: fractions mastery is 12 points below the institution average. Consider a remedial group and AI Teacher Euler assignment.", confidence: "Medium", based: "Mastery data from 3 assessments, 44 students; engagement dip may be seasonal or related to the timetable change — not proven causal." }] : []),
      { id: "rc-2", text: "Offer parent-teacher check-ins for students with two overdue assignments.", confidence: "High", based: "Assignment submission records, last 14 days." },
    ];
    return {
      students, teachers, metrics: ms,
      avg: { engagement: avg(ms.map((m) => m.engagement)), attendance: avg(ms.map((m) => m.attendance)), completion: avg(ms.map((m) => m.completion)), score: avg(ms.map((m) => m.avgScore)) },
      support: ms.reduce((s, m) => s + m.support, 0), aiUsage: ms.reduce((s, m) => s + m.aiUsage, 0), interventions: ms.reduce((s, m) => s + m.interventions, 0),
      engagementDelta: lake && ctx.branch !== "br-north" ? (ctx.branch === "all" ? Math.round(ms.reduce((s, m) => s + m.engagementDelta, 0) / ms.length) : lake.engagementDelta) : avg(ms.map((m) => m.engagementDelta)),
      trend: Object.fromEntries(ms.map((m) => [bName(m.branchId), (ctx.declining ? TREND_DECLINING : TREND)[m.branchId] ?? TREND["br-north"]])), months: TREND_MONTHS,
      alerts, recs, branchNames: Object.fromEntries(bs.map((b) => [b.id, b.name])),
    };
  }, { failKey: "institution" }),
  classes: (ctx: Ctx) => simulate(() => {
    const ids = new Set(instBranches(ctx.inst).map((b) => b.id));
    return CLASS_ROWS.filter((c) => ids.has(c.branchId) && (ctx.branch === "all" || c.branchId === ctx.branch)).map((c) => ({ ...c, branchName: bName(c.branchId), engagement: ctx.declining && c.branchId === "br-lakeside" ? c.engagement - 8 : c.engagement }));
  }),
  subjects: (branchId: string) => simulate(() => SUBJECT_SCORES[branchId] ?? SUBJECT_SCORES["br-north"]),
  gaps: (branchId: string, classId?: string) => simulate(() => objectiveGaps(branchId).map((g, i) => ({ ...g, mastery: classId ? Math.max(20, g.mastery - ((classId.length + i) % 7)) : g.mastery }))),
  teacherActivity: (ctx: Ctx) => simulate(() => TEACHER_ACTIVITY.filter((t) => ctx.inst === "inst-greenfield" && (ctx.branch === "all" || t.branchId === ctx.branch))),

  /** ---- Branches & departments ---- */
  branches: (inst: string) => simulate(() => branches.filter((b) => b.institutionId === inst)),
  saveBranch: (b: Partial<BranchRecord> & { name: string; institutionId: string }) => simulate(() => {
    if (b.name.trim().length < 3) throw new ServiceError("Branch name needs at least 3 characters.", "validation");
    if (branches.some((x) => x.id !== b.id && x.institutionId === b.institutionId && x.name.toLowerCase() === b.name.trim().toLowerCase())) throw new ServiceError("A branch with this name already exists.", "validation");
    if (b.id) { const x = branches.find((y) => y.id === b.id)!; Object.assign(x, b); recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Updated branch", category: "Tenant settings", target: x.name, context: "Branches & departments" }); return x; }
    const n: BranchRecord = { id: uid("br"), city: "", head: "Unassigned", students: 0, teachers: 0, status: "active", inherit: { grading: true, calendar: true, feePolicy: true, aiPolicy: true }, code: b.name.slice(0, 2).toUpperCase(), ...b };
    branches.push(n); recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Created branch", category: "Tenant settings", target: n.name, context: "Branches & departments" }); return n;
  }),
  archiveBranch: (id: string, archived: boolean) => simulate(() => { const b = branches.find((x) => x.id === id)!; if (archived && branches.filter((x) => x.institutionId === b.institutionId && x.status === "active").length <= 1) throw new ServiceError("An institution needs at least one active branch (or none at all).", "validation"); b.status = archived ? "archived" : "active"; recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: archived ? "Archived branch" : "Restored branch", category: "Tenant settings", target: b.name, context: "Branches & departments" }); return b; }),
  removeBranch: (id: string) => simulate(() => { const i = branches.findIndex((x) => x.id === id); if (i >= 0) { if (branches[i].students > 0) throw new ServiceError("This branch still has students. Archive it instead.", "validation"); branches.splice(i, 1); } return true; }),
  departments: (inst: string) => simulate(() => depts.filter((d) => d.institutionId === inst)),
  saveDepartment: (d: Partial<DepartmentRecord> & { name: string; institutionId: string }) => simulate(() => {
    if (d.name.trim().length < 2) throw new ServiceError("Department name is too short.", "validation");
    if (d.id) { const x = depts.find((y) => y.id === d.id)!; Object.assign(x, d); return x; }
    const n: DepartmentRecord = { id: uid("dep"), branchId: "all", head: "Unassigned", programmes: 0, status: "active", ...d }; depts.push(n); return n;
  }),
  removeDepartment: (id: string) => simulate(() => { const i = depts.findIndex((x) => x.id === id); if (i >= 0) depts.splice(i, 1); return true; }),

  /** ---- Hierarchy & memberships ---- */
  hierarchy: (inst: string) => simulate(() => trees[inst]),
  addGroup: (inst: string, parentId: string, name: string) => simulate(() => {
    if (name.trim().length < 3) throw new ServiceError("Group name needs at least 3 characters.", "validation");
    const find = (n: HierarchyNode): HierarchyNode | null => (n.id === parentId ? n : (n.children ?? []).map(find).find(Boolean) ?? null);
    const p = find(trees[inst]); if (!p) throw new ServiceError("Parent node not found.", "unavailable");
    (p.children ??= []).push({ id: uid("lg"), kind: "group", name: name.trim(), students: 0 }); return true;
  }),
  memberships: (personId?: string) => simulate(() => memberships.filter((m) => !personId || m.personId === personId)),
  addMembership: (m: Omit<Membership, "id" | "state">) => simulate(() => {
    if (m.end && m.end < m.start) throw new ServiceError("End date must be on or after the start date.", "validation");
    const state: Membership["state"] = m.start > "2026-11-19" ? "scheduled" : m.end && m.end < "2026-11-19" ? "ended" : "active";
    const n = { ...m, id: uid("m"), state }; memberships.unshift(n);
    recordAudit({ actor: "Registrar Office", actorRole: "Institution admin", action: "Added membership", category: "Role change", target: `${m.personName} → ${m.groupName}`, context: `Effective ${m.start}${m.end ? ` to ${m.end}` : ""}` }); return n;
  }),
  endMembership: (id: string, end: string) => simulate(() => { const m = memberships.find((x) => x.id === id)!; m.end = end; m.state = "ended"; return m; }),
  transitionPreview: (inst: string) => simulate(() => {
    const classes = CLASS_ROWS.filter((c) => (inst === "inst-meridian" ? c.branchId === "br-meridian-main" : c.branchId !== "br-meridian-main"));
    return { done: transitioned, rows: classes.map((c) => ({ id: c.id, from: c.name, to: /Year 3|Grade 9/.test(c.name) ? (inst === "inst-meridian" ? "Graduate → Alumni" : "Grade 10 (promote)") : c.name.replace(/(\d)/, (d) => String(Number(d) + 1)), students: c.students, promote: /Year 3/.test(c.name) ? 0 : c.students - 2, repeat: /Year 3/.test(c.name) ? 0 : 2, alumni: /Year 3/.test(c.name) ? c.students : 0 })) };
  }),
  runTransition: () => simulate(() => { transitioned = true; recordAudit({ actor: "Principal Anita Desai", actorRole: "Institution admin", action: "Ran academic-year transition", category: "Role change", target: "2026–27 → 2027–28", context: "Promote / archive / alumni (demo)" }); return true; }, { ms: 900 }),

  /** ---- People ---- */
  people: (inst: string, kind?: PersonKind) => simulate(() => people.filter((p) => p.institutionId === inst && (!kind || p.kind === kind)), { failKey: "people" }),
  setRole: (id: string, role: string, by = "Principal Anita Desai") => simulate(() => { const p = people.find((x) => x.id === id)!; const prev = p.role; p.role = role; recordAudit({ actor: by, actorRole: "Institution admin", action: "Changed role", category: "Role change", target: `${p.name} · ${prev} → ${role}`, context: "People & enrolments" }); return p; }),
  invite: (emails: string[], role: string, inst: string) => simulate(() => {
    const ok = emails.filter((e) => /^\S+@\S+\.\S+$/.test(e)), bad = emails.filter((e) => !/^\S+@\S+\.\S+$/.test(e));
    ok.forEach((e) => people.unshift({ id: uid("inv"), kind: role.includes("Student") ? "student" : role.includes("Parent") ? "parent" : "staff", name: e.split("@")[0], institutionId: inst, branchId: branches.find((b) => b.institutionId === inst)?.id ?? "", unit: "Pending", role, status: "invited", email: e, joined: new Date().toISOString().slice(0, 10), groups: [] }));
    if (ok.length) recordAudit({ actor: "Registrar Office", actorRole: "Institution admin", action: "Sent bulk invites (mock)", category: "Role change", target: `${ok.length} invitations as ${role}`, context: "People & enrolments" });
    return { sent: ok.length, invalid: bad };
  }, { ms: 600 }),
  verifyParent: (id: string, state: "verified" | "limited" | "pending-verification") => simulate(() => { const p = people.find((x) => x.id === id)!; p.status = state; recordAudit({ actor: "Registrar Office", actorRole: "Institution admin", action: `Parent relationship ${state}`, category: "Role change", target: p.name, context: "Prototype verification" }); return p; }),
  setAlumni: (id: string, alumni: boolean) => simulate(() => { const p = people.find((x) => x.id === id)!; p.status = alumni ? "alumni" : "active"; return p; }),

  /** ---- Analytics / reports ---- */
  analytics: (ctx: Ctx) => simulate(() => {
    const ms = metricsFor(ctx);
    return { metrics: ms, names: Object.fromEntries(branches.map((b) => [b.id, b.name])), trend: ctx.declining ? TREND_DECLINING : TREND, months: TREND_MONTHS, interventionEffect: [{ label: "Fractions remedial group (8B)", before: 52, after: 63, n: 8 }, { label: "Attendance nudge (Grade 9)", before: 86, after: 90, n: 44 }, { label: "AI Teacher Euler assignment (7A)", before: 61, after: 66, n: 38 }] };
  }),
  reportDefs: () => simulate(() => REPORT_DEFS),
  scheduled: () => simulate(() => scheduled),
  addScheduled: (r: { name: string; cadence: string; recipients: string }) => simulate(() => { if (!r.name.trim()) throw new ServiceError("Name the scheduled report.", "validation"); const n: ScheduledReport = { id: uid("sr"), state: "active", next: "2026-11-26", ...r }; scheduled.unshift(n); return n; }),
  toggleScheduled: (id: string) => simulate(() => { const s = scheduled.find((x) => x.id === id)!; s.state = s.state === "active" ? "paused" : "active"; return s; }),
  institution: (id: string) => INSTITUTIONS.find((i) => i.id === id),
};
