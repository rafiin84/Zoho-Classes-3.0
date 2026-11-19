// Government seed data. ALL FICTIONAL DEMO DATA for the fictional Karuvana State. Not real statistics.
import type { District, GovInstitution, ClassRow, ObjectiveRow, GradeRow, ResourceRecord, ProgrammeRecord, ProgrammeDraft, DistributionRecord, AssessmentConfig, AuditEntry, StateAgent, ResourceType } from "@/types/government";
import { OBJECTIVES, GRADES, BRANCHES, subjectById, CURRICULUM, AY } from "./core";
import { ago, inDays } from "@/lib/format";

export const AS_OF = "19 Nov 2026, 10:30 IST";
export const DEMO_NOTE = "Demo data: fictional Karuvana State, illustrative scale";
export const SRC = {
  baseline: `Source: baseline assessments (demo data) · as of ${AS_OF}`,
  engagement: `Source: platform activity logs (demo data) · last 30 days to ${AS_OF}`,
  programmes: `Source: programme delivery records (demo data) · as of ${AS_OF}`,
  content: `Source: content distribution & consumption logs (demo data) · as of ${AS_OF}`,
  followUp: `Source: baseline vs follow-up 1 (Nov 2026), demo data · as of ${AS_OF}`,
  scale: `Illustrative demo scale, fictional state · as of ${AS_OF}`,
  inventory: "Illustrative programme figures, not verified platform inventory",
};
export const ILLUSTRATIVE = { videos: 20000, mcqs: 10000, games: 200, courses: 220 };

