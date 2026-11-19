import type { District, GovInstitution, OverviewData, ClassRow, ObjectiveRow, GradeRow, AssessmentConfig, ApprovalItem, AuditEntry, ObjectiveDetail, KgObjective, MetricKey } from "@/types/government";
import { DISTRICTS, INSTITUTIONS_BY_DISTRICT, allInstitutions, classRows, gradeRows, objectiveRows, ASSESSMENT_SEED, hash, jitter, SRC, AS_OF, RESOURCES } from "../mock-data/government";
import { OBJECTIVES, GRADES, SUBJECTS, CURRICULUM, AY, subjectById } from "../mock-data/core";
import { COURSES, ACTIVITIES } from "../mock-data/content";
import { simulate, ServiceError } from "./latency";
import { uid } from "../utils";
import { programmeService } from "./programmeService";
import { distributionService } from "./distributionService";
import { aiTeacherService } from "./aiTeacherService";
import { recordAudit, auditEntries } from "./govAudit";

const assessments: AssessmentConfig[] = structuredClone(ASSESSMENT_SEED);
const accessRequests: { id: string; scope: string; at: string; status: "pending" }[] = [];

export const districtsWith = (low: boolean): District[] => DISTRICTS.map((d) => (low && d.id === "nilgiri-hills" ? { ...d, baselineCoverage: 41, completeness: 64 } : d));
const wavg = (ds: District[], k: (d: District) => number) => ds.reduce((a, d) => a + k(d) * d.students, 0) / ds.reduce((a, d) => a + d.students, 0);
export const METRICS: { key: MetricKey; label: string; unit: string; get: (d: District) => number }[] = [
  { key: "baselineCoverage", label: "Baseline coverage", unit: "%", get: (d) => d.baselineCoverage },
  { key: "mathsProficiency", label: "Maths proficiency", unit: "%", get: (d) => d.mathsFollowUp },
  { key: "engagement", label: "Engagement", unit: "%", get: (d) => d.engagement },
  { key: "improvement", label: "Improvement vs baseline", unit: " pts", get: (d) => d.improvement },
];