/** Deterministic pseudo-random in [0,1) from a string. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
export const jitter = (seed: string, base: number, spread: number, lo = 5, hi = 98) => Math.round(Math.max(lo, Math.min(hi, base + (hash(seed) - 0.5) * 2 * spread)));

const D = (id: string, name: string, region: District["region"], col: number, row: number, st: number, inst: number, cov: number, mb: number, imp: number, eng: number, engPrev: number, data: District["dataStatus"], fu: District["followUp"]): District => ({
  id, name, region, col, row, students: st * 1000, teachers: Math.round((st * 1000) / 17.7), institutions: inst, baselineCoverage: cov, mathsBaseline: mb, mathsFollowUp: mb + imp, engagement: eng, engagementPrev: engPrev,
  improvement: imp, dataStatus: data, followUp: fu, completeness: data === "complete" ? 100 : 78,
});
export const DISTRICTS: District[] = [
  D("highland-plateau", "Highland Plateau", "Hills & Plateau", 0, 0, 520, 3100, 66, 48, 6, 52, 58, "complete", "complete"),
  D("nilgiri-hills", "Nilgiri Hills", "Hills & Plateau", 1, 0, 410, 2600, 63, 44, 3, 49, 55, "partial", "in-progress"),
  D("misty-ridge", "Misty Ridge", "Hills & Plateau", 2, 0, 380, 2300, 71, 52, 7, 61, 60, "partial", "complete"),
  D("northern-uplands", "Northern Uplands", "Heartland", 3, 0, 450, 2900, 74, 55, 8, 64, 62, "complete", "complete"),
  D("western-ghats", "Western Ghats", "Hills & Plateau", 0, 1, 560, 3400, 69, 50, 6, 57, 59, "complete", "complete"),
  D("central-plains", "Central Plains", "Heartland", 1, 1, 690, 4300, 82, 61, 9, 71, 68, "complete", "complete"),
  D("kaveri-delta", "Kaveri Delta", "Delta & River", 2, 1, 640, 3900, 86, 66, 10, 74, 70, "complete", "complete"),
  D("eastern-marches", "Eastern Marches", "Heartland", 3, 1, 480, 3000, 78, 58, 7, 54, 63, "complete", "complete"),
  D("southern-lowlands", "Southern Lowlands", "Delta & River", 0, 2, 520, 3200, 80, 60, 8, 66, 65, "complete", "complete"),
  D("palm-coast", "Palm Coast", "Coastal Belt", 1, 2, 540, 3300, 76, 57, 7, 63, 61, "complete", "complete"),
  D("coastal-karuvana", "Coastal Karuvana", "Coastal Belt", 2, 2, 590, 3500, 88, 67, 11, 76, 72, "complete", "complete"),
  D("port-harbour", "Port Harbour", "Coastal Belt", 3, 2, 420, 2500, 84, 63, 9, 69, 67, "complete", "complete"),
];
export const districtById = (id: string) => DISTRICTS.find((d) => d.id === id);
export const REGIONS: District["region"][] = ["Hills & Plateau", "Coastal Belt", "Heartland", "Delta & River"];

const INST_NAMES = ["Government Model Higher Secondary School", "St. Aloysius Public School", "Sri Vidya Mandir", "Riverside Academy", "Lotus Valley School", "Unity Senior Secondary School"];
function genInstitutions(d: District): GovInstitution[] {
  const out: GovInstitution[] = [];
  const named: GovInstitution[] = [];
  if (d.id === "kaveri-delta") {
    const br = BRANCHES.filter((b) => b.institutionId === "inst-greenfield");
    named.push({ id: "inst-greenfield", districtId: d.id, name: "Greenfield International School", type: "school", students: br.reduce((a, b) => a + b.students, 0), branches: br.map((b) => ({ id: b.id, name: b.name, students: b.students })), baselineCoverage: 96, mathsProficiency: 71, engagement: 78, improvement: 11, dataStatus: "complete", programmes: 2 });
  }
  if (d.id === "nilgiri-hills") {
    const br = BRANCHES.filter((b) => b.institutionId === "inst-meridian");
    named.push({ id: "inst-meridian", districtId: d.id, name: "Meridian University", type: "university", students: br.reduce((a, b) => a + b.students, 0), branches: br.map((b) => ({ id: b.id, name: b.name, students: b.students })), baselineCoverage: 58, mathsProficiency: 52, engagement: 61, improvement: 4, dataStatus: "partial", programmes: 1 });
  }
  out.push(...named);
  const town = d.name.split(" ")[0];
  for (let i = 0; i < 5 - named.length; i++) {
    const key = `${d.id}-${i}`;
    const st = 420 + Math.round(hash(key + "s") * 1400);
    out.push({
      id: `inst-${d.id}-${i + 1}`, districtId: d.id, name: `${town} ${INST_NAMES[(i + d.col) % INST_NAMES.length]}`, type: "school", students: st,
      branches: [{ id: `br-${key}-a`, name: "Main Campus", students: Math.round(st * 0.65) }, { id: `br-${key}-b`, name: "Annexe", students: st - Math.round(st * 0.65) }],
      baselineCoverage: jitter(key + "c", d.baselineCoverage, 10, 20, 99), mathsProficiency: jitter(key + "m", d.mathsBaseline + d.improvement, 9), engagement: jitter(key + "e", d.engagement, 12),
      improvement: jitter(key + "i", d.improvement, 3, 0, 20), dataStatus: hash(key + "d") > 0.85 ? "partial" : "complete", programmes: 1 + Math.floor(hash(key + "p") * 3),
    });
  }
  return out;
}
export const INSTITUTIONS_BY_DISTRICT: Record<string, GovInstitution[]> = Object.fromEntries(DISTRICTS.map((d) => [d.id, genInstitutions(d)]));
export const allInstitutions = () => Object.values(INSTITUTIONS_BY_DISTRICT).flat();

export function classRows(inst: GovInstitution): ClassRow[] {
  const rows: ClassRow[] = [];
  GRADES.forEach((g) => ["A", "B"].forEach((sec) => {
    const k = `${inst.id}-${g.id}-${sec}`;
    rows.push({ id: k, gradeId: g.id, gradeLabel: g.label, name: `${g.label} · ${sec}`, students: 28 + Math.round(hash(k) * 14), baselineCoverage: jitter(k + "c", inst.baselineCoverage, 9, 20, 100), proficiency: jitter(k + "p", inst.mathsProficiency, 10) });
  }));
  return rows;
}
export function gradeRows(base: { baselineCoverage: number; mathsProficiency: number; improvement: number }, seed: string): GradeRow[] {
  return GRADES.map((g) => ({ gradeId: g.id, label: g.label, baselineCoverage: jitter(seed + g.id + "c", base.baselineCoverage, 6, 20, 100), proficiency: jitter(seed + g.id + "p", base.mathsProficiency, 8), improvement: jitter(seed + g.id + "i", base.improvement, 3, 0, 20) }));
}
export function objectiveRows(seed: string, base: number): ObjectiveRow[] {
  return OBJECTIVES.map((o) => {
    const b = jitter(seed + o.id + "b", base - (o.subjectId === "sub-math" ? 8 : 0), 14);
    return { id: o.id, code: o.code, title: o.title, subject: subjectById(o.subjectId).name, baselineMastery: b, mastery: Math.min(99, b + jitter(seed + o.id + "g", 6, 5, 0, 14)) };
  });
}

/* ---------- Resources ---------- */
const langs = ["English", "Hindi", "Karuvani", "English", "Karuvani"];
const types: ResourceType[] = ["video", "mcq", "game", "course", "document", "microlearning"];
const mk = (n: number): ResourceRecord[] => OBJECTIVES.flatMap((o, oi) => types.slice(0, 4).map((t, ti): ResourceRecord => {
  const i = oi * 4 + ti, k = `res-${n}-${i}`;
  return {
    id: `res-${o.id}-${t}`, title: t === "video" ? `${o.title} — explainer video` : t === "mcq" ? `${o.code} practice MCQ set` : t === "game" ? `${o.title}: learning game` : `${o.chapter} — guided course unit`,
    type: t, gradeId: o.gradeId, subjectId: o.subjectId, chapter: o.chapter, objectiveId: hash(k) > 0.93 ? null : o.id, language: langs[i % langs.length],
    approval: hash(k + "a") > 0.9 ? "pending" : hash(k + "r") > 0.97 ? "rejected" : "approved", source: ["Karuvana State Curriculum Board", "SCERT Karuvana (demo)", "Partner educator (state-reviewed)"][i % 3],
    version: `v${1 + (i % 3)}.${i % 4}`, replacedBy: hash(k + "v") > 0.92 ? `${o.code}-v-next` : undefined, views: 2000 + Math.round(hash(k + "w") * 90000), completions: 800 + Math.round(hash(k + "x") * 52000),
  };
}));
export const RESOURCES: ResourceRecord[] = mk(1);

/* ---------- Programmes ---------- */
const bl = (year = AY.label) => ({ enabled: true, mandatory: true, curriculum: CURRICULUM.name, year, windowDays: 14, questionCount: 25 });
const base = (o: Partial<ProgrammeDraft>): ProgrammeDraft => ({
  name: "", phase: "Phase 1", objective: "", grades: [], subjects: [], objectiveIds: [], resourceIds: [], baseline: bl(), districtIds: [], institutionNote: "All institutions in selected districts",
  interventions: [], aiTeacherIds: [], start: "2026-09-01", end: "2027-01-31", participationTarget: 70, improvementTarget: 8, budget: 0, ...o,
});
const allD = DISTRICTS.map((d) => d.id);
const mathObj = OBJECTIVES.filter((o) => o.subjectId === "sub-math").map((o) => o.id);
const mathRes = RESOURCES.filter((r) => r.subjectId === "sub-math").slice(0, 8).map((r) => r.id);
export const PROGRAMME_SEED: ProgrammeRecord[] = [
  {
    ...base({
      name: "Mission Maths Mastery", phase: "Phase 1", objective: "Raise Grade 6–8 mathematics proficiency by 8 points across Karuvana State through diagnosed, curriculum-mapped remedial support.",
      grades: ["g6", "g7", "g8"], subjects: ["sub-math"], objectiveIds: mathObj, resourceIds: mathRes, districtIds: allD, budget: 24_000_000, aiTeacherIds: ["ait-euler"], participationTarget: 70, improvementTarget: 8,
      interventions: [
        { id: "iv-1", title: "Fractions remedial course (Karuvana Maths Grade 8)", kind: "remedial-course", status: "running", audience: "Students below 40% on M8.3.x" },
        { id: "iv-2", title: "Weekly practice sets with instant feedback", kind: "practice-set", status: "running", audience: "All Grade 6–8 students" },
        { id: "iv-3", title: "Euler AI Teacher doubt support (state-approved)", kind: "ai-teacher-support", status: "running", audience: "Opted-in classes" },
        { id: "iv-4", title: "Teacher workshop: diagnosing fraction misconceptions", kind: "teacher-workshop", status: "delayed", audience: "Nilgiri Hills and Misty Ridge teachers" },
      ],
    }),
    id: "prg-mission-maths", status: "active", createdBy: "Dr. Anjali Varma (State Academic Council)", createdAt: ago(60 * 24 * 90), updatedAt: ago(60 * 5), origin: "official", statewide: true, step: 10,
    submittedAt: ago(60 * 24 * 80), approvedBy: "Secretary, School Education (demo)", approverNotes: "Approved for Phase 1 with weekly review. Nilgiri Hills to receive extra support.",
    delivery: { distributedPct: 91, participationPct: 64, completionPct: 47, baselineAvg: 56, followUpAvg: 63, budgetUsed: 14_300_000 },
    risks: [{ id: "r1", level: "high", text: "Nilgiri Hills baseline coverage is below 45%, so improvement there cannot be measured reliably yet." }, { id: "r2", level: "medium", text: "Teacher workshop in two districts is 3 weeks behind schedule." }, { id: "r3", level: "low", text: "Hindi-medium resources for 4 chapters still pending state approval." }],
    history: [{ at: ago(60 * 24 * 90), text: "Draft created" }, { at: ago(60 * 24 * 80), text: "Submitted for approval" }, { at: ago(60 * 24 * 78), text: "Approved by Secretary, School Education (demo)" }, { at: ago(60 * 24 * 70), text: "Launched statewide: Phase 1" }],
  },
  {
    ...base({
      name: "Mission Maths Mastery: Phase 2", phase: "Phase 2", objective: "Extend Mission Maths Mastery to Grades 9–10 and add targeted remediation for districts below 50% baseline proficiency.",
      grades: ["g9", "g10"], subjects: ["sub-math"], objectiveIds: ["lo-alg-lin", "lo-ratio"], resourceIds: mathRes.slice(0, 4), districtIds: ["nilgiri-hills", "highland-plateau", "western-ghats", "misty-ridge"], budget: 9_500_000, start: "2027-02-01", end: "2027-06-30", improvementTarget: 10,
      interventions: [{ id: "iv-5", title: "Linear equations bridge course", kind: "remedial-course", status: "planned", audience: "Grade 9 students below 45%" }, { id: "iv-6", title: "Peer learning groups in low-coverage districts", kind: "peer-group", status: "planned", audience: "Nilgiri Hills pilot institutions" }],
    }),
    id: "prg-maths-p2", status: "awaiting-approval", createdBy: "Dr. Anjali Varma (State Academic Council)", createdAt: ago(60 * 24 * 6), updatedAt: ago(60 * 24 * 2), origin: "ai-proposal", statewide: false, step: 9, submittedAt: ago(60 * 24 * 2),
    delivery: { distributedPct: 0, participationPct: 0, completionPct: 0, baselineAvg: 0, followUpAvg: null, budgetUsed: 0 },
    risks: [{ id: "r4", level: "medium", text: "Depends on Phase 1 follow-up 2 results due in January." }],
    history: [{ at: ago(60 * 24 * 6), text: "Draft proposed by Government AI (reviewed and edited by official)" }, { at: ago(60 * 24 * 2), text: "Submitted for approval" }],
  },
  {
    ...base({
      name: "Science Literacy Drive 2025–26", phase: "Completed", objective: "Improve ecosystem and cell-structure understanding in Grades 7–8.", grades: ["g7", "g8"], subjects: ["sub-sci"], objectiveIds: ["lo-eco-chain", "lo-eco-bal", "lo-cell"],
      resourceIds: RESOURCES.filter((r) => r.subjectId === "sub-sci").slice(0, 6).map((r) => r.id), districtIds: allD, budget: 11_000_000, start: "2025-07-01", end: "2026-03-31", participationTarget: 60, improvementTarget: 6, baseline: bl("2025–26"),
      interventions: [{ id: "iv-7", title: "Virtual lab micro-lessons", kind: "practice-set", status: "done", audience: "Grades 7–8" }, { id: "iv-8", title: "Newton AI Teacher support", kind: "ai-teacher-support", status: "done", audience: "Opted-in institutions" }],
    }),
    id: "prg-science-lit", status: "completed", createdBy: "State Academic Council", createdAt: ago(60 * 24 * 500), updatedAt: ago(60 * 24 * 230), origin: "official", statewide: true, step: 10, approvedBy: "Secretary, School Education (demo)", approverNotes: "Approved 2025.",
    delivery: { distributedPct: 100, participationPct: 78, completionPct: 71, baselineAvg: 49, followUpAvg: 57, budgetUsed: 10_400_000 },
    risks: [], history: [{ at: ago(60 * 24 * 500), text: "Draft created" }, { at: ago(60 * 24 * 480), text: "Approved" }, { at: ago(60 * 24 * 230), text: "Completed; outcomes archived" }],
  },
];