export const governmentService = {
  METRICS,
  districts: (low = false) => simulate(() => districtsWith(low), { failKey: "government" }),
  overview: (low = false) => simulate((): OverviewData => {
    const ds = districtsWith(low);
    const cov = Math.round(wavg(ds, (d) => d.baselineCoverage));
    const complete = Math.round(cov * 0.88), inProgress = Math.round((100 - complete) * 0.45);
    const nilgiri = ds.find((d) => d.id === "nilgiri-hills")!;
    return {
      districts: ds,
      headline: { students: ds.reduce((a, d) => a + d.students, 0), teachers: ds.reduce((a, d) => a + d.teachers, 0), institutions: ds.reduce((a, d) => a + d.institutions, 0), baselineCoverage: cov, participation: 64, improvement: Math.round(wavg(ds, (d) => d.improvement) * 10) / 10, asOf: AS_OF },
      baselineBreakdown: { complete, inProgress, notStarted: 100 - complete - inProgress },
      subjectGrade: { grades: GRADES.map((g) => g.label.replace("Grade ", "G")), subjects: SUBJECTS.map((s) => s.name), values: GRADES.map((g) => SUBJECTS.map((s) => jitter(g.id + s.id, s.id === "sub-math" ? 41 : 28, 12, 8, 60))) },
      consumption: [{ label: "Videos viewed", value: 4_210_000 }, { label: "MCQ sets attempted", value: 2_980_000 }, { label: "Games played", value: 1_240_000 }, { label: "Course units completed", value: 860_000 }],
      trend: { labels: ["Aug 2026 (baseline)", "Oct 2026", "Nov 2026 (follow-up 1)"], baseline: [56, 56, 56], followUp: [56, 59, 63] },
      alerts: [
        ...(low ? [{ id: "al-nil", tone: "danger" as const, title: "Nilgiri Hills baseline coverage is 41%", body: "Below the 60% minimum for reliable comparison. 1.2 lakh students in demo scale have no baseline yet, so improvement there cannot be measured.", source: SRC.baseline, href: "/government/districts/nilgiri-hills" }] : []),
        { id: "al-eng", tone: "warning" as const, title: "Engagement declined in Eastern Marches", body: `Engagement fell from ${ds.find((d) => d.id === "eastern-marches")!.engagementPrev}% to ${ds.find((d) => d.id === "eastern-marches")!.engagement}% over 30 days. Cause not established. Check connectivity and term-break timing before acting.`, source: SRC.engagement, href: "/government/districts/eastern-marches" },
        { id: "al-dist", tone: "info" as const, title: "1 statewide distribution awaiting approval", body: "Science Grade 8 Hindi-medium pack (12 resources, all districts).", source: SRC.content, href: "/government/governance" },
        { id: "al-p2", tone: "info" as const, title: "Mission Maths Mastery Phase 2 awaiting approval", body: "Submitted 2 days ago for four low-proficiency districts.", source: SRC.programmes, href: "/government/programmes/prg-maths-p2" },
      ],
      recommendations: [
        { id: "rec-1", title: "Prioritise baseline completion in " + (low ? nilgiri.name : "Misty Ridge"), body: low ? "Nilgiri Hills is the largest coverage gap. A 2-week completion window with district officer follow-up is suggested." : "Misty Ridge has partial district data; completing baseline would make comparisons reliable.", basis: "Coverage below the state mean; partial data flag", cta: { label: "Review baseline coverage", href: "/government/assessments" } },
        { id: "rec-2", title: "Extend remedial fractions support to Grade 7", body: "Fractions objectives show the widest maths gap in Grades 7–8. Correlation with school type is not established.", basis: "District x objective gap analysis", cta: { label: "Open learning gaps", href: "/government/learning-gaps" } },
        { id: "rec-3", title: "Review the delayed teacher workshop", body: "Teacher workshop in two districts is 3 weeks behind. AI suggests re-scheduling with district officers.", basis: "Programme delivery records", cta: { label: "Open Mission Maths Mastery", href: "/government/programmes/prg-mission-maths" } },
      ],
    };
  }, { failKey: "government" }),

  institutions: (districtId: string) => simulate((): GovInstitution[] => INSTITUTIONS_BY_DISTRICT[districtId] ?? []),
  allInstitutions: () => simulate(() => allInstitutions()),
  institution: (id: string) => simulate(() => allInstitutions().find((i) => i.id === id) ?? null),
  classes: (institutionId: string) => simulate((): ClassRow[] => { const i = allInstitutions().find((x) => x.id === institutionId); return i ? classRows(i) : []; }),
  grades: (kind: "district" | "institution", id: string) => simulate((): GradeRow[] => {
    if (kind === "district") { const d = DISTRICTS.find((x) => x.id === id); return d ? gradeRows({ baselineCoverage: d.baselineCoverage, mathsProficiency: d.mathsFollowUp, improvement: d.improvement }, id) : []; }
    const i = allInstitutions().find((x) => x.id === id); return i ? gradeRows(i, id) : [];
  }),
  objectives: (seed: string, base = 55) => simulate((): ObjectiveRow[] => objectiveRows(seed, base)),

  /** Student-level access is never automatic. Requests go to the institution that owns the data. */
  requestStudentAccess: (scope: string, purpose: string) => simulate(() => {
    if (purpose.trim().length < 15) throw new ServiceError("State the purpose in at least 15 characters. Requests are visible to the institution.", "validation");
    const r = { id: uid("acc"), scope, at: new Date().toISOString(), status: "pending" as const }; accessRequests.unshift(r);
    recordAudit({ action: "Requested scoped student-level access", entity: scope, entityType: "access", detail: purpose, outcome: "success" });
    return r;
  }),
  accessRequests: () => accessRequests,

  gaps: (low = false) => simulate(() => {
    const ds = districtsWith(low);
    const objs = OBJECTIVES.filter((o) => ["sub-math", "sub-sci"].includes(o.subjectId)).slice(0, 8);
    const mastery = ds.map((d) => objs.map((o) => jitter(d.id + o.id, d.mathsBaseline + (o.subjectId === "sub-math" ? -6 : 8), 14, 12, 92)));
    const sev = mastery.map((r) => r.map((m) => (m < 35 ? 3 : m < 48 ? 2 : m < 62 ? 1 : 0)));
    const cohorts = [
      { id: "co-1", label: "Grade 8 · below 40% on fractions (M8.3.x)", students: 412_000, severity: "high" as const, trend: "improving" as const, objective: "lo-frac-add" },
      { id: "co-2", label: "Grade 7 · below 40% on ratio & proportion", students: 268_000, severity: "high" as const, trend: "flat" as const, objective: "lo-ratio" },
      { id: "co-3", label: "Grade 8 · linear equations, partial mastery", students: 355_000, severity: "medium" as const, trend: "improving" as const, objective: "lo-alg-lin" },
      { id: "co-4", label: "Grade 8 · ecological balance concepts", students: 190_000, severity: "medium" as const, trend: "flat" as const, objective: "lo-eco-bal" },
      { id: "co-5", label: "Grade 6 · word problems with fractions", students: 301_000, severity: "high" as const, trend: "worsening" as const, objective: "lo-frac-word" },
    ];
    const schools = allInstitutions().map((i) => ({ id: i.id, name: i.name, district: ds.find((d) => d.id === i.districtId)!.name, districtId: i.districtId, proficiency: i.mathsProficiency, coverage: i.baselineCoverage, improvement: i.improvement, partial: i.dataStatus === "partial" }))
      .sort((a, b) => a.proficiency - b.proficiency).slice(0, 12).map((s) => ({ ...s, severity: s.proficiency < 45 ? ("high" as const) : s.proficiency < 58 ? ("medium" as const) : ("low" as const), trend: s.improvement >= 7 ? ("improving" as const) : ("flat" as const) }));
    const subjects = SUBJECTS.map((s) => ({ id: s.id, name: s.name, gapPct: jitter(s.id + "gap", s.id === "sub-math" ? 41 : 29, 8, 12, 60), previous: jitter(s.id + "gapp", s.id === "sub-math" ? 47 : 33, 8, 12, 60) }));
    return { districts: ds, objectives: objs, mastery, severity: sev, cohorts, schools, subjects, source: SRC.baseline };
  }),

  /* ---------- Assessments ---------- */
  assessments: () => simulate(() => [...assessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), { failKey: "assessments" }),
  createAssessment: (i: { name: string; layer: AssessmentConfig["layer"]; gradeId: string; subjectId: string; year: string; objectiveIds: string[]; mandatory: boolean }) => simulate(() => {
    if (i.name.trim().length < 3) throw new ServiceError("Name the assessment.", "validation");
    if (!i.objectiveIds.length) throw new ServiceError("Select at least one learning objective.", "validation");
    if (assessments.some((a) => a.layer === "baseline" && i.layer === "baseline" && a.gradeId === i.gradeId && a.subjectId === i.subjectId && a.year === i.year)) throw new ServiceError("A baseline already exists for this grade, subject and year. Baselines are never overwritten. Create a progress assessment instead.", "validation");
    const a: AssessmentConfig = { id: uid("asm"), name: i.name.trim(), layer: i.layer, gradeId: i.gradeId, subjectId: i.subjectId, curriculum: CURRICULUM.name, year: i.year, objectiveIds: i.objectiveIds, mandatory: i.layer === "baseline" ? true : i.mandatory, state: "not-started", followUp: i.layer === "baseline" ? "pending" : "n/a", coverage: 0, completion: 0, proficiency: 0, mastery: 0, locked: i.layer === "baseline", createdAt: new Date().toISOString(), createdBy: "State official (demo)" };
    assessments.unshift(a); recordAudit({ action: "Configured assessment", entity: a.name, entityType: "assessment", detail: `${a.layer}, ${i.objectiveIds.length} objectives, ${a.mandatory ? "mandatory" : "optional"}.` }); return a;
  }),
  interventionEffect: async () => {
    const ps = await programmeService.list();
    return simulate(ps.flatMap((p) => p.interventions.map((iv) => ({ id: iv.id, programme: p.name, title: iv.title, status: iv.status, effect: iv.status === "planned" ? null : Math.round((1.5 + hash(iv.id) * 6) * 10) / 10, sample: iv.status === "planned" ? 0 : 20_000 + Math.round(hash(iv.id + "n") * 400_000) }))));
  },

  /* ---------- Approvals & audit ---------- */
  approvals: async (): Promise<ApprovalItem[]> => {
    const [ps, ts] = await Promise.all([programmeService.list({ status: "awaiting-approval" }), aiTeacherService.list({ status: "awaiting-approval", ownerType: "government" })]);
    const ds = distributionService.awaiting();
    return simulate([
      ...ps.map((p): ApprovalItem => ({ id: p.id, kind: "programme", title: p.name, submittedBy: p.createdBy, at: p.submittedAt ?? p.updatedAt, scope: p.statewide ? "Statewide launch" : `${p.districtIds.length} districts`, summary: p.objective, risk: p.statewide ? "high" : "medium", href: `/government/programmes/${p.id}` })),
      ...ts.map((t): ApprovalItem => ({ id: t.id, kind: "ai-teacher", title: `AI Teacher: ${t.name}`, submittedBy: t.owner, at: t.submittedAt ?? t.createdAt, scope: `${t.subject}, ${t.grade}`, summary: `Sources: ${t.sources.join(", ") || "none"}. Distinct from students' personal AI Tutor.`, risk: "medium", href: "/government/ai" })),
      ...ds.map((d): ApprovalItem => ({ id: d.id, kind: "distribution", title: `Distribution: ${d.note || d.resourceTitles[0]}`, submittedBy: d.by, at: d.at, scope: d.districtLabel, summary: `${d.resources} resources to about ${d.students.toLocaleString("en-IN")} students (demo scale).`, risk: d.districtIds.length >= 12 ? "high" : "medium", href: "/government/distribution" })),
    ].sort((a, b) => b.at.localeCompare(a.at)));
  },
  decide: async (it: ApprovalItem, decision: "approved" | "rejected", note: string, confirmStatewide = false) => {
    await simulate(null);
    const by = "Secretary, School Education (demo)";
    if (it.kind === "programme") return decision === "approved" ? programmeService.approve(it.id, by, note, confirmStatewide) : programmeService.reject(it.id, by, note);
    if (it.kind === "distribution") { if (decision === "approved" && it.risk === "high" && !confirmStatewide) throw new ServiceError("Statewide distribution needs explicit confirmation.", "permission"); return distributionService.decide(it.id, decision, by, note); }
    if (decision === "approved") { const t = await aiTeacherService.approve(it.id, by); recordAudit({ actor: by, role: "Approver", action: "Approved AI Teacher", entity: t.name, entityType: "ai-teacher", detail: note }); return t; }
    const t = await aiTeacherService.reject(it.id, note); recordAudit({ actor: by, role: "Approver", action: "Rejected AI Teacher", entity: t.name, entityType: "ai-teacher", detail: note, outcome: "rejected" }); return t;
  },
  audit: (f: { q?: string; type?: string; outcome?: string } = {}) => simulate((): AuditEntry[] => auditEntries().filter((e) => (!f.type || e.entityType === f.type) && (!f.outcome || e.outcome === f.outcome) && (!f.q || `${e.action} ${e.entity} ${e.actor} ${e.detail}`.toLowerCase().includes(f.q.toLowerCase())))),
  record: recordAudit,

  /* ---------- Reports ---------- */
  report: (id: string, f: { districtId?: string; gradeId?: string; range?: string } = {}, low = false) => simulate(() => {
    let ds = districtsWith(low); if (f.districtId) ds = ds.filter((d) => d.id === f.districtId);
    const rangeLabel = { "30d": "last 30 days", "90d": "last 90 days", ay: `academic year ${AY.label}` }[f.range ?? "ay"] ?? "academic year";
    const scale = f.range === "30d" ? 0.35 : f.range === "90d" ? 0.7 : 1;
    const gl = f.gradeId ? GRADES.find((g) => g.id === f.gradeId)?.label ?? "" : "All grades";
    const ctx = `${rangeLabel}, ${gl}`;
    const R = (title: string, columns: string[], rows: (string | number)[][], chart: { label: string; value: number }[], unit: string, defs: [string, string][], source: string, note?: string) => ({ id, title, columns, rows, chart, unit, definitions: defs.map(([term, text]) => ({ term, text })), source, context: ctx, note });
    switch (id) {
      case "baseline-followup": return R("Baseline vs follow-up by district (Maths)", ["District", "Baseline %", "Follow-up %", "Change (pts)", "Data"], ds.map((d) => [d.name, d.mathsBaseline, d.mathsFollowUp, d.improvement, d.dataStatus === "partial" ? "Partial" : "Complete"]), ds.map((d) => ({ label: d.name, value: d.improvement })), " pts", [["Baseline", "First mandatory assessment at a student's first login. Never overwritten."], ["Follow-up", "Periodic progress assessment compared to the ORIGINAL baseline."], ["Change", "Follow-up minus baseline in percentage points. Association, not proof of programme effect."]], SRC.followUp, "Partial-data districts are shown but should not be ranked.");
      case "programme-effect": return R("Programme effectiveness", ["Programme", "Participation %", "Completion %", "Avg change (pts)"], [["Mission Maths Mastery (Phase 1)", 64, 47, 7], ["Science Literacy Drive 2025–26", 78, 71, 8]], [{ label: "Mission Maths Mastery", value: 7 }, { label: "Science Literacy Drive", value: 8 }], " pts", [["Participation", "Share of targeted students who started at least one intervention."], ["Avg change", "Mean follow-up minus baseline among participants. Not causal: non-participants differ."]], SRC.programmes, "Correlation is not causation. Compare with matched non-participating groups before concluding effect.");
      case "participation": return R("Participation by district", ["District", "Participation %", "Students (demo scale)"], ds.map((d) => [d.name, jitter(d.id + "part", 64, 12), d.students]), ds.map((d) => ({ label: d.name, value: jitter(d.id + "part", 64, 12) })), "%", [["Participation", "Active students in a state programme divided by targeted students."]], SRC.programmes);
      case "consumption": return R("Content consumption", ["District", "Views (k)", "Completions (k)"], ds.map((d) => [d.name, Math.round(d.students * 0.0072 * scale), Math.round(d.students * 0.0041 * scale)]), ds.map((d) => ({ label: d.name, value: Math.round(d.students * 0.0072 * scale) })), "k", [["Views", "Resource opens by students, counted once per session."], ["Completions", "Resource finished to its defined end condition."]], SRC.content);
      case "gap-trend": return R("Learning-gap trend (Maths)", ["Period", "Students below proficiency %"], [["Aug 2026 (baseline)", 52], ["Oct 2026", 47], ["Nov 2026", 43]], [{ label: "Aug", value: 52 }, { label: "Oct", value: 47 }, { label: "Nov", value: 43 }], "%", [["Below proficiency", "Share of assessed students scoring under the state proficiency threshold (50%)."]], SRC.followUp, "Only assessed students are counted. Coverage varies by district.");
      default: return R("Institution compliance", ["Institution", "District", "Baseline coverage %", "Status"], allInstitutions().filter((i) => !f.districtId || i.districtId === f.districtId).slice(0, 14).map((i) => [i.name, DISTRICTS.find((d) => d.id === i.districtId)!.name, i.baselineCoverage, i.baselineCoverage >= 80 ? "Compliant" : i.baselineCoverage >= 60 ? "Near target" : "Below minimum"]), allInstitutions().filter((i) => !f.districtId || i.districtId === f.districtId).slice(0, 10).map((i) => ({ label: i.name.slice(0, 14), value: i.baselineCoverage })), "%", [["Compliance", "Baseline coverage of at least 80% of enrolled students."]], SRC.baseline);
    }
  }),

  /* ---------- Knowledge graph ---------- */
  kgObjectives: () => simulate((): KgObjective[] => OBJECTIVES.map((o, i) => ({ id: o.id, code: o.code, title: o.title, subjectId: o.subjectId, gradeId: o.gradeId, chapter: o.chapter, competency: o.competency, language: i % 4 === 3 ? "Hindi" : "English" }))),
  objectiveDetail: (id: string) => simulate((): ObjectiveDetail | null => {
    const o = OBJECTIVES.find((x) => x.id === id); if (!o) return null;
    const acts = ACTIVITIES.filter((a) => a.learningObjectiveIds.includes(id));
    const courseIds = [...new Set(acts.map((a) => a.courseId))];
    const sub = subjectById(o.subjectId).name;
    return {
      objective: { id: o.id, code: o.code, title: o.title, subjectId: o.subjectId, gradeId: o.gradeId, chapter: o.chapter, competency: o.competency, language: "English" },
      resources: RESOURCES.filter((r) => r.objectiveId === id), competency: o.competency,
      courses: courseIds.map((c) => ({ id: c, title: COURSES.find((x) => x.id === c)?.title ?? c, activityCount: acts.filter((a) => a.courseId === c).length })),
      activities: acts.map((a) => ({ id: a.id, title: a.title, type: a.type, courseId: a.courseId })),
      assessments: [{ id: `${id}-base`, title: `${o.code} baseline items`, kind: "Baseline", questions: 6 }, { id: `${id}-mcq`, title: `${o.code} continuous MCQs`, kind: "Continuous", questions: 14 }, { id: `${id}-prog`, title: `${o.code} progress check`, kind: "Progress", questions: 8 }],
      descriptors: [{ level: "Emerging", text: `Recognises the basic idea of "${o.title.toLowerCase()}" with support.` }, { level: "Developing", text: `Applies ${sub.toLowerCase()} steps for routine questions; errors under new contexts.` }, { level: "Secure", text: `Independently ${o.title.toLowerCase()} and explains the method.` }, { level: "Extending", text: `Transfers the objective to unfamiliar, multi-step problems.` }],
      remedial: [{ id: `${id}-r1`, title: `Revisit prerequisites for ${o.code}`, kind: "Practice set" }, { id: `${id}-r2`, title: `${o.chapter}: short remedial video`, kind: "Video" }, { id: `${id}-r3`, title: `Peer-explain activity for ${o.code}`, kind: "Group activity" }],
    };
  }),
};