export const DISTRIBUTION_SEED: DistributionRecord[] = [
  { id: "dist-1", at: ago(60 * 24 * 12), by: "State Content Cell", resources: 8, resourceTitles: ["Add and subtract unlike fractions: explainer video", "M8.3.1 practice MCQ set"], districtIds: allD, districtLabel: "All 12 districts", gradeIds: ["g6", "g7", "g8"], students: 3_600_000, status: "delivered", note: "Mission Maths Mastery Phase 1 launch pack", decidedBy: "Secretary, School Education (demo)" },
  { id: "dist-2", at: ago(60 * 24 * 3), by: "State Content Cell", resources: 5, resourceTitles: ["Solve linear equations: learning game"], districtIds: ["nilgiri-hills", "highland-plateau"], districtLabel: "Nilgiri Hills, Highland Plateau", gradeIds: ["g8"], students: 93_000, status: "scheduled", note: "Remedial refresh for low-coverage districts" },
  { id: "dist-3", at: ago(60 * 20), by: "State Content Cell", resources: 12, resourceTitles: ["Science Grade 8 Hindi-medium pack"], districtIds: allD, districtLabel: "All 12 districts", gradeIds: ["g8"], students: 1_240_000, status: "awaiting-approval", note: "Statewide distribution needs explicit approval" },
];

export const ASSESSMENT_SEED: AssessmentConfig[] = [
  { id: "asm-base-math8", name: "Grade 8 Mathematics: initial baseline", layer: "baseline", gradeId: "g8", subjectId: "sub-math", curriculum: CURRICULUM.name, year: AY.label, objectiveIds: mathObj, mandatory: true, state: "in-progress", followUp: "pending", coverage: 82, completion: 74, proficiency: 56, mastery: 51, locked: true, createdAt: ago(60 * 24 * 95), createdBy: "State Assessment Cell" },
  { id: "asm-base-math7", name: "Grade 7 Mathematics: initial baseline", layer: "baseline", gradeId: "g7", subjectId: "sub-math", curriculum: CURRICULUM.name, year: AY.label, objectiveIds: ["lo-frac-add", "lo-ratio"], mandatory: true, state: "complete", followUp: "complete", coverage: 91, completion: 88, proficiency: 58, mastery: 54, locked: true, createdAt: ago(60 * 24 * 95), createdBy: "State Assessment Cell" },
  { id: "asm-base-sci8", name: "Grade 8 Science: initial baseline", layer: "baseline", gradeId: "g8", subjectId: "sub-sci", curriculum: CURRICULUM.name, year: AY.label, objectiveIds: ["lo-eco-chain", "lo-eco-bal", "lo-cell"], mandatory: true, state: "in-progress", followUp: "pending", coverage: 68, completion: 61, proficiency: 53, mastery: 49, locked: true, createdAt: ago(60 * 24 * 60), createdBy: "State Assessment Cell" },
  { id: "asm-cont-math", name: "Continuous: course MCQs, games and microlearning (Mathematics)", layer: "continuous", gradeId: "g8", subjectId: "sub-math", curriculum: CURRICULUM.name, year: AY.label, objectiveIds: mathObj, mandatory: false, state: "in-progress", followUp: "n/a", coverage: 79, completion: 66, proficiency: 60, mastery: 57, locked: false, createdAt: ago(60 * 24 * 70), createdBy: "State Assessment Cell" },
  { id: "asm-prog-math", name: "Periodic progress assessment 1 vs original baseline (Mathematics)", layer: "progress", gradeId: "g8", subjectId: "sub-math", curriculum: CURRICULUM.name, year: AY.label, objectiveIds: mathObj, mandatory: false, state: "in-progress", followUp: "pending", coverage: 59, completion: 52, proficiency: 63, mastery: 59, locked: false, createdAt: ago(60 * 24 * 14), createdBy: "State Assessment Cell" },
];

export const AUDIT_SEED: AuditEntry[] = [
  { id: "aud-1", at: ago(60 * 3), actor: "Dr. Anjali Varma", role: "State Academic Council", action: "Submitted programme for approval", entity: "Mission Maths Mastery: Phase 2", entityType: "programme", detail: "Phase 2 covers 4 districts, Grades 9–10; budget INR 95 lakh (demo).", outcome: "success" },
  { id: "aud-2", at: ago(60 * 26), actor: "State Content Cell", role: "Content Officer", action: "Created statewide distribution (pending approval)", entity: "Science Grade 8 Hindi-medium pack", entityType: "distribution", detail: "12 resources to 12 districts. Statewide scope requires explicit approval.", outcome: "success" },
  { id: "aud-3", at: ago(60 * 50), actor: "State official (demo)", role: "District Officer, Nilgiri Hills", action: "Student-level drill-down blocked", entity: "Nilgiri Hills / Meridian University", entityType: "access", detail: "No institutional access grant for student-level records. Aggregate view only.", outcome: "blocked" },
  { id: "aud-4", at: ago(60 * 24 * 4), actor: "Secretary, School Education (demo)", role: "Approver", action: "Approved AI Teacher: Euler v2.1", entity: "Euler", entityType: "ai-teacher", detail: "Approved for Grades 6–8 Mathematics. State-owned persona.", outcome: "success" },
  { id: "aud-5", at: ago(60 * 24 * 12), actor: "Secretary, School Education (demo)", role: "Approver", action: "Approved statewide distribution", entity: "Mission Maths Mastery Phase 1 launch pack", entityType: "distribution", detail: "8 resources delivered to 12 districts.", outcome: "success" },
  { id: "aud-6", at: ago(60 * 24 * 30), actor: "State Policy Cell", role: "Policy Officer", action: "Updated AI provider policy", entity: "Approved providers list", entityType: "policy", detail: "Added Gemini (demo key label) to the approved list; budget cap unchanged.", outcome: "success" },
];

export const STATE_AGENT_SEED: StateAgent[] = [
  { id: "sag-gap", name: "Weekly Learning-Gap Digest", purpose: "Summarises district-level mathematics gaps every Monday and suggests focus districts. Suggestions only.", autonomy: "suggest", status: "published", scope: "Aggregate data, all districts", lastRun: ago(60 * 40), runs: 18, approvalNote: "Read-only. Needs no approval per action." },
  { id: "sag-nudge", name: "Baseline Coverage Reminder", purpose: "Drafts reminders to institutions below 60% baseline coverage. Officials review before anything is sent.", autonomy: "assist", status: "published", scope: "Institutions below 60% coverage", lastRun: ago(60 * 20), runs: 9, approvalNote: "Every send is approved by a district officer." },
  { id: "sag-auto", name: "Auto-assign Remedial Courses", purpose: "Would assign remedial courses to students from baseline gaps without per-action review.", autonomy: "autonomous", status: "awaiting-approval", scope: "Student-level, statewide", lastRun: ago(0), runs: 0, approvalNote: "Autonomous statewide actions require explicit human approval before publishing." },
];
export { inDays };
